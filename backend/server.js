const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const setupSocketHandlers = require('./socket/game');

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

setupSocketHandlers(io);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizgame';
const PORT = process.env.PORT || 3001;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error('MongoDB connection error:', err));

module.exports = { app, io };
