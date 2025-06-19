const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
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

// --- WebSocket Setup (Alpaca & Client Server) ---
let alpacaWs;
let wss; // WebSocket server for clients
let clients = [];
let isAuthenticated = false;
let subscribedTickers = new Set();

function setupWebSockets() {
  alpacaWs = new WebSocket('wss://stream.data.alpaca.markets/v2/iex');

  alpacaWs.on('open', () => {
    // console.log('Connected to Alpaca WebSocket');
    const authMessage = JSON.stringify({
      action: 'auth',
      key: process.env.ALPACA_KEY_ID,
      secret: process.env.ALPACA_SECRET_KEY,
    });
    alpacaWs.send(authMessage);
  });

  alpacaWs.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data);

      if (Array.isArray(parsedData)) {
        parsedData.forEach((message) => {
          if (message.T === 'success' && message.msg === 'authenticated') {
            isAuthenticated = true;
            // console.log('Successfully authenticated with Alpaca');
            // Resubscribe if needed after reconnect/auth
            resubscribeAllTickers();
          } else if (message.T === 'error') {
            // console.error('Alpaca Auth/Subscription Error:', message.msg);
          } else if (message.T === 'subscription') {
            // console.log('Alpaca Subscription Update:', message);
          } else if (message.T === 't') {
            // Trade update
            const tradeUpdate = {
              type: 'trade_update',
              ticker: message.S,
              price: parseFloat(message.p),
              timestamp: new Date(message.t).toISOString(),
            };
            // console.log('Trade Update:', tradeUpdate);
            broadcastToClients(tradeUpdate);
          }
        });
      }
    } catch (e) {
      console.error('Failed to parse Alpaca message:', e);
    }
  });

  alpacaWs.on('error', (err) => {
    console.error('Alpaca WebSocket error:', err);
  });

  alpacaWs.on('close', () => {
    // console.log('Alpaca WebSocket closed. Attempting to reconnect...');
    isAuthenticated = false;
    // Implement reconnection logic if desired (e.g., using setTimeout with backoff)
    setTimeout(setupWebSockets, 5000); // Simple reconnect attempt after 5s
  });

  // WebSocket Server for Clients
  wss = new WebSocket.Server({ port: 8080 });

  wss.on('listening', () => {
    // console.log('WebSocket server for clients started on port 8080');
  });

  wss.on('connection', (ws) => {
    // console.log('Client connected to WebSocket server');
    clients.push(ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        // console.log('Received from client:', data);
        if (data.type === 'subscribe' && data.ticker) {
          subscribeToTicker(data.ticker.toUpperCase(), ws); // Standardize ticker
        }
      } catch (e) {
        console.error('Failed to parse client message:', e);
      }
    });

    ws.on('close', () => {
      clients = clients.filter((client) => client !== ws);
      console.log('Client disconnected');
      // Optional: Unsubscribe tickers if no clients are listening?
    });

    ws.on('error', (error) => {
      // console.error('Client WebSocket error:', error);
      // Remove problematic client
      clients = clients.filter((client) => client !== ws);
    });
  });

  wss.on('error', (error) => {
    console.error('WebSocket Server Error:', error);
  });
}

function broadcastToClients(data) {
  const messageString = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

function subscribeToTicker(ticker, ws) {
  // ws parameter might not be needed if just adding to global set
  if (!isAuthenticated) {
    console.log(
      `Alpaca not authenticated yet. Queueing subscription for ${ticker}.`
    );
    // Optionally inform the client they are queued
    // ws.send(JSON.stringify({ type: 'status', message: `Subscription for ${ticker} queued.`}));
    // Check periodically or rely on auth success callback to subscribe pending tickers
    return;
  }

  if (subscribedTickers.has(ticker)) {
    // console.log(`${ticker} is already subscribed to Alpaca.`);
    // Optionally inform the client they are now receiving data
    // ws.send(JSON.stringify({ type: 'status', message: `Already subscribed to ${ticker}.`}));
    return;
  }

  // console.log(`Attempting to subscribe to Alpaca trades for ${ticker}`);
  const subscribeMessage = JSON.stringify({
    action: 'subscribe',
    trades: [ticker],
    // quotes: [ticker] // Add quotes if needed
    // bars: [ticker] // Add bars if needed
  });

  alpacaWs.send(subscribeMessage);
  subscribedTickers.add(ticker); // Add to set *after* sending request (or upon confirmation)
  // Confirmation comes via 'subscription' message from Alpaca
}

function resubscribeAllTickers() {
  if (!isAuthenticated) return;
  if (subscribedTickers.size === 0) return;

  // console.log('Resubscribing to tickers:', Array.from(subscribedTickers));
  const subscribeMessage = JSON.stringify({
    action: 'subscribe',
    trades: Array.from(subscribedTickers),
  });
  alpacaWs.send(subscribeMessage);
}

const startServer = async () => {
  try {
    await initializePinecone();
    console.log('Pinecone initialized successfully.');

    app.listen(PORT, () => {
      console.log(`HTTP Server running on port ${PORT}`);
    });

    // setupWebSockets();
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();
