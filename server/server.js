const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

const stockRoutes = require('./routes/stockRoutes');

app.use('/api/stocks', stockRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
