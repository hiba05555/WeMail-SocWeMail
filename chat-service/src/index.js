const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
require('dotenv').config();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const JWT_SECRET = process.env.JWT_SECRET || 'wemail-super-secret-jwt-key-2024';
const SOC_URL = process.env.SOC_URL || 'http://soc-backend:8888';

const logToSoc = async (event_type, ip, email='', details={}) => {
  try {
    await fetch(`${SOC_URL}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'chat', event_type, ip, email, details })
    });
  } catch {}
};

const connectMongo = async (retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://mongodb:27017/wemail-chat');
      console.log('✅ MongoDB connected!');
      return;
    } catch {
      console.log(`⏳ Waiting for MongoDB... attempt ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('❌ Could not connect to MongoDB');
};

const messageSchema = new mongoose.Schema({
  roomId:      { type: String, required: true, index: true },
  senderId:    { type: String, required: true },
  senderEmail: { type: String, required: true },
  senderName:  { type: String, required: true },
  content:     { type: String, required: true },
  type:        { type: String, default: 'text' },
  isRead:      { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

const roomSchema = new mongoose.Schema({
  roomId:        { type: String, unique: true },
  participants:  [String],
  lastMessage:   String,
  lastMessageAt: Date,
  createdAt:     { type: Date, default: Date.now }
});
const Room = mongoose.model('Room', roomSchema);

const verifyToken = (token) => {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);
  if (!user) return next(new Error('Unauthorized'));
  socket.user = user;
  next();
});

const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.user.email}`);
  onlineUsers.set(socket.user.sub, socket.id);
  io.emit('users:online', Array.from(onlineUsers.keys()));
  logToSoc('chat_connect', socket.handshake.address, socket.user.email, {
    user_id: socket.user.sub
  });

  socket.on('room:join', async ({ roomId }) => {
    socket.join(roomId);
    const messages = await Message.find({ roomId }).sort({ createdAt: -1 }).limit(50).lean();
    socket.emit('messages:history', messages.reverse());
  });

  socket.on('message:send', async ({ roomId, content, recipientEmail }) => {
    const message = await Message.create({
      roomId, senderId: socket.user.sub,
      senderEmail: socket.user.email,
      senderName: socket.user.email.split('@')[0],
      content, type: 'text'
    });
    await Room.findOneAndUpdate(
      { roomId },
      { roomId, lastMessage: content, lastMessageAt: new Date(),
        $addToSet: { participants: [socket.user.email, recipientEmail] } },
      { upsert: true }
    );
    io.to(roomId).emit('message:new', message);
    logToSoc('chat_message', socket.handshake.address, socket.user.email, {
      room: roomId, content: content, recipient: recipientEmail
    });
  });

  socket.on('typing:start', ({ roomId }) => {
    socket.to(roomId).emit('typing:start', { email: socket.user.email });
  });

  socket.on('typing:stop', ({ roomId }) => {
    socket.to(roomId).emit('typing:stop', { email: socket.user.email });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.user.sub);
    io.emit('users:online', Array.from(onlineUsers.keys()));
    logToSoc('chat_disconnect', socket.handshake.address, socket.user.email, {});
    console.log(`🔴 Disconnected: ${socket.user.email}`);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'chat-service', version: '1.0.0' });
});

app.get('/api/chat/rooms', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const rooms = await Room.find({ participants: user.email }).sort({ lastMessageAt: -1 });
  res.json({ rooms });
});

app.get('/api/chat/rooms/:roomId/messages', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const messages = await Message.find({ roomId: req.params.roomId })
    .sort({ createdAt: -1 }).limit(50).lean();
  res.json({ messages: messages.reverse() });
});

connectMongo().then(() => {
  server.listen(3001, '0.0.0.0', () => {
    console.log('🚀 Chat service running on port 3001');
  });
});
