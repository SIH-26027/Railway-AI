const http = require('http');

async function testApi() {
  console.log("Testing GET http://localhost:3001/api/approved-blocks...");
  const res = await fetch('http://localhost:3001/api/approved-blocks');
  console.log("GET status:", res.status);
  if (res.ok) {
    const data = await res.json();
    console.log("Approved blocks count:", data.approved ? data.approved.length : 0);
    console.log("Completed blocks count:", data.completed ? data.completed.length : 0);
    console.log("Supabase connected:", data.supabase?.connected);
  } else {
    console.error("GET failed:", await res.text());
  }
}

testApi();
