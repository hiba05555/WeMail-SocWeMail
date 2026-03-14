import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SOC = 'http://localhost:8888';
const COLORS = { critical:'#e96e6e', high:'#e9c96e', medium:'#6eaee9', low:'#6EE96E' };
const RULE_LABELS = {
  brute_force:'Brute Force', sql_injection:'SQL Injection', xss:'XSS',
  mass_registration:'Mass Reg.', large_file_upload:'Large Upload',
  path_traversal:'Path Traversal', cmd_injection:'Cmd Injection'
};

export default function Dashboard() {
  const [stats,  setStats]  = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, a] = await Promise.all([
        fetch(`${SOC}/api/stats`).then(r=>r.json()),
        fetch(`${SOC}/api/alerts?limit=5`).then(r=>r.json()),
      ]);
      setStats(s);
      setAlerts(a.alerts || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span className="spinner"/></div>;

  const ruleData = Object.entries(stats?.by_rule || {}).map(([k,v]) => ({ name: RULE_LABELS[k]||k, count: v }));
  const severityData = [
    { name: 'Critical', value: stats?.critical || 0, color: '#e96e6e' },
    { name: 'High',     value: stats?.high || 0,     color: '#e9c96e' },
  ];

  return (
    <div style={{padding:20,overflow:'auto',height:'100%',display:'flex',flexDirection:'column',gap:16}}>
      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[
          { label:'Total Logs',    value: stats?.total_logs   || 0, color:'var(--green)' },
          { label:'Total Alerts',  value: stats?.total_alerts || 0, color:'var(--amber)'  },
          { label:'Critical',      value: stats?.critical     || 0, color:'var(--red)'    },
          { label:'High',          value: stats?.high         || 0, color:'#e9c96e'       },
        ].map(s => (
          <div key={s.label} style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'var(--radius)',padding:'16px 18px',borderTop:`2px solid ${s.color}`}}>
            <p style={{fontSize:10,color:'var(--text-dim)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8}}>{s.label}</p>
            <p style={{fontSize:28,fontWeight:700,color:s.color,fontFamily:'var(--font-ui)'}}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,flex:1,minHeight:0}}>
        {/* Bar chart - alerts by rule */}
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'var(--radius)',padding:16}}>
          <p style={{fontSize:11,color:'var(--text-dim)',letterSpacing:'0.08em',marginBottom:12,textTransform:'uppercase'}}>Alerts by Rule</p>
          {ruleData.length === 0
            ? <p style={{color:'var(--text-faint)',fontSize:11,textAlign:'center',marginTop:40}}>No alerts yet</p>
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ruleData} margin={{left:-20}}>
                  <XAxis dataKey="name" tick={{fill:'var(--text-dim)',fontSize:9}} />
                  <YAxis tick={{fill:'var(--text-dim)',fontSize:9}} />
                  <Tooltip contentStyle={{background:'var(--bg-panel)',border:'1px solid var(--border)',fontSize:11}} />
                  <Bar dataKey="count" fill="var(--green-dim)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Pie chart - severity */}
        <div style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'var(--radius)',padding:16}}>
          <p style={{fontSize:11,color:'var(--text-dim)',letterSpacing:'0.08em',marginBottom:12,textTransform:'uppercase'}}>Severity</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                {severityData.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{background:'var(--bg-panel)',border:'1px solid var(--border)',fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent alerts */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border-dim)',borderRadius:'var(--radius)',padding:16}}>
        <p style={{fontSize:11,color:'var(--text-dim)',letterSpacing:'0.08em',marginBottom:12,textTransform:'uppercase'}}>Recent Alerts</p>
        {alerts.length === 0 && <p style={{color:'var(--text-faint)',fontSize:11}}>No alerts yet — system is clean ✅</p>}
        {alerts.map((a,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border-dim)'}}>
            <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,background:COLORS[a.severity]+'22',color:COLORS[a.severity],flexShrink:0}}>{a.severity?.toUpperCase()}</span>
            <span style={{fontSize:11,color:'var(--text-dim)',flexShrink:0,minWidth:100}}>{RULE_LABELS[a.rule]||a.rule}</span>
            <span style={{fontSize:11,color:'var(--text)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.message}</span>
            <span style={{fontSize:10,color:'var(--text-faint)',flexShrink:0}}>{new Date(a.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
