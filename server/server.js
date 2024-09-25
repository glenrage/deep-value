const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const stockRoutes = require('./routes/stockRoutes');
const aiRoutes = require('./routes/aiRoutes');
// const sentimentRoutes = require('./src/routes/sentimentRoutes');

app.use('/api/stocks', stockRoutes);
app.use('/api/ai', aiRoutes);
// app.use('/api/sentiment', sentimentRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
