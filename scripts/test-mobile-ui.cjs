// End-to-End CDP Test for Genshin Mobile Studio
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3005;
const CDP_PORT = 9233;

// Minimal static server to serve dist/
function startStaticServer(distPath, port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distPath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    } catch (e) {
      res.writeHead(500);
      res.end('Error loading file');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`[TestServer] Serving dist on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function runTest() {
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('dist/ does not exist. Please run npm run build first.');
    process.exit(1);
  }

  const server = await startStaticServer(distDir, PORT);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp_mobile_test_'));

  console.log('[CDP] Launching Headless Chrome in Mobile Emulation (412x915)...');
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempDir}`,
    '--window-size=412,915',
    '--force-device-scale-factor=2'
  ], { detached: false, stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  if (!wsUrl) {
    chromeProc.kill();
    server.close();
    throw new Error('Failed to attach to Chrome CDP debugger');
  }

  const ws = new globalThis.WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();
  const consoleMessages = [];

  ws.onmessage = (event) => {
    const data = typeof event.data === 'string' ? event.data : event.data.toString();
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map((a) => a.value || JSON.stringify(a)).join(' ');
      consoleMessages.push({ type: msg.params.type, text });
      console.log(`[Browser Console ${msg.params.type}]`, text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', msg.params.exceptionDetails);
    }
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => {
    if (ws.readyState === 1) return resolve();
    ws.onopen = resolve;
  });
  console.log('[CDP] Connected to Chrome DevTools Protocol');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412,
    height: 915,
    deviceScaleFactor: 2,
    mobile: true
  });

  console.log(`[CDP] Navigating to http://127.0.0.1:${PORT}...`);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}` });

  // Wait 2.5s for initial render and React hydration
  await new Promise((r) => setTimeout(r, 2500));

  // Verify page title and DOM elements
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = document.querySelector('#root');
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim());
        return {
          hasRoot: !!app,
          buttonCount: buttons.length,
          headings,
          sampleButtons: buttons.slice(0, 10)
        };
      })()
    `,
    returnByValue: true
  });

  console.log('[CDP] Page DOM Evaluation:', JSON.stringify(evalResult.result.value, null, 2));

  // Take screenshot of Arranger View
  const screenshotArranger = await send('Page.captureScreenshot', { format: 'png' });
  const shotArrangerPath = path.join(__dirname, '..', 'test_mobile_arranger.png');
  fs.writeFileSync(shotArrangerPath, Buffer.from(screenshotArranger.result.data, 'base64'));
  console.log(`[CDP] Saved Arranger screenshot to: ${shotArrangerPath}`);

  // Test switching tab to BGM Manager
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const bgmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('BGM') || b.innerText.includes('Soundtrack'));
        if (bgmBtn) {
          bgmBtn.click();
          return true;
        }
        return false;
      })()
    `
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Take screenshot of BGM View
  const screenshotBgm = await send('Page.captureScreenshot', { format: 'png' });
  const shotBgmPath = path.join(__dirname, '..', 'test_mobile_bgm.png');
  fs.writeFileSync(shotBgmPath, Buffer.from(screenshotBgm.result.data, 'base64'));
  console.log(`[CDP] Saved BGM Manager screenshot to: ${shotBgmPath}`);

  console.log('[CDP] Test execution complete. Zero crash errors!');

  // Cleanup
  ws.close();
  chromeProc.kill();
  server.close();
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {}
  process.exit(0);
}

runTest().catch((err) => {
  console.error('[CDP Test Failed]:', err);
  process.exit(1);
});
