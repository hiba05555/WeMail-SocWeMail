import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import AlertsPage from './pages/AlertsPage';
import LogsPage from './pages/LogsPage';

const NAV = [
  { id: 'dashboard', label: '⬡ Dashboard' },
  { id: 'alerts',    label: '🚨 Alerts'    },
  { id: 'logs',      label: '📋 Logs'      },
];

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      {/* Sidebar */}
      <aside style={{width:200,background:'var(--bg-panel)',borderRight:'1px solid var(--border-dim)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'20px 16px 16px',borderBottom:'1px solid var(--border-dim)'}}>
          <p style={{color:'var(--green)',fontWeight:700,fontSize:16,letterSpacing:'0.1em'}}>WeMail SOC</p>
          <p style={{color:'var(--text-faint)',fontSize:10,marginTop:2,letterSpacing:'0.08em'}}>SECURITY OPERATIONS</p>
        </div>
        <nav style={{padding:'8px 0',flex:1}}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{width:'100%',padding:'10px 16px',textAlign:'left',fontSize:12,
                color: page===n.id ? 'var(--green)' : 'var(--text-dim)',
                background: page===n.id ? 'var(--green-glow)' : 'none',
                borderLeft: page===n.id ? '2px solid var(--green)' : '2px solid transparent',
                transition:'all 0.15s'}}>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{padding:'12px 16px',borderTop:'1px solid var(--border-dim)'}}>
          <LiveIndicator />
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'10px 20px',borderBottom:'1px solid var(--border-dim)',background:'var(--bg-panel)',display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:13,fontWeight:700,color:'var(--text)',letterSpacing:'0.06em',textTransform:'uppercase'}}>
            {NAV.find(n=>n.id===page)?.label}
          </span>
          <span style={{marginLeft:'auto',fontSize:10,color:'var(--text-dim)'}}>{new Date().toLocaleString()}</span>
        </div>
        <div style={{flex:1,overflow:'hidden'}}>
          {page === 'dashboard' && <Dashboard />}
          {page === 'alerts'    && <AlertsPage />}
          {page === 'logs'      && <LogsPage />}
        </div>
      </main>
    </div>
  );
}

function LiveIndicator() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <span style={{width:7,height:7,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 6px var(--green)',animation:'pulse 2s infinite'}} />
      <span style={{fontSize:10,color:'var(--text-dim)',letterSpacing:'0.08em'}}>MONITORING LIVE</span>
    </div>
  );
}
