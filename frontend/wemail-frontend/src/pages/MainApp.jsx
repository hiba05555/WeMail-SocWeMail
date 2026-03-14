import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import InboxPage from './InboxPage';
import ChatPage from './ChatPage';
import CalendarPage from './CalendarPage';
import FilesPage from './FilesPage';
import styles from './MainApp.module.css';

const PAGE_TITLES = {
  inbox:'Inbox', starred:'Starred', sent:'Sent', drafts:'Drafts', spam:'Spam', trash:'Trash',
  chat:'Team Chat', calendar:'Calendar', files:'Files', settings:'Settings',
};

export default function MainApp() {
  const [page, setPage]         = useState('inbox');
  const [unreadCount, setUnread] = useState(0);

  const renderPage = () => {
    if (['inbox','sent','starred','spam','drafts','trash'].includes(page))
      return <InboxPage folder={page} onUnreadChange={setUnread} />;
    if (page === 'chat')     return <ChatPage />;
    if (page === 'calendar') return <CalendarPage />;
    if (page === 'files')    return <FilesPage />;
    if (page === 'settings') return <SettingsPage />;
    return null;
  };

  return (
    <div className={styles.root}>
      <Sidebar active={page} onNavigate={setPage} unreadCount={unreadCount} />
      <div className={styles.main}>
        <div className={styles.topbar}>
          <h1 className={styles.pageTitle}>{PAGE_TITLES[page] || page}</h1>
          <div className={styles.topbarRight}>
            <span className={styles.statusPill}>● LIVE</span>
          </div>
        </div>
        <div className={styles.content}>{renderPage()}</div>
      </div>
    </div>
  );
}

function SettingsPage() {
  return (
    <div style={{padding:32,color:'var(--text-dim)',fontSize:13}}>
      <p style={{color:'var(--text)',fontSize:16,marginBottom:12}}>Settings</p>
      <p>API Gateway: <code style={{color:'var(--green)'}}>http://localhost:8080</code></p>
      <p style={{marginTop:8}}>Chat Service: <code style={{color:'var(--green)'}}>http://localhost:3001</code></p>
      <p style={{marginTop:8}}>Auth: JWT — stored in localStorage</p>
    </div>
  );
}
