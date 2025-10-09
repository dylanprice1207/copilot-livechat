// Test the analytics endpoints to verify data structure
const testAnalyticsEndpoints = async () => {
  const token = 'dummy-token'; // Will fail auth but we can see the response structure
  
  console.log('Testing analytics endpoints...\n');
  
  const endpoints = [
    '/api/admin/analytics/top-agents',
    '/api/admin/analytics/hourly',
    '/api/admin/analytics'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log(`Status: ${response.status}`);
      console.log('Response structure:', JSON.stringify(data, null, 2));
      console.log('---');
      
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error.message);
    }
  }
};

testAnalyticsEndpoints();