import { useState } from 'react';
import {
  Menu, Inbox, Star, Send, FileText, AlertOctagon, Trash2,
  MessageSquare, Calendar, Folder, Settings, LogOut
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { useAuth } from '../context/AuthContext';
import { auth } from '../utils/api';

const MAIL_ITEMS = [
  { id: 'inbox',   icon: Inbox,        label: 'Inbox'  },
  { id: 'starred', icon: Star,         label: 'Starred' },
  { id: 'sent',    icon: Send,         label: 'Sent'   },
  { id: 'drafts',  icon: FileText,     label: 'Drafts' },
  { id: 'spam',    icon: AlertOctagon, label: 'Spam', dot: 'red' },
  { id: 'trash',   icon: Trash2,       label: 'Trash'  },
];

const NAV_ITEMS = [
  { id: 'chat',     icon: MessageSquare, label: 'Team Chat' },
  { id: 'calendar', icon: Calendar,      label: 'Calendar'  },
  { id: 'files',    icon: Folder,        label: 'Files'     },
];

export default function Sidebar({ active, onNavigate, unreadCount }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => { try { await auth.logout(); } catch {} logout(); };

  const allMail = MAIL_ITEMS.map(i =>
    i.id === 'inbox' ? { ...i, badge: unreadCount > 0 ? unreadCount : null } : i
  );

  const Item = ({ item }) => {
    const Icon = item.icon;
    return (
      <button
        className={`${styles.item} ${active === item.id ? styles.active : ''}`}
        onClick={() => onNavigate(item.id)}
        title={item.label}
      >
        <Icon size={16} strokeWidth={1.5} className={styles.icon} />
        {!collapsed && <span className={styles.label}>{item.label}</span>}
        {!collapsed && item.badge && <span className={styles.badge}>{item.badge}</span>}
        {!collapsed && item.dot === 'red' && <span className={styles.redDot} />}
      </button>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <button className={styles.hamburger} onClick={() => setCollapsed(v => !v)}>
        <Menu size={18} strokeWidth={1.5} color="var(--text-dim)" />
      </button>

      <div className={styles.section}>
        {!collapsed && <p className={styles.sectionLabel}>MAILBOX</p>}
        {allMail.map(item => <Item key={item.id} item={item} />)}
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        {!collapsed && <p className={styles.sectionLabel}>NAVIGATION</p>}
        {NAV_ITEMS.map(item => <Item key={item.id} item={item} />)}
      </div>

      <div className={styles.footer}>
        <button
          className={`${styles.item} ${active === 'settings' ? styles.active : ''}`}
          onClick={() => onNavigate('settings')}
          title="Settings"
        >
          <Settings size={16} strokeWidth={1.5} className={styles.icon} />
          {!collapsed && <span className={styles.label}>Settings</span>}
        </button>

        <div className={styles.profile}>
          <div className={styles.avatar}>
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className={styles.profileInfo}>
              <p className={styles.profileName}>{user?.full_name || user?.username || 'User'}</p>
              <p className={styles.profileEmail}>{user?.email || ''}</p>
            </div>
          )}
          {!collapsed && (
            <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
              <LogOut size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
