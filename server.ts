import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { OnlineMatchEngine } from './src/online/matchEngine.ts';
import type { ClientToServerMessage, ServerToClientMessage } from './src/online/protocol.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const engine = new OnlineMatchEngine();

  app.use(express.json());

  // Lightweight live multiplayer stats endpoint
  app.get('/api/online/stats', (_req, res) => {
    res.json(engine.getStats());
  });

  // WebSocket server mounted on /ws on the same HTTP server (port 3000)
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const send = (msg: ServerToClientMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    const clientId = engine.registerClient(send);

    ws.on('message', (rawData) => {
      try {
        const text = typeof rawData === 'string' ? rawData : rawData.toString('utf8');
        const parsed = JSON.parse(text) as ClientToServerMessage;
        if (!parsed || typeof parsed.type !== 'string') return;
        engine.handleMessage(clientId, parsed);
      } catch {
        send({
          type: 'error',
          code: 'BAD_PAYLOAD',
          message: 'Invalid message payload received.',
        });
      }
    });

    ws.on('close', () => {
      engine.unregisterClient(clientId);
    });

    ws.on('error', () => {
      engine.unregisterClient(clientId);
    });
  });

  // Authoritative server tick for countdown starts & match timer expiry
  const tickTimer = setInterval(() => {
    engine.tick();
  }, 200);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  server.listen(port, '0.0.0.0', () => {
    console.log(`FLAGVERSE server + WebSocket arena listening on http://0.0.0.0:${port}`);
  });

  const shutdown = () => {
    clearInterval(tickTimer);
    wss.close();
    server.close();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start FLAGVERSE server:', err);
  process.exit(1);
});
