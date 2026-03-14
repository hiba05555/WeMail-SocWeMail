const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const JWT_SECRET = process.env.JWT_SECRET || 'wemail-super-secret-jwt-key-2024';
const SOC_URL = process.env.SOC_URL || 'http://soc-backend:8888';

const logToSoc = async (event_type, ip, email='', details={}) => {
  try {
    const { default: fetch } = await import('node-fetch');
    await fetch(`${SOC_URL}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: 'notification', event_type, ip, email, details })
    });
  } catch {}
};

const connectMongo = async (retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://mongodb:27017/wemail-notifications');
      console.log('✅ MongoDB connected!');
      return;
    } catch {
      console.log(`⏳ Waiting for MongoDB... attempt ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('❌ Could not connect to MongoDB');
};

const notificationSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  userEmail: { type: String, required: true },
  type:      { type: String, enum: ['email','security','system','chat','calendar'], default: 'system' },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  isRead:    { type: Boolean, default: false },
  severity:  { type: String, enum: ['low','medium','high','critical'], default: 'low' },
  metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try { socket.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { next(new Error('Unauthorized')); }
});

const userSockets = new Map();

io.on('connection', (socket) => {
  console.log(`🔔 Notification socket: ${socket.user.email}`);
  userSockets.set(socket.user.sub, socket.id);
  logToSoc('notification_connect', socket.handshake.address, socket.user.email, {});

  socket.on('disconnect', () => {
    userSockets.delete(socket.user.sub);
    logToSoc('notification_disconnect', socket.handshake.address, socket.user.email, {});
  });
});

const pushToUser = (userId, notification) => {
  const socketId = userSockets.get(userId);
  if (socketId) io.to(socketId).emit('notification:new', notification);
};

app.get('/api/notifications', verifyToken, async (req, res) => {
  const { unread_only } = req.query;
  const filter = { userId: req.user.sub };
  if (unread_only === 'true') filter.isRead = false;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.user.sub, isRead: false });
  res.json({ notifications, unread_count: unreadCount });
});

app.patch('/api/notifications/:id/read', verifyToken, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: 'Marked as read' });
});

app.patch('/api/notifications/read-all', verifyToken, async (req, res) => {
  await Notification.updateMany({ userId: req.user.sub }, { isRead: true });
  res.json({ message: 'All marked as read' });
});

app.post('/api/notifications/send', async (req, res) => {
  const { userId, userEmail, type, title, message, severity, metadata } = req.body;
  if (!userId || !userEmail || !title || !message)
    return res.status(400).json({ error: 'userId, userEmail, title, message are required' });
  const notification = await Notification.create({
    userId, userEmail, type: type||'system',
    title, message, severity: severity||'low', metadata: metadata||{}
  });
  pushToUser(userId, notification);
  await logToSoc('notification_sent', req.ip, userEmail, { title, severity });
  res.status(201).json(notification);
});

app.post('/api/notifications/alert', async (req, res) => {
  const { title, message, severity, metadata } = req.body;
  const alert = { title, message, severity: severity||'critical', metadata, createdAt: new Date() };
  io.emit('soc:alert', alert);
  await logToSoc('soc_alert_broadcast', req.ip, '', { title, severity });
  res.status(201).json({ message: 'Alert broadcast sent', alert });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service', version: '1.0.0' });
});

connectMongo().then(() => {
  server.listen(3003, '0.0.0.0', () => {
    console.log('🚀 Notification service running on port 3003');
  });
});
