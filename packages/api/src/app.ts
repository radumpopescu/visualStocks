import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import http from 'http';
import { Server } from 'socket.io';

import router from './router';
import addSocketListeners from './sockets';
import path from 'path';

dotenv.config();
const PORT = 6969;
// Define the path to the public directory
const PUBLIC_PATH = path.join(__dirname, './public');
const INDEX_HTML_PATH = path.join(__dirname, './public/index.html');
// Define the path to the data directory
const DATA_PATH = path.join(__dirname, './data');

// Ensure data directory exists
if (!fs.existsSync(DATA_PATH)) {
  console.log(`Creating data directory at ${DATA_PATH}`);
  fs.mkdirSync(DATA_PATH, { recursive: true });
}

// Create express server
const app: Express = express();

// Create a http server used by both express and socket.io
const server = http.createServer(app);

// Create the socket.io server
const io = new Server(server, { cors: { origin: '*' } });

// Enable CORS requests
app.use(cors());

// Enable json parsing of requests
app.use(bodyParser.json());

// Define the routes
app.use('/api', router);

// Set the sockets
addSocketListeners(io);

// Serve static files from the UI build
app.use(express.static(PUBLIC_PATH));

// Serve files from the data directory
app.use('/data', express.static(DATA_PATH));

// For SPA routing - serve index.html for any non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  if (fs.existsSync(INDEX_HTML_PATH)) {
    res.sendFile(INDEX_HTML_PATH);
  } else {
    res.status(404).send('Not found');
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🍀🍀 Server is running at http://localhost:${PORT} 🍀🍀`);
});

export default app;
