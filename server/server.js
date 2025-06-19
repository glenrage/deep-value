const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');

dotenv.config();

const { initializePinecone } = require('./services/pineCone.js');
const stockRoutes = require('./routes/stockRoutes.js');
const aiRoutes = require('./routes/aiRoutes.js');
const sentimentRoutes = require('./routes/sentimentRoutes.js');
const agentRoutes = require('./routes/agentRoutes.js');

const {
  initializeClientWSS,
  connectToFinnhub,
  shutdownWebSockets,
} = require('./services/webSocketManager.js');

const app = express();
const PORT = process.env.PORT || 4000;

if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
  console.error(
    'FATAL ERROR: Missing critical environment variables (OpenAI or Pinecone keys).'
  );
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.use('/api/stocks', stockRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/agent', agentRoutes);

app.get('/', (req, res) => {
  res.send('Deep Value Stock Analysis Server is live!');
});

// --- Server Startup ---
const startServer = async () => {
  try {
    await initializePinecone();
    console.log('Pinecone initialized successfully.');

    const httpServer = http.createServer(app);

    initializeClientWSS(httpServer);
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

async function gracefulShutdown(signal) {
  // Made async to await WebSocket shutdown
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    await shutdownWebSockets(signal); // Call the shutdown function from the manager
    console.log('WebSocket services shutdown complete.');
  } catch (err) {
    console.error('Error during WebSocket shutdown:', err);
  }

  // Allow a brief moment for logs, then exit
  console.log('Exiting process...');
  setTimeout(() => process.exit(0), 500);

  // Ultimate fallback to ensure process exits if something hangs
  setTimeout(() => {
    console.error('Graceful shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 5000); // Increased timeout slightly
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon typically sends this
