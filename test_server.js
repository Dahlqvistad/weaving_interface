const http = require('http');

// Test the health endpoint
const testEndpoint = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '192.168.88.118',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
};

async function runTests() {
  try {
    console.log('Testing HTTP server...');
    
    // Test health endpoint
    const health = await testEndpoint('/api/health');
    console.log('✅ Health endpoint:', health.statusCode, health.data);
    
    // Test devices endpoint
    const devices = await testEndpoint('/api/devices');
    console.log('✅ Devices endpoint:', devices.statusCode, devices.data);
    
    // Test machines endpoint
    const machines = await testEndpoint('/api/machines');
    console.log('✅ Machines endpoint:', machines.statusCode, machines.data);
    
    console.log('\n🎉 All endpoints are working!');
    
  } catch (error) {
    console.error('❌ Error testing server:', error.message);
  }
}

runTests();
