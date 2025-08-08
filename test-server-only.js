// Test script to run ONLY the HTTP server without Electron
const { initDatabase } = require('./src/database/init');
const { startHttpServer } = require('./src/http-server');

console.log('🧪 Testing HTTP server in isolation...');

async function testServerOnly() {
    try {
        console.log('Initializing database...');
        await initDatabase();
        console.log('✅ Database initialized');
        
        console.log('Starting HTTP server...');
        startHttpServer();
        console.log('✅ HTTP server started');
        
        console.log('🎯 Server should now be accessible at http://192.168.88.118:8080');
        console.log('Test with: curl http://192.168.88.118:8080/api/health');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testServerOnly();
