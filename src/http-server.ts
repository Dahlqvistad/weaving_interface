import express from 'express';
import cors from 'cors';
import { MachineRawModel } from './database/models/MachineRaw';
import { MachineModel } from './database/models/Machine';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Endpoint to receive data from ESP32 devices
app.post('/api/machine-data', async (req, res) => {
    try {
        const { machine_id, timestamp, event_type, value, fabric_id, meta } = req.body;
        
        console.log(`Received data from ESP32-${machine_id}:`, req.body);
        
        // Store raw data
        await MachineRawModel.create({
            machine_id,
            timestamp: timestamp || new Date().toISOString(),
            event_type: event_type || 'production',
            value: value || 1,
            fabric_id,
            meta
        });
        
        // Update machine status and daily meter count
        const machine = await MachineModel.getById(machine_id);
        if (machine) {
            await MachineModel.update(machine_id, {
                status: event_type === 'production' ? 1 : 0,
                meter_idag: machine.meter_idag + (value || 0),
                last_active: new Date().toISOString()
            });
        }
        
        res.json({ success: true, message: 'Data received and stored' });
    } catch (error) {
        console.error('Error processing ESP32 data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Weaving Interface API running', 
        timestamp: new Date().toISOString() 
    });
});

// Get current machine status (for ESP32 to check)
app.get('/api/machines', async (req, res) => {
    try {
        const machines = await MachineModel.getAll();
        res.json(machines);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export const startHttpServer = () => {
    app.listen(port, () => {
        console.log(`HTTP API server running on http://localhost:${port}`);
        console.log('Ready to receive data from ESP32 devices...');
    });
};
