import { useState, useEffect } from 'react';
import { emails } from '../utils/api';
import styles from './InboxPage.module.css';

const FOLDER_ENDPOINTS = { inbox: 'inbox', sent: 'sent', starred: 'starred', spam: 'spam' };

export default function InboxPage({ folder = 'inbox', onUnreadChange }) {
  const [list, setList]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [composing, setComposing] = useState(false);
  const [to, setTo]             = useState('');
  const [subject, setSubject]   = useState('');
  const [body, setBody]         = useState('');
  const [sending, setSending]   = useState(false);
  const [sendErr, setSendErr]   = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [searchQ, setSearchQ]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      let data;
      if (searchQ.trim()) {
        data = await emails.search(searchQ.trim());
        setList(data.emails || []);
        setTotal(data.total || 0);
      } else if (folder === 'inbox') {
        data = await emails.inbox(page);
        setList(data.emails || []);
        setTotal(data.total || 0);
        const unread = (data.emails || []).filter(e => !e.is_read).length;
        onUnreadChange && onUnreadChange(unread);
      } else if (folder === 'sent') {
        data = await emails.sent(page);
        setList(data.emails || []);
        setTotal(data.total || 0);
      } else if (folder === 'starred') {
        data = await emails.starred();
        setList(data.emails || []);
        setTotal(data.total || 0);
      } else if (folder === 'spam') {
        data = await emails.spam();
        setList(data.emails || []);
        setTotal(data.total || 0);
      } else { setList([]); setTotal(0); }
    } catch (e) { setList([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [folder, page, searchQ]);

  const openEmail = async (email) => {
    setSelected(email);
    if (!email.is_read && folder === 'inbox') {
      try { await emails.markRead(email.id); setList(l => l.map(e => e.id===email.id ? {...e, is_read:true} : e)); } catch {}
    }
  };

  const toggleStar = async (e, id) => {
    e.stopPropagation();
    try { await emails.toggleStar(id); setList(l => l.map(em => em.id===id ? {...em, is_starred:!em.is_starred} : em)); } catch {}
  };

  const deleteEmail = async (id) => {
    try { await emails.delete(id); setList(l => l.filter(e => e.id!==id)); if (selected?.id===id) setSelected(null); } catch {}
  };

  const sendEmail = async (e) => {
    e.preventDefault(); setSending(true); setSendErr('');
    try { await emails.send(to, subject, body); setComposing(false); setTo(''); setSubject(''); setBody(''); load(); }
    catch (err) { setSendErr(err.message); }
    finally { setSending(false); }
  };

  const fmt = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    return d.toLocaleDateString([], {month:'short',day:'numeric'});
  };

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Search emails..." value={searchQ} onChange={e=>{setSearchQ(e.target.value);setPage(1);}} />
        <button className="btn" onClick={() => setComposing(true)}>Compose</button>
      </div>

      <div className={styles.split}>
        {/* Email list */}
        <div className={styles.list}>
          {loading && <div className={styles.empty}><span className="spinner" /></div>}
          {!loading && list.length === 0 && <div className={styles.empty}>No emails found</div>}
          {list.map(email => (
            <div key={email.id} className={`${styles.emailRow} ${selected?.id===email.id?styles.selected:''} ${!email.is_read?styles.unread:''}`}
              onClick={() => openEmail(email)}>
              <div className={styles.emailSender}>{email.sender_email || email.recipient_email}</div>
              <div className={styles.emailSubject}>{email.subject}</div>
              <div className={styles.emailMeta}>
                <span className={styles.emailDate}>{fmt(email.created_at)}</span>
                <button className={styles.starBtn} onClick={e => toggleStar(e, email.id)}>
                  {email.is_starred ? '⭐' : '☆'}
                </button>
              </div>
            </div>
          ))}
          {total > 20 && (
            <div className={styles.pagination}>
              <button className="btn btn-ghost" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}>←</button>
              <span style={{color:'var(--text-dim)',fontSize:11}}>{page} / {Math.ceil(total/20)}</span>
              <button className="btn btn-ghost" onClick={() => setPage(p=>p+1)} disabled={page*20>=total}>→</button>
            </div>
          )}
        </div>

        {/* Reading pane */}
        <div className={styles.pane}>
          {!selected && <div className={styles.empty} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>Select an email to read</div>}
          {selected && (
            <div className={styles.emailDetail}>
              <div className={styles.detailHeader}>
                <h2 className={styles.detailSubject}>{selected.subject}</h2>
                <div className={styles.detailMeta}>
                  <span>From: <strong>{selected.sender_email}</strong></span>
                  <span>To: <strong>{selected.recipient_email}</strong></span>
                  <span>{new Date(selected.created_at).toLocaleString()}</span>
                </div>
                <div className={styles.detailActions}>
                  <button className="btn" onClick={() => { setComposing(true); setTo(selected.sender_email); setSubject(`Re: ${selected.subject}`); }}>Reply</button>
                  <button className="btn btn-ghost" onClick={() => { setComposing(true); setSubject(`Fwd: ${selected.subject}`); setBody(`\n\n--- Forwarded ---\n${selected.body}`); }}>Forward</button>
                  <button className="btn btn-ghost" onClick={() => toggleStar({stopPropagation:()=>{}}, selected.id)}>{selected.is_starred?'Unstar':'Star'}</button>
                  <button className="btn btn-danger" onClick={() => deleteEmail(selected.id)}>Delete</button>
                </div>
              </div>
              <div className={styles.detailBody}>{selected.body}</div>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composing && (
        <div className={styles.modalOverlay} onClick={e=>e.target===e.currentTarget&&setComposing(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>New Message</span>
              <button onClick={() => setComposing(false)}>✕</button>
            </div>
            <form onSubmit={sendEmail} className={styles.composeForm}>
              <input placeholder="To" value={to} onChange={e=>setTo(e.target.value)} required type="email" />
              <input placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} required />
              <textarea placeholder="Message..." value={body} onChange={e=>setBody(e.target.value)} required rows={8} />
              {sendErr && <p style={{color:'var(--red)',fontSize:11}}>{sendErr}</p>}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-ghost" onClick={() => setComposing(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={sending}>{sending?<span className="spinner"/>:'Send'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
