// src/http-server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { app as electronApp } from 'electron'; // alias to avoid clash
import { MachineRawModel } from './database/models/MachineRaw';
import { MachineModel } from './database/models/Machine';
import { LongtimeStorageModel } from './database/models/LongtimeStorage';

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

// ...existing code...

// Scheduled job: aggregate raw data and store hourly summary in longtime_storage
setInterval(async () => {
    const now = new Date();
    now.setMinutes(0, 0, 0); // round down to the hour
    const hourEnd = now.toISOString();
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // Aggregate for each machine
    const machines = await MachineModel.getAll();
    for (const machine of machines) {
        // Get raw data for this hour
        const rawData = await MachineRawModel.getByDateRange(
            machine.id,
            hourStart,
            hourEnd
        );
        const total_skott = rawData.reduce((sum, r) => sum + (r.value || 0), 0);
        const total_meter = rawData.reduce((sum, r) => {
            let meterValue = 0;
            if (r.meta) {
                try {
                    const metaObj =
                        typeof r.meta === 'string'
                            ? JSON.parse(r.meta)
                            : r.meta;
                    meterValue = metaObj.meter || 0;
                } catch {
                    meterValue = 0;
                }
            }
            return sum + meterValue;
        }, 0);
        const uptime = rawData.filter((r) => r.event_type === 'up').length;
        const downtime = rawData.filter((r) => r.event_type === 'down').length;

        // Store or update summary in longtime_storage
        await LongtimeStorageModel.createOrUpdate({
            machine_id: machine.id,
            hour: hourStart,
            total_skott,
            total_meter,
            uptime,
            downtime,
        });
    }

    // Delete raw data for this hour
    await MachineRawModel.deleteByDateRange(hourStart, hourEnd);

    console.log(
        `[LongtimeStorage Job] Hourly summary stored and raw data deleted for ${hourStart}`
    );
}, 60 * 60 * 1000); // every hour

setInterval(async () => {
    const machines = await MachineModel.getAll();
    for (const machine of machines) {
        await MachineModel.update(machine.id, {
            skott_idag: 0,
            uptime: 0,
            downtime: 0,
        });
    }
    console.log('[Daily Reset Job] Reset daily counters for all machines');
}, 24 * 60 * 60 * 1000); // every 24 hours

// ---------- Routes ----------

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

        // const lastActiveDate = new Date(machine.last_active as any)
        //     .toISOString()
        //     .slice(0, 10);
        // const currentDate = new Date(timestamp).toISOString().slice(0, 10);

        // // Reset daily counters on date change
        // if (lastActiveDate !== currentDate) {
        //     await MachineModel.update(machine_id, {
        //         skott_idag: 0,
        //         uptime: 0,
        //         downtime: 0,
        //     });
        // }

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

        if (
            skottPerMeter !== Infinity &&
            (machine.skott_fabric ?? 0) + increment >= skottPerMeter * 25
        ) {
            newStatus = 3; // Done
        } else if (increment > 0) {
            newStatus = 1;
            newUptime = (machine.uptime ?? 0) + 1;
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
            } else {
                newStatus = 1; // Inactive but not offline
                newDowntime = (machine.downtime ?? 0) + 1;
            }
        }

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
