// Simple test to verify login API
const credentials = {
  username: 'testagent',
  password: 'agent123'
};

console.log('Testing login API...');

fetch('http://localhost:3000/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(credentials)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response data:', data);
  if (data.success) {
    console.log('✅ Login successful!');
    console.log('Token:', data.token);
    console.log('User:', data.user);
  } else {
    console.log('❌ Login failed:', data.message);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});