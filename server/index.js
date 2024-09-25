const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
