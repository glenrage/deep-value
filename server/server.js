const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const WebSocket = require('ws');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const stockRoutes = require('./routes/stockRoutes');
const aiRoutes = require('./routes/aiRoutes');
const sentimentRoutes = require('./routes/sentimentRoutes');

app.use('/api/stocks', stockRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sentiment', sentimentRoutes);

app.get('/', (req, res) => {
  res.send('Stock server says hi!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const alpacaWs = new WebSocket('wss://stream.data.alpaca.markets/v2/iex');
let isAuthenticated = false;
let subscribedTickers = new Set();

alpacaWs.on('open', () => {
  console.log('Connected to Alpaca WebSocket');

  const authMessage = JSON.stringify({
    action: 'auth',
    key: process.env.ALPACA_KEY_ID,
    secret: process.env.ALPACA_SECRET_KEY,
  });

  alpacaWs.send(authMessage);
});

alpacaWs.on('message', (data) => {
  const parsedData = JSON.parse(data);
  console.log('Received data from Alpaca:', parsedData);

  if (Array.isArray(parsedData)) {
    parsedData.forEach((message) => {
      if (message.T === 'success' && message.msg === 'authenticated') {
        isAuthenticated = true;
        console.log('Successfully authenticated with Alpaca');
      } else if (message.T === 't') {
        // This is a trade update
        const tradeUpdate = {
          type: 'trade_update',
          ticker: message.S,
          price: parseFloat(message.p),
          timestamp: new Date(message.t).toISOString(),
        };

        console.log('Trade Update:', tradeUpdate);

        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(tradeUpdate)); // Send trade update to clients
          }
        });
      }
    });
  }
});

alpacaWs.on('error', (err) => {
  console.error('Alpaca WebSocket error:', err);
});

alpacaWs.on('close', () => {
  console.log('Alpaca WebSocket closed');
  isAuthenticated = false;
});

// WebSocket Server for Clients
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log('WebSocket server started on port 8080');
});

let clients = [];

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.push(ws);

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'subscribe' && data.ticker) {
      subscribeToTicker(data.ticker, ws);
    }
  });

  ws.on('close', () => {
    clients = clients.filter((client) => client !== ws);
    console.log('Client disconnected');
  });
});

const subscribeToTicker = (ticker, ws) => {
  if (!isAuthenticated) {
    console.log('Not authenticated yet. Will subscribe once authenticated.');
    setTimeout(() => subscribeToTicker(ticker, ws), 1000);
    return;
  }

  if (subscribedTickers.has(ticker)) {
    console.log(`${ticker} is already subscribed`);
    return;
  }

  const subscribeMessage = JSON.stringify({
    action: 'subscribe',
    trades: [ticker],
  });

  alpacaWs.send(subscribeMessage);
  subscribedTickers.add(ticker);
  console.log(`Subscribed to ${ticker}`);
};
