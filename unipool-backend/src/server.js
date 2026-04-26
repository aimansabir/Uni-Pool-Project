const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`UniPool server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
  process.exit(1);
});