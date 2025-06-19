const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

dotenv.config();

const { initializePinecone } = require('./services/pineCone');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const stockRoutes = require('./routes/stockRoutes');
const aiRoutes = require('./routes/aiRoutes');
const sentimentRoutes = require('./routes/sentimentRoutes');
const agentRoutes = require('./routes/agentRoutes');

app.use('/api/stocks', stockRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/agent', agentRoutes);

app.get('/', (req, res) => {
  res.send('Stock server says hi!');
});

let finnhubWs; // WebSocket connection to Finnhub
let clientWss; // WebSocket server for frontend clients
let currentFinnhubTicker = null; // Tracks the single ticker currently subscribed to Finnhub

function connectToFinnhub() {
  console.log('[FinnhubWS] Attempting to connect...');
  if (
    finnhubWs &&
    (finnhubWs.readyState === WebSocket.OPEN ||
      finnhubWs.readyState === WebSocket.CONNECTING)
  ) {
    console.log(
      '[FinnhubWS] Already connected or connecting. Aborting new connection attempt.'
    );
    return;
  }

  const finnhubUrl = `wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`;
  finnhubWs = new WebSocket(finnhubUrl);

  finnhubWs.on('open', () => {
    console.log('[FinnhubWS] Connection opened successfully with Finnhub.');
    // If there was a ticker requested before connection, subscribe to it now
    if (currentFinnhubTicker) {
      subscribeToFinnhubTicker(currentFinnhubTicker);
    }
  });

  finnhubWs.on('message', (data) => {
    try {
      const messageBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const parsedMessage = JSON.parse(messageBuffer.toString());

      if (parsedMessage.type === 'trade' && parsedMessage.data) {
        parsedMessage.data.forEach((trade) => {
          // Only broadcast if it matches the currently subscribed ticker
          if (trade.s === currentFinnhubTicker) {
            const tradeUpdate = {
              type: 'trade_update',
              ticker: trade.s,
              price: parseFloat(trade.p),
              timestamp: new Date(trade.t).toISOString(),
              volume: trade.v,
            };
            broadcastToClients(tradeUpdate);
          }
        });
      } else if (parsedMessage.type === 'ping') {
        if (finnhubWs.readyState === WebSocket.OPEN) {
          finnhubWs.send(JSON.stringify({ type: 'pong' }));
        }
      }
    } catch (e) {
      console.error(
        '[FinnhubWS] Failed to parse message or error in message handler:',
        data.toString(),
        e
      );
    }
  });

  finnhubWs.on('error', (err) =>
    console.error('[FinnhubWS] WebSocket error:', err.message)
  );

  finnhubWs.on('close', (code, reason) => {
    const reasonString = reason ? reason.toString() : 'No reason provided';
    console.log(
      `[FinnhubWS] WebSocket connection closed. Code: ${code}, Reason: "${reasonString}". Attempting to reconnect Finnhub in 5s...`
    );
    finnhubWs = null;
    // currentFinnhubTicker remains, so it will be resubscribed on reconnect
    setTimeout(connectToFinnhub, 5000);
  });
}

// --- Client-Facing WebSocket Server Setup (Called ONCE) ---
function setupClientWebSocketServer(httpServer) {
  if (clientWss) {
    console.warn(
      '[ClientWS] Client-facing WebSocket server already initialized.'
    );
    return;
  }
  console.log('[ClientWS] Initializing client-facing WebSocket server...');
  clientWss = new WebSocket.Server({ server: httpServer });
  console.log('[ClientWS] Server configured (attached to HTTP server).');

  clientWss.on('connection', (ws, req) => {
    const clientIp =
      req.socket.remoteAddress ||
      req.headers['x-forwarded-for'] ||
      'Unknown IP';
    console.log(
      `[ClientWS] Client connected. IP: ${clientIp}. Total clients: ${clientWss.clients.size}`
    );

    ws.on('message', (message) => {
      try {
        const messageBuffer = Buffer.isBuffer(message)
          ? message
          : Buffer.from(message);
        const data = JSON.parse(messageBuffer.toString());
        if (data.type === 'subscribe' && data.ticker) {
          handleClientSubscriptionRequest(data.ticker.toUpperCase(), ws);
        } else if (data.type === 'unsubscribe' && data.ticker) {
          // Unsubscribe is trickier with a single global ticker; if one client unsubscribes,
          // others might still want it. For simplicity, we can ignore client unsubs for now,
          // or clear currentFinnhubTicker if NO clients are connected.
          console.log(
            `[ClientWS] Received unsubscribe for ${data.ticker}. Currently not acting on individual client unsubs.`
          );
        }
      } catch (e) {
        console.error(
          '[ClientWS] Failed to parse client message:',
          message.toString(),
          e
        );
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Invalid message format.',
            })
          );
        }
      }
    });
    ws.on('close', (code, reason) => {
      console.log(
        `[ClientWS] Client disconnected. Total clients: ${clientWss.clients.size}`
      );
      if (clientWss.clients.size === 0 && currentFinnhubTicker) {
        console.log(
          '[FinnhubWS] Last client disconnected. Unsubscribing from Finnhub ticker:',
          currentFinnhubTicker
        );
        unsubscribeFromFinnhubTicker(currentFinnhubTicker);
        currentFinnhubTicker = null;
      }
    });
    ws.on('error', (error) =>
      console.error('[ClientWS] Error on a client WebSocket:', error.message)
    );
  });
  clientWss.on('error', (error) =>
    console.error('[ClientWS] Main Client WebSocket Server error:', error)
  );
}

// --- Broadcasting and Subscription Logic ---
function broadcastToClients(data) {
  if (!clientWss || clientWss.clients.size === 0) return;
  const messageString = JSON.stringify(data);
  clientWss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString);
      } catch (e) {
        console.error('[ClientWS] Error sending to a client:', e.message);
      }
    }
  });
}

function handleClientSubscriptionRequest(requestedTicker, wsClient) {
  console.log(
    `[ClientWS] Client requested subscription to ${requestedTicker}. Current Finnhub ticker: ${currentFinnhubTicker}`
  );
  if (wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'status',
        ticker: requestedTicker,
        message: `Processing subscription for ${requestedTicker}...`,
      })
    );
  }

  if (currentFinnhubTicker !== requestedTicker) {
    console.log(
      `[FinnhubWS] Requested ticker ${requestedTicker} is different from current ${currentFinnhubTicker}. Changing subscription.`
    );
    if (currentFinnhubTicker) {
      unsubscribeFromFinnhubTicker(currentFinnhubTicker);
    }
    currentFinnhubTicker = requestedTicker;
    subscribeToFinnhubTicker(currentFinnhubTicker);
  } else {
    console.log(
      `[FinnhubWS] Already subscribed to ${requestedTicker} on Finnhub.`
    );
  }

  if (wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'status',
        ticker: requestedTicker,
        message: `Now listening for ${requestedTicker} updates.`,
      })
    );
  }
}

function subscribeToFinnhubTicker(ticker) {
  if (!ticker) return;
  if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
    const subscribeMsg = JSON.stringify({ type: 'subscribe', symbol: ticker });
    console.log(
      `[FinnhubWS] Sending subscribe message to Finnhub: ${subscribeMsg}`
    );
    finnhubWs.send(subscribeMsg);
  } else {
    console.warn(
      `[FinnhubWS] Not connected to Finnhub. ${ticker} will be subscribed upon connection.`
    );
    // currentFinnhubTicker is already set, so connectToFinnhub will handle it on 'open'
  }
}

function unsubscribeFromFinnhubTicker(ticker) {
  if (!ticker) return;
  if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
    const unsubscribeMsg = JSON.stringify({
      type: 'unsubscribe',
      symbol: ticker,
    });
    console.log(
      `[FinnhubWS] Sending unsubscribe message to Finnhub: ${unsubscribeMsg}`
    );
    finnhubWs.send(unsubscribeMsg);
  }
}

const startServer = async () => {
  try {
    await initializePinecone();
    console.log('Pinecone initialized successfully.');
    const httpServer = http.createServer(app);
    setupClientWebSocketServer(httpServer);
    connectToFinnhub();
    httpServer.listen(PORT, () => {
      console.log(`HTTP and WebSocket Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();

// --- Graceful Shutdown Logic ---
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  // Simplified shutdown logic
  if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
    console.log('[FinnhubWS] Closing Finnhub connection...');
    finnhubWs.removeAllListeners('close'); // Prevent auto-reconnect during shutdown
    finnhubWs.close(1000, `Server shutdown: ${signal}`);
  }
  if (clientWss) {
    console.log('[ClientWS] Closing client connections and server...');
    clientWss.clients.forEach((client) =>
      client.close(1000, `Server shutdown: ${signal}`)
    );
    clientWss.close(() => {
      console.log('[ClientWS] Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
  // Fallback exit
  setTimeout(() => {
    console.error('Graceful shutdown timeout. Forcing exit.');
    process.exit(1);
  }, 3000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
