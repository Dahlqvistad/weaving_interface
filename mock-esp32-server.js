const http = require('http');

// ESP32 Device simulation class
class MockESP32Device {
    constructor(deviceId) {
        this.deviceId = deviceId;
        this.machineId = deviceId;
        this.targetUrl = 'http://localhost:3000/api/machine-data';
    }

    generateMockData() {
        const eventTypes = ['production', 'idle'];
        const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const fabricIds = [null, 1, 2, 3];
        
        return {
            machine_id: this.machineId,
            timestamp: new Date().toISOString(),
            event_type: randomEvent,
            value: Math.floor(Math.random() * 100) + 1,
            fabric_id: fabricIds[Math.floor(Math.random() * fabricIds.length)],
            meta: `mock_data_${Date.now()}`
        };
    }

    async sendData() {
        const mockData = this.generateMockData();
        const postData = JSON.stringify(mockData);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/machine-data',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    console.log(`ESP32-${this.deviceId} sent data:`, mockData);
                    console.log(`Response:`, JSON.parse(data));
                    resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
                });
            });

            req.on('error', (error) => {
                console.error(`ESP32-${this.deviceId} error:`, error.message);
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }
}

// Create 4 mock ESP32 devices
const devices = [
    new MockESP32Device(1),
    new MockESP32Device(2),
    new MockESP32Device(3),
    new MockESP32Device(4)
];

console.log('Mock ESP32 server connecting to Electron app...');
console.log('Simulating 4 ESP32 devices sending data every 2 seconds...');

// Function to send data from all devices
async function sendAllDeviceData() {
    for (const device of devices) {
        try {
            await device.sendData();
        } catch (error) {
            console.error(`Failed to send data from device ${device.deviceId}:`, error.message);
        }
    }
}

// Send data every 2 seconds
setInterval(sendAllDeviceData, 2000);

// Initial send after 1 second to allow Electron app to start
setTimeout(sendAllDeviceData, 1000);
