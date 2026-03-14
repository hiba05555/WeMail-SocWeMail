import { useState, useEffect } from 'react';
import { calendar } from '../utils/api';
import styles from './CalendarPage.module.css';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function CalendarPage() {
  const today = new Date();
  const [year,  setYear]   = useState(today.getFullYear());
  const [month, setMonth]  = useState(today.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', start_time:'', end_time:'', color:'#6EE96E', is_all_day:false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    try { const data = await calendar.events(month, year); setEvents(data.events || []); }
    catch { setEvents([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (day) => {
    if (!day) return [];
    return events.filter(e => {
      const d = new Date(e.start_time);
      return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day;
    });
  };

  const isToday = (day) => day && year===today.getFullYear() && month===today.getMonth()+1 && day===today.getDate();

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);} else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);} else setMonth(m=>m+1); };

  const openForm = (day) => {
    if (!day) return;
    setSelectedDay(day);
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setForm({ title:'', description:'', start_time:`${dateStr}T09:00`, end_time:`${dateStr}T10:00`, color:'#6EE96E', is_all_day:false });
    setErr(''); setShowForm(true);
  };

  const saveEvent = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      await calendar.create(form);
      setShowForm(false); load();
    } catch (ex) { setErr(ex.message); }
    finally { setSaving(false); }
  };

  const deleteEvent = async (id) => {
    try { await calendar.delete(id); load(); } catch {}
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={prevMonth}>←</button>
        <h2 className={styles.monthTitle}>{MONTHS[month-1]} {year}</h2>
        <button className="btn btn-ghost" onClick={nextMonth}>→</button>
        <button className="btn" style={{marginLeft:'auto'}} onClick={() => openForm(today.getDate())}>+ Event</button>
      </div>

      {/* Day headers */}
      <div className={styles.dayHeaders}>
        {DAYS.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}
      </div>

      {/* Grid */}
      {loading ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}><span className="spinner"/></div> : (
        <div className={styles.grid}>
          {cells.map((day, i) => {
            const dayEvents = getEventsForDay(day);
            return (
              <div key={i} className={`${styles.cell} ${!day?styles.empty:''} ${isToday(day)?styles.today:''}`}
                onClick={() => day && openForm(day)}>
                {day && <span className={styles.dayNum}>{day}</span>}
                {dayEvents.map(ev => (
                  <div key={ev.id} className={styles.eventChip}
                    style={{borderLeftColor: ev.color || 'var(--green)'}}
                    onClick={e => { e.stopPropagation(); if(window.confirm(`Delete "${ev.title}"?`)) deleteEvent(ev.id); }}>
                    {ev.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming sidebar */}
      <UpcomingSidebar events={events} month={month} year={year} />

      {/* New event modal */}
      {showForm && (
        <div className={styles.overlay} onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span>New Event — {MONTHS[month-1]} {selectedDay}</span>
              <button onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={saveEvent} className={styles.form}>
              <input placeholder="Event title *" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
              <textarea placeholder="Description (optional)" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} />
              <div className={styles.row}>
                <div><label>Start</label><input type="datetime-local" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))} required /></div>
                <div><label>End</label><input type="datetime-local" value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))} required /></div>
              </div>
              <div className={styles.row} style={{alignItems:'center',gap:12}}>
                <label style={{fontSize:11,color:'var(--text-dim)'}}>Color</label>
                <input type="color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{width:36,height:28,padding:2,cursor:'pointer'}} />
                <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--text-dim)',cursor:'pointer'}}>
                  <input type="checkbox" checked={form.is_all_day} onChange={e=>setForm(f=>({...f,is_all_day:e.target.checked}))} /> All day
                </label>
              </div>
              {err && <p style={{color:'var(--red)',fontSize:11}}>{err}</p>}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={saving}>{saving?<span className="spinner"/>:'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UpcomingSidebar({ events }) {
  const now = new Date();
  const upcoming = events
    .filter(e => new Date(e.start_time) >= now)
    .sort((a,b) => new Date(a.start_time)-new Date(b.start_time))
    .slice(0, 5);

  return (
    <div style={{position:'absolute',top:70,right:0,width:200,padding:'12px 14px',borderLeft:'1px solid var(--border-dim)',height:'calc(100% - 70px)',overflowY:'auto',background:'var(--bg-panel)'}}>
      <p style={{fontSize:10,letterSpacing:'0.1em',color:'var(--text-faint)',marginBottom:10,textTransform:'uppercase'}}>Upcoming</p>
      {upcoming.length===0 && <p style={{fontSize:11,color:'var(--text-faint)'}}>No upcoming events</p>}
      {upcoming.map(ev => (
        <div key={ev.id} style={{marginBottom:10,padding:'8px 10px',background:'var(--bg-card)',borderRadius:'var(--radius)',borderLeft:`3px solid ${ev.color||'var(--green)'}`}}>
          <p style={{fontSize:11,color:'var(--text)',fontWeight:700}}>{ev.title}</p>
          <p style={{fontSize:10,color:'var(--text-dim)',marginTop:2}}>{new Date(ev.start_time).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
        </div>
      ))}
    </div>
  );
}
