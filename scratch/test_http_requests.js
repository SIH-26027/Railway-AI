const http = require('http');

function checkUrl(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      console.log(`GET ${path} -> ${res.statusCode}`);
      resolve(res.statusCode);
    }).on('error', (e) => {
      console.error(`GET ${path} ERROR:`, e.message);
      resolve(null);
    });
  });
}

async function run() {
  await checkUrl('/requests');
  await checkUrl('/planning');
  process.exit(0);
}

run();
