// src/http-server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { app as electronApp } from 'electron'; // alias to avoid clash
import { MachineRawModel } from './database/models/MachineRaw';
import { MachineData, MachineModel } from './database/models/Machine';
import {
    LongtimeStorageData,
    LongtimeStorageModel,
} from './database/models/LongtimeStorage';

// ---- Config (env overridable) ----
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const HOST = process.env.HOST || '0.0.0.0';
const API_VERSION = '1.0.0';
const ESP32_VERSION = '1.0.11';

const app = express();
app.use(
    cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
);
app.use(
    cors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
    })
);

app.use(express.json());

// Where the files live:
const DATA_DIR = electronApp.isPackaged
    ? path.join(process.resourcesPath, 'data') // packaged: .../Contents/Resources/data
    : path.join(process.cwd(), 'data'); // dev: project-root/data

// Serve them at /data/...
app.use('/data', express.static(DATA_DIR, { maxAge: '1h', etag: true }));

// Debug middleware (comment out if noisy)
app.use((req: Request, _res: Response, next) => {
    console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Client IP:', req.ip || (req.connection as any)?.remoteAddress);
    console.log('---');
    next();
});

// ---------- Daily reset job (every 24 hours) ----------

// setInterval(async () => {
//     console.log('[Daily Reset Job] Running daily reset for all machines');
//     const machines = await MachineModel.getAll();
//     for (const machine of machines) {
//         await MachineModel.update(machine.id, {
//             skott_idag: 0,
//             uptime: 0,
//             downtime: 0,
//         });
//     }
//     console.log('[Daily Reset Job] Reset daily counters for all machines');
// }, 24 * 60 * 60 * 1000); // every 24 hours

// ---------- Routes ----------
interface storageData {
    machine_id: number;
    num_skott: number;
    num_meter: number;
    fabric_id: number | null;
    uptime: number;
    downtime: number;
}

const saveToLongtimeStorage = async ({
    storageData,
    timestamp,
}: {
    storageData: storageData;
    timestamp: string;
}) => {
    // At the start of your function:
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    const time = date.toISOString();
    // round down to the hour

    if (time == '1970-01-01T01:00:00.000Z') {
        return;
    }

    // Assume: storageData contains { machine_id, num_skott, num_meter, fabric_id, driftstatus }
    // and hour is a string like "2025-08-12T20:00:00.000Z"

    const existing = await LongtimeStorageModel.getByMachineAndHour(
        storageData.machine_id,
        time
    );

    if (existing && existing.fabric_id === storageData.fabric_id) {
        // Same fabric_id: add values to existing entry
        await LongtimeStorageModel.createOrUpdate({
            machine_id: storageData.machine_id,
            hour: time,
            total_skott: existing.total_skott + storageData.num_skott,
            total_meter: existing.total_meter + storageData.num_meter,
            uptime: existing.uptime + storageData.uptime,
            downtime: existing.downtime + storageData.downtime,
            fabric_id: storageData.fabric_id,
        });
    } else {
        // No entry or different fabric_id: create new entry
        await LongtimeStorageModel.createOrUpdate({
            machine_id: storageData.machine_id,
            hour: time,
            total_skott: storageData.num_skott,
            total_meter: storageData.num_meter,
            uptime: storageData.uptime,
            downtime: storageData.downtime,
            fabric_id: storageData.fabric_id,
        });
    }
};

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'Weaving Interface API running',
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/version', (_req, res) => {
    res.json({ api: API_VERSION, esp32: ESP32_VERSION });
});

app.post('/api/machine-data', async (req: Request, res: Response) => {
    try {
        const { machine_id, timestamp, event_type, value, meta } = req.body;
        await MachineRawModel.create({
            machine_id,
            timestamp,
            event_type,
            value,
            meta,
        });

        const machine = await MachineModel.getById(machine_id);
        if (!machine)
            return res.status(404).json({ error: 'Machine not found' });

        const lastActiveDate = new Date(machine.last_active as any)
            .toISOString()
            .slice(0, 10);
        const currentDate = new Date(timestamp).toISOString().slice(0, 10);

        // console.log(lastActiveDate, currentDate);

        // Reset daily counters on date change
        if (lastActiveDate !== currentDate) {
            console.log('Reset');
            machine.skott_idag = 0;
            machine.meter_idag = 0;
            machine.uptime = 0;
            machine.downtime = 0;
        }

        // Calculate increments & status
        const increment = typeof value === 'number' ? value : 0;

        let skottPerMeter = Infinity;
        if (machine.fabric_id) {
            const { FabricModel } = await import('./database/models/Fabric');
            const fabric = await FabricModel.getByArticleNumber(
                machine.fabric_id
            );
            if (fabric?.skott_per_meter) skottPerMeter = fabric.skott_per_meter;
        }
        const meterIncrement =
            skottPerMeter > 0 ? increment / skottPerMeter : 0;

        let newStatus = machine.status;
        let newDowntime = machine.downtime ?? 0;
        let newUptime = machine.uptime ?? 0;
        let isUptime = false;

        if (
            skottPerMeter !== Infinity &&
            (machine.skott_fabric ?? 0) + increment >= skottPerMeter * 25
        ) {
            newStatus = 3; // Done
        } else if (increment > 0) {
            newStatus = 1;
            newUptime = (machine.uptime ?? 0) + 1;
            isUptime = true;
        } else {
            const currentTime = new Date(timestamp);
            const fiveMinutesAgo = new Date(
                currentTime.getTime() - 6 * 60 * 1000
            ).toISOString();
            const recent = await MachineRawModel.getByDateRange(
                machine_id,
                fiveMinutesAgo,
                timestamp
            );
            const allZeros =
                recent.length > 0 && recent.every((r) => r.value === 0);
            const lastZero = recent[recent.length - 1]?.value === 0;

            if (allZeros) {
                newStatus = 2; // Offline
            } else if (lastZero) {
                newStatus = 0; // Active
                newDowntime = (machine.downtime ?? 0) + 1;
                isUptime = false;
            } else {
                newStatus = 1; // Inactive but not offline
                newDowntime = (machine.downtime ?? 0) + 1;
                isUptime = false;
            }
        }

        const storageData = {
            machine_id: machine.id,
            num_skott: increment,
            num_meter: Number(meterIncrement.toFixed(2)),
            fabric_id: machine.fabric_id ?? null,
            uptime: isUptime ? 1 : 0,
            downtime: isUptime ? 0 : 1,
        };
        // console.log(timestamp);
        saveToLongtimeStorage({ storageData, timestamp });

        const newMeterIdag = Number(
            ((machine.meter_idag ?? 0) + meterIncrement).toFixed(2)
        );
        await MachineModel.update(machine_id, {
            status: newStatus,
            skott_idag: (machine.skott_idag ?? 0) + increment,
            meter_idag: newMeterIdag,
            skott_fabric: (machine.skott_fabric ?? 0) + increment,
            last_active: timestamp,
            uptime: newUptime,
            downtime: newDowntime,
        });

        const updated = await MachineModel.getById(machine_id);
        broadcastMachineUpdate(updated);

        res.json({ success: true, message: 'Data received and stored' });
    } catch (error: any) {
        console.error('Error processing ESP32 data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/register-device', async (req: Request, res: Response) => {
    try {
        const { firmware_version, device_type, capabilities } = req.body;
        console.log('Registration payload:', {
            firmware_version,
            device_type,
            capabilities,
        });

        const machines = await MachineModel.getAll();
        const maxId = machines.length
            ? Math.max(...machines.map((m) => m.id || 0))
            : 0;
        const newDeviceId = maxId + 1;
        const deviceName = `Weaving-Machine-${newDeviceId}`;

        const clientIp =
            req.ip || (req.connection as any)?.remoteAddress || 'unknown';

        const createdId = await MachineModel.create({
            name: deviceName,
            ip: clientIp,
            status: 0,
            skott_idag: 0,
            skott_fabric: 0,
            uptime: 0,
            downtime: 0,
            fabric_id: null,
            meter_idag: 0,
            last_active: new Date().toISOString(),
        });

        const response = {
            success: true,
            message: 'Device registered successfully',
            device_id: newDeviceId,
            device_name: deviceName,
            assigned_ip: clientIp,
            created_id: createdId,
        };

        res.json(response);
    } catch (error: any) {
        console.error('❌ ERROR during device registration:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/devices', async (_req, res) => {
    try {
        const machines = await MachineModel.getAll();
        res.json({
            success: true,
            devices: machines.map((m) => ({
                device_id: m.id,
                device_name: m.name,
                ip: m.ip,
                status: m.status,
                last_active: m.last_active,
            })),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/machines', async (_req, res) => {
    try {
        const machines = await MachineModel.getAll();
        res.json(machines);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Update machine name
app.put('/api/machines/:device_id/name', async (req, res) => {
    try {
        const deviceId = Number(req.params.device_id);
        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Invalid name' });
        }
        const machine = await MachineModel.getById(deviceId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        await MachineModel.update(deviceId, { name: name.trim() });
        const updated = await MachineModel.getById(deviceId);
        broadcastMachineUpdate(updated);
        res.json({ success: true, machine: updated });
    } catch (err: any) {
        console.error('PUT /api/machines/:device_id/name failed', err);
        res.status(500).json({ error: err?.message || 'internal_error' });
    }
});

app.get('/api/check-update/:device_id', async (req, res) => {
    const deviceId = req.params.device_id;
    const currentVersion = String(req.query.current_version || '');

    if (!currentVersion) {
        return res
            .status(400)
            .json({ error: 'Missing current_version query parameter' });
    }

    const downloadUrl = `https://github.com/Dahlqvistad/Weaving-computer/releases/download/v${ESP32_VERSION}/firmware-${ESP32_VERSION}.bin`;

    if (currentVersion !== ESP32_VERSION) {
        await MachineRawModel.create({
            machine_id: parseInt(deviceId, 10),
            timestamp: new Date().toISOString(),
            event_type: 'Firmware update',
            value: 1,
            meta: `Update check: ${currentVersion} -> ${ESP32_VERSION}`,
        });
        return res.json({
            update_available: true,
            latest_version: ESP32_VERSION,
            download_url: downloadUrl,
            changelog: '20-second data intervals and improved OTA',
        });
    }

    res.json({
        update_available: false,
        latest_version: ESP32_VERSION,
        current_version: currentVersion,
    });
});

app.put('/api/machines/:device_id/fabric', async (req, res) => {
    try {
        const deviceId = Number(req.params.device_id);
        const raw = req.body?.article_number;

        console.log('Change fabric request for deviceId:', deviceId);
        // console.log('All machines:', await MachineModel.getAll());

        // Validate
        const articleNumber = Number(raw);
        if (!Number.isFinite(articleNumber)) {
            return res.status(400).json({ error: 'Invalid article_number' });
        }

        const machine = await MachineModel.getById(deviceId);
        if (!machine)
            return res.status(404).json({ error: 'Machine not found' });

        // Optional: verify fabric exists (uncomment if you want)
        // const { FabricModel } = await import('./database/models/Fabric');
        // const fabric = await FabricModel.getByArticleNumber(articleNumber);
        // if (!fabric) return res.status(404).json({ error: 'Fabric not found' });

        // Update only the needed fields
        await MachineModel.update(deviceId, {
            fabric_id: articleNumber,
            skott_fabric: 0, // reset fabric counter
        });

        const updated = await MachineModel.getById(deviceId);
        broadcastMachineUpdate(updated);

        res.json({ success: true, machine: updated });
    } catch (err: any) {
        console.error('PUT /api/machines/:device_id/fabric failed', err);
        res.status(500).json({ error: err?.message || 'internal_error' });
    }
});

app.get('/api/demo', async (req, res) => {
    const filters = req.query;
    const now = new Date();
    now.setMinutes(0, 0, 0); // round down to the hour

    // Format as ISO string in Stockholm timezone
    const hour = now
        .toLocaleString('sv-SE', {
            timeZone: 'Europe/Stockholm',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
        .replace(' ', 'T')
        .replace(/\./g, '-'); // crude ISO-like format

    console.log(hour);

    // Fetch all rows for verification
    const allRows = await LongtimeStorageModel.getFiltered(filters);
    console.log(allRows);

    res.json({
        message: 'Demo endpoint - test row inserted',
        allRows,
    });
});

// Example Express endpoint
app.get('/api/longtime-storage', async (req, res) => {
    const fabric_id = req.query.fabric_id
        ? Number(req.query.fabric_id)
        : undefined;
    const machine_id = req.query.machine_id
        ? Number(req.query.machine_id)
        : undefined;
    const start =
        typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;
    const sort =
        typeof req.query.sort === 'string' ? req.query.sort : undefined;

    let query = 'SELECT * FROM longtime_storage WHERE 1=1';
    const params: any[] = [];

    if (fabric_id) {
        query += ' AND fabric_id = ?';
        params.push(fabric_id);
    }
    if (machine_id) {
        query += ' AND machine_id = ?';
        params.push(machine_id);
    }
    if (start) {
        query += ' AND time >= ?';
        params.push(start);
    }
    if (end) {
        query += ' AND time <= ?';
        params.push(end);
    }
    if (sort) {
        query += ` ORDER BY ${sort}`;
    } else {
        query += ' ORDER BY time DESC';
    }

    const rows = await LongtimeStorageModel.getFiltered({
        fabric_id,
        machine_id,
        start,
        end,
        sort,
    });
    res.json(rows);
});

// ---------- WebSocket (single instance attached to HTTP server) ----------

let wss: WebSocketServer | null = null;
let wsStandalone: WebSocketServer | null = null;

function broadcastMachineUpdate(payload: any) {
    const msg = JSON.stringify({ type: 'machine_update', data: payload });
    if (wss) {
        wss.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) c.send(msg);
        });
    }
    if (wsStandalone) {
        wsStandalone.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) c.send(msg);
        });
    }
}
function broadcastFabricUpdate(payload: any) {
    const msg = JSON.stringify({ type: 'fabric_update', data: payload });
    if (wss) {
        wss.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) c.send(msg);
        });
    }
    if (wsStandalone) {
        wsStandalone.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) c.send(msg);
        });
    }
}

// ---------- Start for main.ts ----------

export async function startHttpServer(): Promise<{
    server: http.Server;
    wss: WebSocketServer;
    wsStandalone?: WebSocketServer;
}> {
    const server = http.createServer(app);
    wss = new WebSocketServer({ server });

    // Standalone WebSocket server for frontend updates
    wsStandalone = new WebSocketServer({ host: '127.0.0.1', port: 8081 });

    await new Promise<void>((resolve, reject) => {
        server.once('error', (err) => {
            console.error('HTTP server error on listen:', err);
            reject(err);
        });
        server.listen(PORT, HOST, () => resolve());
    });

    // Log reachable URLs (LAN IPs)
    const nets = os.networkInterfaces();
    const addrs: string[] = [];
    Object.values(nets).forEach((ni) =>
        ni?.forEach((addr) => {
            if (addr.family === 'IPv4' && !addr.internal)
                addrs.push(addr.address);
        })
    );

    console.log(`🌐 HTTP server listening:`);
    console.log(`   http://${HOST}:${PORT}/api/health`);
    addrs.forEach((ip) => console.log(`   http://${ip}:${PORT}/api/health`));

    // Log WebSocket URLs
    console.log(`🔌 WebSocket attached at ws://${HOST}:${PORT}`);
    console.log(`🔌 Standalone WebSocket at ws://127.0.0.1:8081`);

    // Optional: wss connection logs
    wss.on('connection', async (ws) => {
        // Broadcast fabric update (full list)
        const { FabricModel } = await import('./database/models/Fabric');
        const allFabrics = await FabricModel.getAll();
        broadcastFabricUpdate(allFabrics);
        console.log('Frontend connected to WebSocket');
        ws.on('close', () =>
            console.log('Frontend disconnected from WebSocket')
        );
    });
    wsStandalone.on('connection', (ws) => {
        console.log('Frontend connected to standalone WebSocket');
        ws.on('close', () =>
            console.log('Frontend disconnected from standalone WebSocket')
        );
    });

    // Broadcast updates to both WebSocket servers
    const oldBroadcast = broadcastMachineUpdate;
    globalThis.broadcastMachineUpdate = function (payload: any) {
        oldBroadcast(payload);
        if (wsStandalone) {
            const msg = JSON.stringify({
                type: 'machine_update',
                data: payload,
            });
            wsStandalone.clients.forEach((c) => {
                if (c.readyState === WebSocket.OPEN) c.send(msg);
            });
        }
    };

    return { server, wss, wsStandalone };
}

// Optional export for tests
export { app };
