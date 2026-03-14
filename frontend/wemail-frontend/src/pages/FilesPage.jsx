import { useState, useEffect, useRef } from 'react';
import { files, getToken, GATEWAY } from '../utils/api';
import styles from './FilesPage.module.css';

const ICONS = { 'image/':'🖼', 'application/pdf':'📄', 'text/':'📝', 'video/':'🎬', 'audio/':'🎵', default:'📎' };
const getIcon = (type='') => { for (const [k,v] of Object.entries(ICONS)) if (type.startsWith(k)) return v; return ICONS.default; };
const fmtSize = (b) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(1)}KB` : `${(b/1048576).toFixed(1)}MB`;

export default function FilesPage() {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUpl]   = useState(false);
  const [view, setView]       = useState('grid');
  const [err, setErr]         = useState('');
  const fileInput = useRef(null);

  const load = async () => {
    setLoading(true);
    try { const data = await files.list(); setList(data.files || []); }
    catch { setList([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpl(true); setErr('');
    try { await files.upload(file); load(); }
    catch (ex) { setErr(ex.message); }
    finally { setUpl(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  const handleDownload = async (id, filename) => {
    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY}/api/files/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (ex) { setErr(ex.message); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try { await files.delete(id); setList(l => l.filter(f => f.id !== id)); }
    catch (ex) { setErr(ex.message); }
  };

  const totalBytes = list.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const usedGB = (totalBytes / 1e9).toFixed(2);
  const pct = Math.min(100, (totalBytes / (10 * 1e9)) * 100);
  const fmt = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button className="btn" onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? <span className="spinner" /> : 'Upload'}
        </button>
        <input ref={fileInput} type="file" style={{display:'none'}} onChange={handleUpload} />
        <div className={styles.spacer} />
        <button className={`${styles.viewBtn} ${view==='grid'?styles.activeView:''}`} onClick={() => setView('grid')}>⊞</button>
        <button className={`${styles.viewBtn} ${view==='list'?styles.activeView:''}`} onClick={() => setView('list')}>☰</button>
        <div className={styles.storageBar}>
          <div className={styles.storageTrack}><div className={styles.storageFill} style={{width:`${pct}%`}} /></div>
          <span className={styles.storageLabel}>{usedGB}GB / 10GB</span>
        </div>
      </div>

      {err && <p style={{color:'var(--red)',fontSize:11,padding:'8px 16px'}}>{err}</p>}

      {loading && <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}><span className="spinner" /></div>}

      {!loading && list.length === 0 && (
        <div className={styles.empty}>
          <p>No files yet.</p>
          <button className="btn" onClick={() => fileInput.current?.click()}>Upload your first file</button>
        </div>
      )}

      {!loading && list.length > 0 && view === 'grid' && (
        <div className={styles.grid}>
          {list.map(f => (
            <div key={f.id} className={styles.gridCard}>
              <div className={styles.cardIcon}>{getIcon(f.content_type)}</div>
              <p className={styles.cardName} title={f.filename}>{f.filename}</p>
              <p className={styles.cardMeta}>{fmtSize(f.file_size)}</p>
              <div className={styles.cardActions}>
                <button className="btn btn-ghost" style={{fontSize:10,padding:'4px 8px'}} onClick={() => handleDownload(f.id, f.filename)}>↓</button>
                <button className="btn btn-danger" style={{fontSize:10,padding:'4px 8px'}} onClick={() => handleDelete(f.id, f.filename)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && list.length > 0 && view === 'list' && (
        <table className={styles.table}>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Size</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map(f => (
              <tr key={f.id}>
                <td><span className={styles.fileIcon}>{getIcon(f.content_type)}</span>{f.filename}</td>
                <td>{f.content_type?.split('/')[1] || '—'}</td>
                <td>{fmtSize(f.file_size)}</td>
                <td>{fmt(f.created_at)}</td>
                <td>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-ghost" style={{fontSize:10,padding:'3px 8px'}} onClick={() => handleDownload(f.id, f.filename)}>↓</button>
                    <button className="btn btn-danger" style={{fontSize:10,padding:'3px 8px'}} onClick={() => handleDelete(f.id, f.filename)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
