const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const WebSocket = require('ws');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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
      subscribeToTicker(ws, data.ticker);
    }
  });

  ws.on('close', () => {
    clients = clients.filter((client) => client !== ws);
    console.log('Client disconnected');
  });
});

const subscribeToTicker = (ws, ticker) => {
  const streamUrl = `wss://stream.data.alpaca.markets/v2/iex`;

  const alpacaWs = new WebSocket(streamUrl);

  alpacaWs.on('open', () => {
    console.log(`Connected to Alpaca WebSocket for ${ticker}`);

    const authMessage = JSON.stringify({
      action: 'auth',
      key: process.env.ALPACA_KEY_ID,
      secret: process.env.ALPACA_SECRET_KEY,
    });
    alpacaWs.send(authMessage);

    const subscribeMessage = JSON.stringify({
      action: 'subscribe',
      trades: [ticker], // Use the ticker parameter here
    });
    alpacaWs.send(subscribeMessage);
  });

  alpacaWs.on('message', (data) => {
    const parsedData = JSON.parse(data);
    console.log('Received data from Alpaca:', parsedData);

    if (Array.isArray(parsedData) && parsedData[0] && parsedData[0].T === 't') {
      // This is a trade update
      const tradeData = parsedData[0];
      const message = JSON.stringify({
        type: 'trade_update',
        ticker: tradeData.S,
        price: parseFloat(tradeData.p),
        timestamp: new Date(tradeData.t).toISOString(),
      });

      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  alpacaWs.on('error', (err) => {
    console.error('Alpaca WebSocket error:', err);
  });

  alpacaWs.on('close', () => {
    console.log('Alpaca WebSocket closed');
  });
};

app.get('/', (req, res) => {
  res.send('Stock server says hi!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
