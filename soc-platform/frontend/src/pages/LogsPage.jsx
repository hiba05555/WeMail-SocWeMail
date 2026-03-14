import { useState, useEffect } from 'react';
const SOC = 'http://localhost:8888';
const SERVICE_COLORS = { auth:'var(--green)', email:'var(--blue)', files:'var(--amber)', chat:'var(--purple)', calendar:'#6ee9d4' };

export default function LogsPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState('');

  const load = async () => {
    try {
      const url = service ? `${SOC}/api/logs?limit=100&service=${service}` : `${SOC}/api/logs?limit=100`;
      const data = await fetch(url).then(r=>r.json());
      setLogs(data.logs || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [service]);

  const services = ['','auth','email','files','chat','calendar'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border-dim)',display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
        <span style={{fontSize:11,color:'var(--text-dim)'}}>Service:</span>
        {services.map(s => (
          <button key={s} onClick={() => setService(s)}
            style={{padding:'4px 12px',borderRadius:10,fontSize:10,
              border:`1px solid ${s?(SERVICE_COLORS[s]+'66'):'var(--border-dim)'}`,
              background: service===s ? (s?SERVICE_COLORS[s]+'22':'var(--green-glow)') : 'none',
              color: service===s ? (s?SERVICE_COLORS[s]:'var(--green)') : 'var(--text-dim)',
              cursor:'pointer',transition:'all 0.15s'}}>
            {s.toUpperCase() || 'ALL'}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:10,color:'var(--text-dim)'}}>{logs.length} logs — auto-refresh 5s</span>
      </div>

      <div style={{flex:1,overflow:'auto',fontFamily:'var(--font-ui)',fontSize:11}}>
        {loading && <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:40}}><span className="spinner"/></div>}
        {!loading && logs.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--text-faint)',fontSize:12}}>No logs yet</div>}
        {logs.map((log,i) => (
          <div key={i} style={{display:'flex',gap:12,padding:'8px 16px',borderBottom:'1px solid var(--border-dim)',
            alignItems:'flex-start',transition:'background 0.1s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
            onMouseLeave={e=>e.currentTarget.style.background='none'}>
            <span style={{color:'var(--text-faint)',whiteSpace:'nowrap',fontSize:10,paddingTop:1}}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span style={{padding:'1px 8px',borderRadius:10,fontSize:9,fontWeight:700,flexShrink:0,
              background:(SERVICE_COLORS[log.service]||'var(--green)')+'22',
              color:SERVICE_COLORS[log.service]||'var(--green)'}}>
              {log.service?.toUpperCase()}
            </span>
            <span style={{color:'var(--amber)',flexShrink:0,minWidth:120}}>{log.event_type}</span>
            <span style={{color:'var(--text-dim)',flexShrink:0}}>{log.ip||'—'}</span>
            <span style={{color:'var(--text)',flex:1}}>{log.email||''}</span>
            {log.details && Object.keys(log.details).length > 0 && (
              <span style={{color:'var(--text-faint)',fontSize:10,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {JSON.stringify(log.details)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
