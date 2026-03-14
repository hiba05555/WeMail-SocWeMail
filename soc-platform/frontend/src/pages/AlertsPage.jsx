import { useState, useEffect } from 'react';
const SOC = 'http://localhost:8888';
const COLORS = { critical:'#e96e6e', high:'#e9c96e', medium:'#6eaee9', low:'#6EE96E' };
const RULE_LABELS = {
  brute_force:'Brute Force', sql_injection:'SQL Injection', xss:'XSS',
  mass_registration:'Mass Registration', large_file_upload:'Large File Upload',
  path_traversal:'Path Traversal', cmd_injection:'Command Injection'
};

export default function AlertsPage() {
  const [alerts, setAlerts]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [severity, setSeverity] = useState('');

  const load = async () => {
    try {
      const url = severity ? `${SOC}/api/alerts?limit=100&severity=${severity}` : `${SOC}/api/alerts?limit=100`;
      const data = await fetch(url).then(r=>r.json());
      setAlerts(data.alerts || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [severity]);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Filters */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border-dim)',display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
        <span style={{fontSize:11,color:'var(--text-dim)'}}>Filter:</span>
        {['','critical','high','medium','low'].map(s => (
          <button key={s} onClick={() => setSeverity(s)}
            style={{padding:'4px 12px',borderRadius:10,fontSize:10,border:`1px solid ${s?(COLORS[s]+'66'):'var(--border-dim)'}`,
              background: severity===s ? (s?COLORS[s]+'22':'var(--green-glow)') : 'none',
              color: severity===s ? (s?COLORS[s]:'var(--green)') : 'var(--text-dim)',
              cursor:'pointer',transition:'all 0.15s'}}>
            {s || 'ALL'}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:10,color:'var(--text-dim)'}}>{alerts.length} alerts</span>
      </div>

      {/* Table */}
      <div style={{flex:1,overflow:'auto'}}>
        {loading && <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:40}}><span className="spinner"/></div>}
        {!loading && alerts.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--text-faint)',fontSize:12}}>No alerts found ✅</div>}
        {!loading && alerts.length > 0 && (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--bg-panel)'}}>
                {['Severity','Rule','Message','IP','Email','Time'].map(h => (
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:10,color:'var(--text-faint)',
                    letterSpacing:'0.08em',textTransform:'uppercase',borderBottom:'1px solid var(--border-dim)',
                    position:'sticky',top:0,background:'var(--bg-panel)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a,i) => (
                <tr key={i} style={{borderBottom:'1px solid var(--border-dim)',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,
                      background:COLORS[a.severity]+'22',color:COLORS[a.severity]}}>
                      {a.severity?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'var(--amber)'}}>{RULE_LABELS[a.rule]||a.rule}</td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'var(--text)',maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.message}</td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'var(--text-dim)',fontFamily:'var(--font-ui)'}}>{a.ip||'—'}</td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'var(--text-dim)'}}>{a.email||'—'}</td>
                  <td style={{padding:'10px 14px',fontSize:10,color:'var(--text-faint)',whiteSpace:'nowrap'}}>{new Date(a.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
