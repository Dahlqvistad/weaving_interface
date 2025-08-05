const http = require('http');

const testData = {
    firmware_version: "1.0.0",
    device_type: "ESP32-C6",
    capabilities: ["hall_sensor", "wifi"]
};

const postData = JSON.stringify(testData);

const options = {
    hostname: '192.168.88.118',
    port: 8080,
    path: '/api/register-device',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing device registration...');
console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
console.log('Data:', testData);

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        try {
            const response = JSON.parse(data);
            console.log('Parsed response:', response);
        } catch (e) {
            console.log('Could not parse response as JSON');
        }
    });
});

req.on('error', (error) => {
    console.error('Request failed:', error.message);
});

req.write(postData);
req.end();
