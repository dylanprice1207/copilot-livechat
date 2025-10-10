const http = require('http');

const healthCheck = () => {
  const options = {
    host: 'localhost',
    port: process.env.PORT || 3000,
    path: '/health',
    timeout: 5000
  };

  console.log(`🔍 Health check: http://localhost:${options.port}${options.path}`);

  const request = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const health = JSON.parse(data);
        console.log('📊 Health Status:');
        console.log(`   Status: ${health.status}`);
        console.log(`   Database: ${health.database}`);
        console.log(`   Knowledge Base: ${health.knowledgeBase}`);
        console.log(`   Uptime: ${Math.floor(health.uptime)}s`);
        
        if (res.statusCode === 200 && health.database === 'connected') {
          console.log('✅ Health check passed');
          process.exit(0);
        } else {
          console.log(`❌ Health check failed (HTTP ${res.statusCode})`);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Failed to parse health response:', error.message);
        process.exit(1);
      }
    });
  });

  request.on('error', (error) => {
    console.error('❌ Health check request failed:', error.message);
    console.error('💡 Make sure the server is running on port', options.port);
    process.exit(1);
  });

  request.on('timeout', () => {
    console.error('❌ Health check timed out');
    request.destroy();
    process.exit(1);
  });

  request.end();
};

healthCheck();