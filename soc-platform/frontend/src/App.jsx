import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import AlertsPage from './pages/AlertsPage';
import LogsPage from './pages/LogsPage';
import { LayoutDashboard, ShieldAlert, ScrollText, Radio } from 'lucide-react';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'alerts',    label: 'Alerts',     Icon: ShieldAlert      },
  { id: 'logs',      label: 'Logs',       Icon: ScrollText       },
];

export default function App() {
  const [page, setPage] = useState('dashboard');

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <aside style={{width:200,background:'var(--bg-panel)',borderRight:'1px solid var(--border-dim)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'20px 16px 16px',borderBottom:'1px solid var(--border-dim)'}}>
          <p style={{color:'var(--green)',fontWeight:700,fontSize:16,letterSpacing:'0.1em',fontFamily:'var(--font-ui)'}}>WeMail SOC</p>
          <p style={{color:'var(--text-faint)',fontSize:10,marginTop:2,letterSpacing:'0.08em'}}>SECURITY OPERATIONS</p>
        </div>
        <nav style={{padding:'8px 0',flex:1}}>
          {NAV.map(({id, label, Icon}) => (
            <button key={id} onClick={() => setPage(id)}
              style={{width:'100%',padding:'10px 16px',textAlign:'left',fontSize:12,
                display:'flex',alignItems:'center',gap:10,
                color: page===id ? 'var(--green)' : 'var(--text-dim)',
                background: page===id ? 'var(--green-glow)' : 'none',
                borderLeft: page===id ? '2px solid var(--green)' : '2px solid transparent',
                transition:'all 0.15s',border:'none',cursor:'pointer',fontFamily:'var(--font)'}}>
              <Icon size={15} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </nav>
        <div style={{padding:'12px 16px',borderTop:'1px solid var(--border-dim)'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <Radio size={12} color="var(--green)" />
            <span style={{fontSize:10,color:'var(--text-dim)',letterSpacing:'0.08em'}}>MONITORING LIVE</span>
          </div>
        </div>
      </aside>

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
