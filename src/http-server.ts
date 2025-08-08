import express, { Request, Response } from 'express';
import cors from 'cors';
import { MachineRawModel } from './database/models/MachineRaw';
import { MachineModel } from './database/models/Machine';

const app = express();
const port = 8080;
const host = '192.168.88.118';
const api_version = '1.0.0'; // Current API version
const esp32_version = '1.0.11'; // Latest ESP32 firmware version

app.use(cors());
app.use(express.json());
// Debug middleware to log all requests
app.use((req: Request, res: Response, next) => {
    console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    console.log('Client IP:', req.ip || req.connection.remoteAddress);
    console.log('---');
    next();
});

function analyzeMachineData(data: any) {
    // Placeholder for future data analysis logic
    console.log('Analyzing machine data:', data);
    const machine_id = data.machine_id;

    if (data.event_type === 'skott') {
    }
}

// Endpoint to receive data from ESP32 devices
app.post('/api/machine-data', async (req: Request, res: Response) => {
    try {
        const { machine_id, timestamp, event_type, value, meta } = req.body;

        console.log(`Received data from ESP32-${machine_id}:`, req.body);

        // Store raw data
        await MachineRawModel.create({
            machine_id,
            timestamp: timestamp,
            event_type: event_type,
            value: value,
            meta,
        });

        // Update machine status and daily meter count
        const machine = await MachineModel.getById(machine_id);
        if (machine) {
            await MachineModel.update(machine_id, {
                status: event_type === 'production' ? 1 : 0,
                meter_idag:
                    machine.meter_idag + (value !== undefined ? value : 0),
                last_active: timestamp,
            });
        }

        res.json({ success: true, message: 'Data received and stored' });
    } catch (error: any) {
        console.error('Error processing ESP32 data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Device registration endpoint for ESP32 devices
app.post('/api/register-device', async (req: Request, res: Response) => {
    console.log('=== DEVICE REGISTRATION REQUEST RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Client IP:', req.ip);
    console.log('Remote Address:', req.connection.remoteAddress);
    console.log('Raw body type:', typeof req.body);
    console.log('Raw body content:', JSON.stringify(req.body, null, 2));

    try {
        const { firmware_version, device_type, capabilities } = req.body;

        console.log('Extracted values:');
        console.log('- firmware_version:', firmware_version);
        console.log('- device_type:', device_type);
        console.log('- capabilities:', capabilities);

        // Find the next available machine ID
        console.log('Fetching existing machines from database...');
        const machines = await MachineModel.getAll();
        console.log('Existing machines count:', machines.length);
        console.log(
            'Existing machines:',
            machines.map((m) => ({ id: m.id, name: m.name }))
        );

        const maxId =
            machines.length > 0
                ? Math.max(...machines.map((m) => m.id || 0))
                : 0;
        const newDeviceId = maxId + 1;
        const deviceName = `Weaving-Machine-${newDeviceId}`;

        console.log('Calculated new device ID:', newDeviceId);
        console.log('Generated device name:', deviceName);

        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        console.log('Client IP to store:', clientIp);

        // Create a new machine entry in the database
        console.log('Creating new machine entry in database...');
        const machineData = {
            name: deviceName,
            ip: clientIp,
            status: 0, // Initially inactive
            meter_idag: 0,
            meter_fabric: 0,
            uptime: 0,
            downtime: 0,
            fabric_id: null as number | null,
        };
        console.log('Machine data to create:', machineData);

        const createdId = await MachineModel.create(machineData);
        console.log('Machine created with ID:', createdId);

        console.log(
            `✅ Successfully registered device: ID=${newDeviceId}, Name=${deviceName}`
        );

        const response = {
            success: true,
            message: 'Device registered successfully',
            device_id: newDeviceId,
            device_name: deviceName,
            assigned_ip: clientIp,
        };

        console.log('Sending response:', response);
        res.json(response);
        console.log('=== REGISTRATION COMPLETED SUCCESSFULLY ===');
    } catch (error: any) {
        console.error('❌ ERROR during device registration:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
        console.error('Error type:', typeof error);

        const errorResponse = {
            success: false,
            error: 'Failed to register device',
            message: error.message,
            stack: error.stack,
        };

        console.log('Sending error response:', errorResponse);
        res.status(500).json(errorResponse);
        console.log('=== REGISTRATION FAILED ===');
    }
});
// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        status: 'Weaving Interface API running',
        timestamp: new Date().toISOString(),
    });
});

// Get all registered devices
app.get('/api/devices', async (req: Request, res: Response) => {
    try {
        const machines = await MachineModel.getAll();
        res.json({
            success: true,
            devices: machines.map((machine) => ({
                device_id: machine.id,
                device_name: machine.name,
                ip: machine.ip,
                status: machine.status,
                last_active: machine.last_active,
            })),
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// Get current machine status (for ESP32 to check)
app.get('/api/machines', async (req: Request, res: Response) => {
    try {
        const machines = await MachineModel.getAll();
        res.json(machines);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/check-update/:device_id', (req, res) => {
    const deviceId = req.params.device_id;
    const currentVersion = req.query.current_version;

    if (!currentVersion) {
        return res.status(400).json({
            error: 'Missing current_version query parameter',
        });
    }

    console.log(`=== UPDATE CHECK REQUEST ===`);
    console.log(`Device ID: ${deviceId}`);
    console.log(`Current version: ${currentVersion}`);

    // Define latest firmware version
    const downloadUrl = `https://github.com/Dahlqvistad/Weaving-computer/releases/download/v${esp32_version}/firmware-${esp32_version}.bin`;

    if (currentVersion !== esp32_version) {
        console.log(
            `✅ Update available: ${currentVersion} -> ${esp32_version}`
        );
        res.json({
            update_available: true,
            latest_version: esp32_version,
            download_url: downloadUrl,
            changelog: '20-second data intervals and improved OTA',
        });

        MachineRawModel.create({
            machine_id: parseInt(deviceId),
            timestamp: new Date().toISOString(),
            event_type: 'Firmware update',
            value: 1,
            meta: `Update check: ${currentVersion} -> ${esp32_version}`,
        });
    } else {
        console.log(`✅ Device is up to date`);
        res.json({
            update_available: false,
            latest_version: esp32_version,
            current_version: currentVersion,
        });
    }
});

export const startHttpServer = () => {
    console.log('=== STARTING HTTP SERVER ===');
    console.log('Host:', host);
    console.log('Port:', port);
    console.log('Full URL:', `http://${host}:${port}`);

    app.listen(port, host, () => {
        console.log(`✅ HTTP API server running on http://${host}:${port}`);
        console.log('Available endpoints:');
        console.log('  POST /api/register-device  - ESP32 device registration');
        console.log('  POST /api/machine-data     - ESP32 data submission');
        console.log('  GET  /api/health           - Health check');
        console.log('  GET  /api/devices          - List registered devices');
        console.log('  GET  /api/machines         - Get machine status');
        console.log(
            '  GET  /api/check-update/:device_id - Check for firmware updates'
        );
        console.log('🔄 Ready to receive data from ESP32 devices...');
        console.log('=== SERVER STARTUP COMPLETE ===');
    });

    app.on('error', (error) => {
        console.error('❌ Server error:', error);
    });
};
