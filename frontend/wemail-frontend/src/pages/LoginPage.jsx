import { useState, useEffect, useRef } from 'react';
import { auth, setAuth } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

function Constellation() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });
  const nodes = useRef([]);
  const animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    const spawn = (x, y, burst = false) => {
      const count = burst ? 8 : 1;
      for (let i = 0; i < count; i++) {
        const angle = burst ? (Math.PI * 2 * i) / count : Math.random() * Math.PI * 2;
        const speed = burst ? 1.5 + Math.random() * 2 : 0.2 + Math.random() * 0.4;
        nodes.current.push({ x: x ?? Math.random() * W, y: y ?? Math.random() * H, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: burst ? 1.5 + Math.random() * 2 : 1 + Math.random() * 2, life: burst ? 0.8 + Math.random() * 0.5 : Infinity, age: 0 });
      }
    };
    for (let i = 0; i < 80; i++) spawn();
    const handleMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const handleClick = (e) => spawn(e.clientX, e.clientY, true);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('click', handleClick);
    const CONNECT_DIST = 120, FLEE_DIST = 90;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      nodes.current = nodes.current.filter(n => { if (n.life !== Infinity) { n.age += 0.016; if (n.age >= n.life) return false; } return true; });
      for (const n of nodes.current) {
        const dx = n.x - mouse.current.x, dy = n.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < FLEE_DIST && dist > 0) { const force = (FLEE_DIST - dist) / FLEE_DIST * 0.3; n.vx += (dx / dist) * force; n.vy += (dy / dist) * force; }
        n.vx *= 0.98; n.vy *= 0.98; n.x += n.vx; n.y += n.vy;
        if (n.life === Infinity) { if (n.x < 0) n.x = W; if (n.x > W) n.x = 0; if (n.y < 0) n.y = H; if (n.y > H) n.y = 0; }
      }
      for (let i = 0; i < nodes.current.length; i++) {
        const a = nodes.current[i];
        for (let j = i + 1; j < nodes.current.length; j++) {
          const b = nodes.current[j];
          const d = Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2);
          if (d < CONNECT_DIST) { ctx.strokeStyle = `rgba(110,233,110,${(1-d/CONNECT_DIST)*0.4})`; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
        }
        const cd = Math.sqrt((a.x-mouse.current.x)**2+(a.y-mouse.current.y)**2);
        if (cd < CONNECT_DIST*1.5) { ctx.strokeStyle=`rgba(110,233,110,${(1-cd/(CONNECT_DIST*1.5))*0.6})`; ctx.lineWidth=0.8; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(mouse.current.x,mouse.current.y); ctx.stroke(); }
        const la = a.life!==Infinity ? Math.min(1,a.age/0.3)*Math.min(1,(a.life-a.age)/0.3) : 1;
        ctx.fillStyle=`rgba(110,233,110,${0.7*la})`; ctx.beginPath(); ctx.arc(a.x,a.y,a.size,0,Math.PI*2); ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize',resize); window.removeEventListener('mousemove',handleMove); window.removeEventListener('click',handleClick); cancelAnimationFrame(animRef.current); };
  }, []);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0}} />;
}

function Clock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => { const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000); return () => clearInterval(t); }, []);
  return <div style={{position:'fixed',top:16,right:20,zIndex:20,fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-dim)',letterSpacing:'0.1em'}}>{time}</div>;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPass] = useState('');
  const [username, setUser] = useState('');
  const [fullName, setFull] = useState('');
  const [showPass, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [matrix, setMatrix] = useState(false);
  const [tagline, setTagline] = useState('');
  const [success, setSuccess] = useState('');

  const TAGLINE = 'secure enterprise platform.';
  useEffect(() => { let i=0; const t=setInterval(()=>{setTagline(TAGLINE.slice(0,++i));if(i>=TAGLINE.length)clearInterval(t);},60); return()=>clearInterval(t); },[]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        const data = await auth.login(email, password);
        setMatrix(true);
        setTimeout(() => { setAuth(data.access_token, data.user); login(data.access_token, data.user); }, 1800);
      } else {
        await auth.register(email, username, fullName, password);
        setSuccess('Account created! Sign in now.'); setMode('login'); setEmail(email); setPass(''); setUser(''); setFull('');
      }
    } catch (err) {
      setError(err.message); setShake(true); setTimeout(() => setShake(false), 600);
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.root}>
      <Constellation />
      {matrix && <div className={styles.matrixOverlay} />}
      <Clock />
      <div className={styles.watermark}>WeMail v1.0 — SOC Protected</div>
      <div className={styles.pills}>
        {['end-to-end encrypted','SOC protected','enterprise grade'].map(p=><span key={p} className={styles.pill}>{p}</span>)}
      </div>
      <div className={`${styles.card} ${shake?styles.shake:''}`} style={{zIndex:10}}>
        <div className={styles.cardAccent} />
        <div className={styles.logo}>WeMail</div>
        <p className={styles.tagline}>{tagline}<span className={styles.cursor}>|</span></p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {mode==='register' && <>
            <input type="text" placeholder="Full name" value={fullName} onChange={e=>setFull(e.target.value)} required />
            <input type="text" placeholder="Username" value={username} onChange={e=>setUser(e.target.value)} required />
          </>}
          <input type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required
            style={{borderColor:email&&!email.includes('@')?'var(--red)':email?'var(--green-dim)':''}} />
          <div className={styles.passWrap}>
            <input type={showPass?'text':'password'} placeholder="Password" value={password} onChange={e=>setPass(e.target.value)} required
              style={{flex:1,borderColor:password.length>0&&password.length<4?'var(--red)':password.length>=4?'var(--green-dim)':''}} />
            <button type="button" className={styles.eyeBtn} onClick={()=>setShow(v=>!v)}>{showPass?'🙈':'👁'}</button>
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
          {success && <p className={styles.successMsg}>{success}</p>}
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className="spinner" /> : (mode==='login'?'[ SIGN IN ]':'[ CREATE ACCOUNT ]')}
          </button>
        </form>
        <p className={styles.toggle}>
          {mode==='login'?"Don't have an account? ":"Already have an account? "}
          <button onClick={()=>{setMode(m=>m==='login'?'register':'login');setError('');setSuccess('');}}>
            {mode==='login'?'Register':'Sign in'}
          </button>
        </p>
      </div>
      <div className={styles.scanlines} />
    </div>
  );
}
