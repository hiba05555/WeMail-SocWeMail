import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { chat, getToken, getUser, CHAT_URL } from '../utils/api';
import styles from './ChatPage.module.css';

const TEAM = [
  { name: 'Saad',   email: 'saad@wemail.io',   role: 'API Gateway' },
  { name: 'Ismail', email: 'ismail@wemail.io', role: 'Auth Service' },
  { name: 'Hiba',   email: 'hiba@wemail.io',   role: 'Email Service' },
  { name: 'Wiam',   email: 'wiam@wemail.io',   role: 'Chat & Calendar' },
  { name: 'Malika', email: 'malika@wemail.io', role: 'Files & Notifs' },
];

export default function ChatPage() {
  const [contacts]   = useState(TEAM);
  const [active, setActive]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [typing, setTyping]     = useState(false);
  const [online, setOnline]     = useState([]);
  const [connected, setConn]    = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const me = getUser();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = io(CHAT_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setConn(true));
    socket.on('disconnect', () => setConn(false));
    socket.on('users:online', (ids) => setOnline(ids));
    socket.on('message:new', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('messages:history', (msgs) => setMessages(msgs));
    socket.on('typing:start', ({ email }) => { if (email !== me?.email) setTyping(true); });
    socket.on('typing:stop', ({ email }) => { if (email !== me?.email) setTyping(false); });
    return () => socket.disconnect();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const joinRoom = (contact) => {
    setActive(contact);
    setMessages([]);
    setTyping(false);
    const roomId = [me?.email, contact.email].sort().join('::');
    socketRef.current?.emit('room:join', { roomId });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !active || !socketRef.current) return;
    const roomId = [me?.email, active.email].sort().join('::');
    socketRef.current.emit('message:send', { roomId, content: input.trim(), recipientEmail: active.email });
    socketRef.current.emit('typing:stop', { roomId });
    setInput('');
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!active || !socketRef.current) return;
    const roomId = [me?.email, active.email].sort().join('::');
    socketRef.current.emit('typing:start', { roomId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit('typing:stop', { roomId }), 1500);
  };

  const fmt = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isOnline = (email) => {
    // online contains user IDs, we use email as fallback check
    return connected; // simplified: show as online when socket connected
  };

  return (
    <div className={styles.root}>
      {/* Contacts */}
      <div className={styles.contacts}>
        <div className={styles.contactsHeader}>
          <span>Team</span>
          <span className={`${styles.connDot} ${connected ? styles.green : styles.red}`} />
        </div>
        {contacts.filter(c => c.email !== me?.email).map(c => (
          <button key={c.email} className={`${styles.contact} ${active?.email===c.email?styles.activeContact:''}`}
            onClick={() => joinRoom(c)}>
            <div className={styles.avatar}>{c.name[0]}</div>
            <div className={styles.contactInfo}>
              <p className={styles.contactName}>{c.name}</p>
              <p className={styles.contactRole}>{c.role}</p>
            </div>
            <span className={connected ? 'dot-online' : 'dot-offline'} />
          </button>
        ))}
      </div>

      {/* Chat pane */}
      <div className={styles.chatPane}>
        {!active && (
          <div className={styles.empty}>Select a teammate to start chatting</div>
        )}
        {active && (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.avatar}>{active.name[0]}</div>
              <div>
                <p className={styles.chatHeaderName}>{active.name}</p>
                <p className={styles.chatHeaderRole}>{active.role}</p>
              </div>
            </div>
            <div className={styles.messages}>
              {messages.length === 0 && <div className={styles.noMessages}>No messages yet. Say hi!</div>}
              {messages.map((msg, i) => {
                const isMine = msg.senderEmail === me?.email;
                return (
                  <div key={msg._id || i} className={`${styles.message} ${isMine ? styles.mine : styles.theirs}`}>
                    {!isMine && <div className={styles.msgAvatar}>{msg.senderName?.[0]?.toUpperCase()}</div>}
                    <div className={styles.msgBubble}>
                      <p className={styles.msgContent}>{msg.content}</p>
                      <p className={styles.msgTime}>{fmt(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className={`${styles.message} ${styles.theirs}`}>
                  <div className={styles.msgAvatar}>{active.name[0]}</div>
                  <div className={styles.msgBubble}><p className={styles.typingDots}><span/><span/><span/></p></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <form className={styles.inputBar} onSubmit={sendMessage}>
              <input value={input} onChange={handleTyping} placeholder={`Message ${active.name}...`} className={styles.msgInput} />
              <button type="submit" className="btn" disabled={!input.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
