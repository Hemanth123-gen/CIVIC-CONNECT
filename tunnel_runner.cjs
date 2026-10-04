const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('[*] Starting Cloudflare Live Tunnel for CivicPulse on port 5050...');

const p = spawn('npx', ['-y', 'cloudflared', 'tunnel', '--url', 'http://localhost:5050'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

let tunnelUrl = null;

function handleOutput(data) {
  const text = data.toString();
  process.stdout.write(text);
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  if (match && !tunnelUrl) {
    tunnelUrl = match[0];
    console.log('\n==================================================================');
    console.log('       🎉 CIVICPULSE LIVE DEPLOYED URL ACTIVE WORLDWIDE:          ');
    console.log('       ' + tunnelUrl);
    console.log('==================================================================\n');
    fs.writeFileSync(path.join(__dirname, 'deployed_url.txt'), tunnelUrl + '\n', 'utf8');
  }
}

p.stdout.on('data', handleOutput);
p.stderr.on('data', handleOutput);

p.on('close', (code) => {
  console.log('Tunnel closed with code:', code);
});
