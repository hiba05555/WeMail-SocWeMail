// ─── WeMail API Service Layer ────────────────────────────────────────────────
// All requests go through the API Gateway on port 8080
// Chat uses Socket.io directly on port 3001

const GATEWAY = 'http://localhost:8080';
const CHAT_URL = 'http://localhost:3001';

// ─── Token helpers ────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('wemail_token');
export const getUser  = () => JSON.parse(localStorage.getItem('wemail_user') || 'null');
export const setAuth  = (token, user) => {
  localStorage.setItem('wemail_token', token);
  localStorage.setItem('wemail_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('wemail_token');
  localStorage.removeItem('wemail_user');
};

// ─── Base fetch wrapper ───────────────────────────────────────────────────────
async function request(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.message || 'Request failed');
  }

  return res.json();
}

// ─── Auth Service (/api/auth) ─────────────────────────────────────────────────
export const auth = {
  login: (email, password) =>
    request(`${GATEWAY}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email, username, full_name, password) =>
    request(`${GATEWAY}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ email, username, full_name, password }),
    }),

  logout: () => {
    clearAuth();
    return request(`${GATEWAY}/api/auth/logout`, { method: 'POST' });
  },

  me: () => request(`${GATEWAY}/api/users/me`),
};

// ─── Email Service (/api/emails) ──────────────────────────────────────────────
export const emails = {
  inbox: (page = 1) =>
    request(`${GATEWAY}/api/emails/inbox?page=${page}&per_page=20`),

  sent: (page = 1) =>
    request(`${GATEWAY}/api/emails/sent?page=${page}&per_page=20`),

  starred: () =>
    request(`${GATEWAY}/api/emails/starred`),

  spam: () =>
    request(`${GATEWAY}/api/emails/spam`),

  search: (q) =>
    request(`${GATEWAY}/api/emails/search?q=${encodeURIComponent(q)}`),

  get: (id) =>
    request(`${GATEWAY}/api/emails/${id}`),

  send: (recipient_email, subject, body) =>
    request(`${GATEWAY}/api/emails/send`, {
      method: 'POST',
      body: JSON.stringify({ recipient_email, subject, body }),
    }),

  markRead: (id) =>
    request(`${GATEWAY}/api/emails/${id}/read`, { method: 'PATCH' }),

  toggleStar: (id) =>
    request(`${GATEWAY}/api/emails/${id}/star`, { method: 'PATCH' }),

  delete: (id) =>
    request(`${GATEWAY}/api/emails/${id}`, { method: 'DELETE' }),
};

// ─── Chat Service (/api/chat) — REST part ────────────────────────────────────
export const chat = {
  rooms: () =>
    request(`${CHAT_URL}/api/chat/rooms`),

  messages: (roomId) =>
    request(`${CHAT_URL}/api/chat/rooms/${roomId}/messages`),
};

// ─── Calendar Service (/api/calendar) ────────────────────────────────────────
export const calendar = {
  events: (month, year) =>
    request(`${GATEWAY}/api/calendar/events?month=${month}&year=${year}`),

  upcoming: () =>
    request(`${GATEWAY}/api/calendar/upcoming`),

  create: (data) =>
    request(`${GATEWAY}/api/calendar/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    request(`${GATEWAY}/api/calendar/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    request(`${GATEWAY}/api/calendar/events/${id}`, { method: 'DELETE' }),
};

// ─── File Service (/api/files) ────────────────────────────────────────────────
export const files = {
  list: () =>
    request(`${GATEWAY}/api/files/`),

  upload: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${GATEWAY}/api/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  download: (id) =>
    `${GATEWAY}/api/files/download/${id}`,

  delete: (id) =>
    request(`${GATEWAY}/api/files/${id}`, { method: 'DELETE' }),
};

// ─── Notifications (/api/notifications) ──────────────────────────────────────
export const notifications = {
  list: () =>
    request(`http://localhost:3003/api/notifications`),

  markRead: (id) =>
    request(`http://localhost:3003/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    request(`http://localhost:3003/api/notifications/read-all`, { method: 'PATCH' }),
};

export { CHAT_URL, GATEWAY };
