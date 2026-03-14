const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'wemail-super-secret-jwt-key-2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://wemail:wemail123@postgres:5432/wemail'
});

const connectDB = async (retries = 10) => {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ PostgreSQL connected!');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          location VARCHAR(255),
          is_all_day BOOLEAN DEFAULT FALSE,
          color VARCHAR(20) DEFAULT '#7C3AED',
          attendees TEXT[],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      return;
    } catch (err) {
      console.log(`⏳ Waiting for PostgreSQL... attempt ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('❌ Could not connect to PostgreSQL');
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

app.get('/api/calendar/events', verifyToken, async (req, res) => {
  const { month, year } = req.query;
  let query = 'SELECT * FROM events WHERE user_id = $1';
  const params = [req.user.sub];
  if (month && year) {
    query += ` AND EXTRACT(MONTH FROM start_time) = $2 AND EXTRACT(YEAR FROM start_time) = $3`;
    params.push(parseInt(month), parseInt(year));
  }
  query += ' ORDER BY start_time ASC';
  const result = await pool.query(query, params);
  res.json({ events: result.rows });
});

app.post('/api/calendar/events', verifyToken, async (req, res) => {
  const { title, description, start_time, end_time, location, is_all_day, color, attendees } = req.body;
  if (!title || !start_time || !end_time)
    return res.status(400).json({ error: 'title, start_time, end_time are required' });
  const result = await pool.query(
    `INSERT INTO events (user_id, title, description, start_time, end_time, location, is_all_day, color, attendees)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.user.sub, title, description, start_time, end_time, location, is_all_day || false, color || '#7C3AED', attendees || []]
  );
  res.status(201).json(result.rows[0]);
});

app.get('/api/calendar/events/:id', verifyToken, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM events WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.sub]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
  res.json(result.rows[0]);
});

app.put('/api/calendar/events/:id', verifyToken, async (req, res) => {
  const { title, description, start_time, end_time, location, is_all_day, color, attendees } = req.body;
  const result = await pool.query(
    `UPDATE events SET title=$1, description=$2, start_time=$3, end_time=$4,
     location=$5, is_all_day=$6, color=$7, attendees=$8, updated_at=NOW()
     WHERE id=$9 AND user_id=$10 RETURNING *`,
    [title, description, start_time, end_time, location, is_all_day, color, attendees, req.params.id, req.user.sub]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
  res.json(result.rows[0]);
});

app.delete('/api/calendar/events/:id', verifyToken, async (req, res) => {
  const result = await pool.query(
    'DELETE FROM events WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.sub]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
  res.json({ message: 'Event deleted' });
});

app.get('/api/calendar/upcoming', verifyToken, async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM events WHERE user_id = $1
     AND start_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
     ORDER BY start_time ASC`,
    [req.user.sub]
  );
  res.json({ events: result.rows });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'calendar-service', version: '1.0.0' });
});

connectDB().then(() => {
  app.listen(3002, '0.0.0.0', () => {
    console.log('🚀 Calendar service running on port 3002');
  });
});
