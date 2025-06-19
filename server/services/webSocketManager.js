const WebSocket = require('ws');
const { WebSocketServer } = require('ws');

let finnhubWs;
let clientWssInstance;
let currentFinnhubTicker = null;

let finnhubReconnectAttempts = 0;
const MAX_FINNHUB_RECONNECT_ATTEMPTS = 6;
const INITIAL_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_DELAY = 60000; // 1 minute
let currentReconnectDelay = INITIAL_RECONNECT_DELAY;
let finnhubReconnectTimeoutId = null;

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

if (!FINNHUB_API_KEY) {
  console.error(
    '[WebSocketManager] FATAL ERROR: FINNHUB_API_KEY is not defined.'
  );
}

// --- Helper function to check general market hours ---
function isMarketGenerallyOpen() {
  const now = new Date();
  const nowET = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const dayET = nowET.getDay();
  const hourET = nowET.getHours();
  if (dayET < 1 || dayET > 5) return false;
  if (hourET < 9 || hourET >= 17) return false;
  return true;
}

// --- Broadcasting to Clients (needs clientWssInstance) ---
function broadcastToClients(data) {
  if (!clientWssInstance || clientWssInstance.clients.size === 0) return;
  const messageString = JSON.stringify(data);
  clientWssInstance.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString);
      } catch (e) {
        console.error(
          '[ClientWSManager] Error sending to a client:',
          e.message
        );
      }
    }
  });
}

// --- Finnhub Subscription Logic ---
function subscribeToFinnhubTicker(ticker) {
  if (!ticker) return;
  if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
    const subscribeMsg = JSON.stringify({ type: 'subscribe', symbol: ticker });
    console.log(
      `[FinnhubWSManager] Sending subscribe message to Finnhub: ${subscribeMsg}`
    );
    finnhubWs.send(subscribeMsg);
  } else {
    console.warn(
      `[FinnhubWSManager] Not connected to Finnhub. ${ticker} will be subscribed upon connection.`
    );
    if (
      !finnhubWs ||
      (finnhubWs.readyState !== WebSocket.OPEN &&
        finnhubWs.readyState !== WebSocket.CONNECTING)
    ) {
      connectToFinnhub(); // Attempt to connect if not already trying
    }
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
      `[FinnhubWSManager] Sending unsubscribe message to Finnhub: ${unsubscribeMsg}`
    );
    finnhubWs.send(unsubscribeMsg);
  }
}

// --- Finnhub WebSocket Connection Logic ---
function connectToFinnhub() {
  if (finnhubReconnectTimeoutId) {
    clearTimeout(finnhubReconnectTimeoutId);
    finnhubReconnectTimeoutId = null;
  }
  if (!FINNHUB_API_KEY) {
    console.error(
      '[FinnhubWSManager] Cannot connect: FINNHUB_API_KEY is missing.'
    );
    // Schedule a retry with a long delay if key is missing, maybe it gets set later
    finnhubReconnectTimeoutId = setTimeout(
      connectToFinnhub,
      MAX_RECONNECT_DELAY * 2
    );
    return;
  }

  console.log(
    `[FinnhubWSManager] Attempting to connect (Attempt: ${
      finnhubReconnectAttempts + 1
    })...`
  );
  if (
    finnhubWs &&
    (finnhubWs.readyState === WebSocket.OPEN ||
      finnhubWs.readyState === WebSocket.CONNECTING)
  ) {
    console.log(
      '[FinnhubWSManager] Already connected or connecting. Aborting new connection attempt.'
    );
    return;
  }

  if (!isMarketGenerallyOpen() && finnhubReconnectAttempts > 2) {
    console.log(
      '[FinnhubWSManager] Market is likely closed. Delaying reconnect attempt significantly.'
    );
    finnhubReconnectTimeoutId = setTimeout(
      connectToFinnhub,
      MAX_RECONNECT_DELAY * 5
    );
    return;
  }

  const finnhubUrl = `wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`;
  finnhubWs = new WebSocket(finnhubUrl);

  finnhubWs.on('open', () => {
    console.log(
      '[FinnhubWSManager] Connection opened successfully with Finnhub.'
    );
    finnhubReconnectAttempts = 0;
    currentReconnectDelay = INITIAL_RECONNECT_DELAY;
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
        if (finnhubWs.readyState === WebSocket.OPEN)
          finnhubWs.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error(
        '[FinnhubWSManager] Failed to parse message:',
        data.toString(),
        e
      );
    }
  });

  finnhubWs.on('error', (err) =>
    console.error('[FinnhubWSManager] WebSocket error:', err.message)
  );

  finnhubWs.on('close', (code, reason) => {
    const reasonString = reason ? reason.toString() : 'No reason provided';
    finnhubWs = null;
    if (finnhubReconnectAttempts >= MAX_FINNHUB_RECONNECT_ATTEMPTS) {
      console.error(
        `[FinnhubWSManager] Max reconnect attempts reached. Will try again after a longer delay or on next client subscription.`
      );
      finnhubReconnectTimeoutId = setTimeout(() => {
        finnhubReconnectAttempts = 0;
        connectToFinnhub();
      }, MAX_RECONNECT_DELAY * 10);
      return;
    }
    finnhubReconnectAttempts++;
    const jitter = Math.random() * 1000;
    const delayWithJitter =
      Math.min(currentReconnectDelay, MAX_RECONNECT_DELAY) + jitter;
    console.log(
      `[FinnhubWSManager] Closed. Code: ${code}, Reason: "${reasonString}". Reconnecting in ${(
        delayWithJitter / 1000
      ).toFixed(1)}s... (Attempt ${finnhubReconnectAttempts})`
    );
    finnhubReconnectTimeoutId = setTimeout(connectToFinnhub, delayWithJitter);
    currentReconnectDelay = Math.min(
      currentReconnectDelay * 1.5,
      MAX_RECONNECT_DELAY
    );
  });
}

// --- Client Subscription Logic (needs clientWssInstance) ---
function handleClientSubscriptionRequest(requestedTicker, wsClient) {
  console.log(
    `[ClientWSManager] Client requested ${requestedTicker}. Current Finnhub: ${currentFinnhubTicker}`
  );
  if (wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'status',
        ticker: requestedTicker,
        message: `Processing for ${requestedTicker}...`,
      })
    );
  }

  if (currentFinnhubTicker !== requestedTicker) {
    if (currentFinnhubTicker)
      unsubscribeFromFinnhubTicker(currentFinnhubTicker);
    currentFinnhubTicker = requestedTicker;
    if (
      finnhubWs === null &&
      finnhubReconnectAttempts >= MAX_FINNHUB_RECONNECT_ATTEMPTS
    ) {
      console.log(
        '[FinnhubWSManager] New ticker requested after max retries. Resetting & connecting.'
      );
      finnhubReconnectAttempts = 0;
      currentReconnectDelay = INITIAL_RECONNECT_DELAY;
      if (finnhubReconnectTimeoutId) clearTimeout(finnhubReconnectTimeoutId);
      connectToFinnhub();
    } else {
      subscribeToFinnhubTicker(currentFinnhubTicker);
    }
  } else {
    if (
      !finnhubWs ||
      (finnhubWs.readyState !== WebSocket.OPEN &&
        finnhubWs.readyState !== WebSocket.CONNECTING)
    ) {
      if (finnhubReconnectAttempts >= MAX_FINNHUB_RECONNECT_ATTEMPTS) {
        finnhubReconnectAttempts = 0;
        currentReconnectDelay = INITIAL_RECONNECT_DELAY;
      }
      connectToFinnhub();
    }
  }
  if (wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(
      JSON.stringify({
        type: 'status',
        ticker: requestedTicker,
        message: `Listening for ${requestedTicker}...`,
      })
    );
  }
}

// --- Client-Facing WebSocket Server Setup (Called ONCE from server.js) ---
function initializeClientWSS(httpServer) {
  if (clientWssInstance) {
    console.warn('[ClientWSManager] Server already initialized.');
    return clientWssInstance;
  }
  console.log(
    '[ClientWSManager] Initializing client-facing WebSocket server...'
  );
  clientWssInstance = new WebSocketServer({ server: httpServer });
  console.log('[ClientWSManager] Server configured.');

  clientWssInstance.on('connection', (ws, req) => {
    const clientIp =
      req.socket.remoteAddress ||
      req.headers['x-forwarded-for'] ||
      'Unknown IP';
    console.log(
      `[ClientWSManager] Client connected. IP: ${clientIp}. Total: ${clientWssInstance.clients.size}`
    );
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'subscribe' && data.ticker) {
          handleClientSubscriptionRequest(data.ticker.toUpperCase(), ws);
        } else if (data.type === 'unsubscribe' && data.ticker) {
          // console.log(`[ClientWSManager] Unsubscribe for ${data.ticker} (not fully implemented for Finnhub single stream).`);
        }
      } catch (e) {
        console.error('[ClientWSManager] Failed to parse client message:', e);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid format.' }));
      }
    });
    ws.on('close', () => {
      console.log(
        `[ClientWSManager] Client disconnected. Total: ${clientWssInstance.clients.size}`
      );
      if (clientWssInstance.clients.size === 0 && currentFinnhubTicker) {
        unsubscribeFromFinnhubTicker(currentFinnhubTicker);
        console.log(
          `[FinnhubWSManager] Unsubscribed from ${currentFinnhubTicker} (last client left).`
        );
        currentFinnhubTicker = null;
      }
    });
    ws.on('error', (error) =>
      console.error('[ClientWSManager] Client connection error:', error.message)
    );
  });
  clientWssInstance.on('error', (error) =>
    console.error('[ClientWSManager] Main server error:', error)
  );
  return clientWssInstance;
}

// --- Graceful Shutdown for WebSockets (Called from server.js) ---
function shutdownWebSockets(signal) {
  console.log(
    `[WebSocketManager] Shutting down WebSockets due to ${signal}...`
  );
  if (finnhubReconnectTimeoutId) {
    clearTimeout(finnhubReconnectTimeoutId);
    finnhubReconnectTimeoutId = null;
  }

  const p1 = new Promise((resolve) => {
    if (
      finnhubWs &&
      (finnhubWs.readyState === WebSocket.OPEN ||
        finnhubWs.readyState === WebSocket.CONNECTING)
    ) {
      finnhubWs.removeAllListeners('close');
      finnhubWs.on('close', () => {
        console.log('[FinnhubWSManager] Closed.');
        resolve();
      });
      finnhubWs.close(1000, `Server shutdown: ${signal}`);
      setTimeout(() => {
        if (finnhubWs && finnhubWs.readyState !== WebSocket.CLOSED)
          finnhubWs.terminate();
        resolve();
      }, 1000);
    } else {
      resolve();
    }
  });

  const p2 = new Promise((resolve) => {
    if (clientWssInstance) {
      clientWssInstance.clients.forEach((client) =>
        client.close(1000, `Server shutdown: ${signal}`)
      );
      clientWssInstance.close(() => {
        console.log('[ClientWSManager] Server closed.');
        resolve();
      });
      setTimeout(() => {
        resolve();
      }, 1000); // Fallback for close
    } else {
      resolve();
    }
  });

  return Promise.all([p1, p2]);
}

module.exports = {
  initializeClientWSS,
  connectToFinnhub,
  shutdownWebSockets,
};
