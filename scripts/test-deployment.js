/**
 * Deployment test script - simulates Railway environment
 * Run with: node scripts/test-deployment.js
 */
const http = require('http');
const path = require('path');
const fs = require('fs');

console.log('🔍 DEPLOYMENT TEST STARTING');
console.log('===========================');

// Check if the app starts properly
console.log('\n📋 CHECKING BASIC SERVER START:');
const childProcess = require('child_process');
try {
  console.log('  → Starting server with "node index.js"');
  
  // Use spawn instead of exec to see real-time output
  const server = childProcess.spawn('node', ['index.js'], {
    env: {...process.env},
    stdio: 'pipe'
  });

  let output = '';
  let isConnected = false;
  
  server.stdout.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    process.stdout.write('  ' + chunk);
    
    // Check for database connection
    if (chunk.includes('Connected to database')) {
      isConnected = true;
    }
  });
  
  server.stderr.on('data', (data) => {
    const chunk = data.toString();
    output += chunk;
    process.stdout.write('  ⚠️ ' + chunk);
  });

  // Check health endpoint after delay
  setTimeout(() => {
    if (!isConnected) {
      console.log('\n  ❌ ERROR: Database connection not established within 5 seconds');
    } else {
      console.log('\n  ✅ Database connection successful');
    }
    
    console.log('\n📋 CHECKING HEALTH ENDPOINT:');
    console.log('  → Testing /health endpoint');
    
    http.get('http://localhost:8000/health', (res) => {
      console.log(`  → Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('  ✅ Health endpoint responding correctly');
      } else {
        console.log('  ❌ Health endpoint not responding with 200 OK');
      }
      
      // Check root endpoint
      console.log('\n📋 CHECKING ROOT ENDPOINT:');
      console.log('  → Testing / endpoint');
      
      http.get('http://localhost:8000/', (res) => {
        console.log(`  → Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 400) {
            console.log('  ✅ Root endpoint responding with non-error status code');
          } else {
            console.log('  ❌ Root endpoint responding with error status code');
          }
          
          console.log('\n📋 TEST SUMMARY:');
          if (isConnected && res.statusCode >= 200 && res.statusCode < 400) {
            console.log('  ✅ App appears ready for deployment');
          } else {
            console.log('  ❌ Issues found that may affect deployment');
          }
          
          // Kill the server process
          server.kill();
          process.exit(0);
        });
      }).on('error', (err) => {
        console.log(`  ❌ Error connecting to root endpoint: ${err.message}`);
        server.kill();
        process.exit(1);
      });
    }).on('error', (err) => {
      console.log(`  ❌ Error connecting to health endpoint: ${err.message}`);
      server.kill();
      process.exit(1);
    });
  }, 5000);
  
} catch (err) {
  console.log(`  ❌ Failed to start server: ${err.message}`);
  process.exit(1);
}
