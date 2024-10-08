const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: 'https://glenrage.github.io', // Replace with your actual front-end origin
  optionsSuccessStatus: 200, // Some browsers require this for 204 responses
};

app.use(cors(corsOptions));
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
