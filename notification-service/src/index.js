const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const JWT_SECRET = process.env.JWT_SECRET || 'wemail-super-secret-jwt-key-2024';

// MongoDB with retry
const connectMongo = async (retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://mongodb:27017/wemail-notifications');
      console.log('✅ MongoDB connected!');
      return;
    } catch (err) {
      console.log(`⏳ Waiting for MongoDB... attempt ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('❌ Could not connect to MongoDB');
};

// Notification schema
const notificationSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  userEmail: { type: String, required: true },
  type:      { type: String, enum: ['email', 'security', 'system', 'chat', 'calendar'], default: 'system' },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  isRead:    { type: Boolean, default: false },
  severity:  { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  metadata:  { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// Auth middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Socket auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

// Track connected users: userId -> socketId
const userSockets = new Map();

io.on('connection', (socket) => {
  console.log(`🔔 Notification socket connected: ${socket.user.email}`);
  userSockets.set(socket.user.sub, socket.id);

  socket.on('disconnect', () => {
    userSockets.delete(socket.user.sub);
    console.log(`🔕 Disconnected: ${socket.user.email}`);
  });
});

// Helper: push real-time notification to a user
const pushToUser = (userId, notification) => {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification:new', notification);
    console.log(`📤 Pushed notification to ${userId}`);
  }
};

// ── REST Routes ───────────────────────────────────────────────────────────────

// Get my notifications
app.get('/api/notifications', verifyToken, async (req, res) => {
  const { unread_only } = req.query;
  const filter = { userId: req.user.sub };
  if (unread_only === 'true') filter.isRead = false;
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 }).limit(50);
  const unreadCount = await Notification.countDocuments({ userId: req.user.sub, isRead: false });
  res.json({ notifications, unread_count: unreadCount });
});

// Mark as read
app.patch('/api/notifications/:id/read', verifyToken, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: 'Marked as read' });
});

// Mark all as read
app.patch('/api/notifications/read-all', verifyToken, async (req, res) => {
  await Notification.updateMany({ userId: req.user.sub }, { isRead: true });
  res.json({ message: 'All marked as read' });
});

// Internal endpoint — called by other services to send notifications
app.post('/api/notifications/send', async (req, res) => {
  const { userId, userEmail, type, title, message, severity, metadata } = req.body;
  if (!userId || !userEmail || !title || !message) {
    return res.status(400).json({ error: 'userId, userEmail, title, message are required' });
  }
  const notification = await Notification.create({
    userId, userEmail, type: type || 'system',
    title, message, severity: severity || 'low', metadata: metadata || {}
  });
  // Push real-time if user is connected
  pushToUser(userId, notification);
  console.log(`🔔 Notification sent to ${userEmail}: ${title}`);
  res.status(201).json(notification);
});

// SOC alert endpoint — high severity, goes to all admins
app.post('/api/notifications/alert', async (req, res) => {
  const { title, message, severity, metadata } = req.body;
  // Broadcast to all connected users (in real system, filter by admin role)
  const alert = { title, message, severity: severity || 'critical', metadata, createdAt: new Date() };
  io.emit('soc:alert', alert);
  console.log(`🚨 SOC ALERT broadcast: ${title}`);
  res.status(201).json({ message: 'Alert broadcast sent', alert });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service', version: '1.0.0' });
});

connectMongo().then(() => {
  server.listen(3003, '0.0.0.0', () => {
    console.log('🚀 Notification service running on port 3003');
  });
});
