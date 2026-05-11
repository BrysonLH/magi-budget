import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useTable, useGoal } from '../hooks/useSupabaseData'
import { theme, CAT_COLOR, CATEGORIES, INCOME_TYPES, fmt, today } from '../lib/theme'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'

export default function MagiBudget({ session }) {
  const userId = session.user.id
  const userEmail = session.user.email
  const income = useTable('income', userId)
  const expenses = useTable('expenses', userId)
  const savings = useTable('savings', userId)
  const goalState = useGoal(userId)
  const [tab, setTab] = useState('DASHBOARD')
  const [time, setTime] = useState(new Date())
  const [expForm, setExpForm] = useState({ label: '', amount: '', category: 'Food', date: today() })
  const [incForm, setIncForm] = useState({ label: '', amount: '', type: 'Internship', date: today() })
  const [savForm, setSavForm] = useState({ amount: '', note: '', date: today() })
  const [goalInput, setGoalInput] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i) }, [])

  const ready = !income.loading && !expenses.loading && !savings.loading && !goalState.loading
  const totalIncome = income.rows.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = expenses.rows.reduce((s, r) => s + Number(r.amount), 0)
  const totalSaved = savings.rows.reduce((s, r) => s + Number(r.amount), 0)
  const available = totalIncome - totalExpenses - totalSaved
  const goalPct = goalState.goal > 0 ? Math.min(100, (totalSaved / goalState.goal) * 100) : 0

  const donutData = useMemo(() =>
    CATEGORIES.map(c => ({ name: c, value: expenses.rows.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0), color: CAT_COLOR[c] })).filter(x => x.value > 0),
    [expenses.rows])

  const monthlyIncome = useMemo(() => {
    const map = {}
    income.rows.forEach(r => { const k = r.date?.slice(0,7); if (k) map[k] = (map[k]||0)+Number(r.amount) })
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).slice(-6)
      .map(([m,amount]) => ({ month: new Date(m+'-01').toLocaleDateString('en-US',{month:'short'}), amount }))
  }, [income.rows])

  const balanceOverTime = useMemo(() => {
    const all = [
      ...income.rows.map(r => ({ date: r.date, delta: Number(r.amount) })),
      ...expenses.rows.map(r => ({ date: r.date, delta: -Number(r.amount) })),
      ...savings.rows.map(r => ({ date: r.date, delta: -Number(r.amount) })),
    ].sort((a,b) => a.date?.localeCompare(b.date))
    let running = 0
    return all.map(r => { running += r.delta; return { date: new Date(r.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}), balance: parseFloat(running.toFixed(2)) } })
  }, [income.rows, expenses.rows, savings.rows])

  const addExpense = async () => { const amt=parseFloat(expForm.amount); if (!expForm.label.trim()||isNaN(amt)||amt<=0) return; setBusy(true); await expenses.add({...expForm,label:expForm.label.trim(),amount:amt}); setExpForm({label:'',amount:'',category:'Food',date:today()}); setBusy(false) }
  const addIncome = async () => { const amt=parseFloat(incForm.amount); if (!incForm.label.trim()||isNaN(amt)||amt<=0) return; setBusy(true); await income.add({...incForm,label:incForm.label.trim(),amount:amt}); setIncForm({label:'',amount:'',type:'Internship',date:today()}); setBusy(false) }
  const addSaving = async () => { const amt=parseFloat(savForm.amount); if (isNaN(amt)||amt<=0) return; setBusy(true); await savings.add({...savForm,note:savForm.note.trim()||null,amount:amt}); setSavForm({amount:'',note:'',date:today()}); setBusy(false) }
  const commitGoal = async () => { const g=parseFloat(goalInput); if (isNaN(g)||g<0) return; setBusy(true); await goalState.save(g); setGoalInput(''); setBusy(false) }
  const signOut = () => supabase.auth.signOut()

  const T = theme
  const s = {
    root:{background:T.BG,minHeight:'100vh',fontFamily:"'IBM Plex Mono','Courier New',monospace",color:T.TEXT,backgroundImage:'repeating-linear-gradient(0deg,rgba(255,140,0,0.02) 0px,rgba(255,140,0,0.02) 1px,transparent 1px,transparent 3px)',paddingBottom:60},
    header:{borderBottom:`1px solid ${T.BORDER}`,padding:'14px 20px',background:'#0d0905',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,position:'sticky',top:0,zIndex:10},
    title:{color:T.AMBER,fontSize:14,fontWeight:700,letterSpacing:4,margin:0},
    sub:{color:T.MUTED,fontSize:9,letterSpacing:2,marginTop:2},
    nav:{display:'flex',borderBottom:`1px solid ${T.BORDER}`,background:'#0d0905',overflowX:'auto',position:'sticky',top:56,zIndex:9},
    navBtn:(a)=>({background:a?'#1f1408':'transparent',border:'none',borderRight:`1px solid ${T.BORDER}`,borderBottom:a?`2px solid ${T.AMBER}`:'2px solid transparent',color:a?T.AMBER:T.MUTED,padding:'11px 18px',fontSize:10,fontWeight:700,letterSpacing:2.5,cursor:'pointer',whiteSpace:'nowrap'}),
    body:{padding:'18px 16px',maxWidth:900,margin:'0 auto'},
    panel:{background:T.PANEL,border:`1px solid ${T.BORDER}`,padding:'14px 16px',marginBottom:12,position:'relative'},
    panelLabel:{position:'absolute',top:-8,left:12,background:T.BG,padding:'0 8px',fontSize:9,color:T.AMBER,letterSpacing:3},
    statGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12},
    stat:(c)=>({background:T.PANEL,border:`1px solid ${T.BORDER}`,borderLeft:`3px solid ${c}`,padding:'12px 14px'}),
    statLabel:{fontSize:9,color:T.MUTED,letterSpacing:3,marginBottom:6},
    statVal:(c)=>({fontSize:18,fontWeight:700,color:c,letterSpacing:1,fontVariantNumeric:'tabular-nums'}),
    chartTitle:{fontSize:9,color:T.AMBER,letterSpacing:3,marginBottom:14,paddingBottom:6,borderBottom:`1px dashed ${T.BORDER}`},
    label:{display:'block',fontSize:9,color:T.MUTED,letterSpacing:2,marginBottom:4,textTransform:'uppercase'},
    input:{background:'#070503',border:`1px solid ${T.BORDER}`,color:T.TEXT,padding:'8px 10px',fontSize:12,width:'100%',boxSizing:'border-box',outline:'none',borderRadius:0},
    select:{background:'#070503',border:`1px solid ${T.BORDER}`,color:T.TEXT,padding:'8px 10px',fontSize:12,width:'100%',boxSizing:'border-box',outline:'none',borderRadius:0},
    row2:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10},
    btn:{background:T.AMBER,color:T.BG,border:'none',padding:'9px 18px',fontSize:10,fontWeight:700,letterSpacing:2.5,cursor:'pointer',textTransform:'uppercase'},
    btnSec:{background:'transparent',color:T.MUTED,border:`1px solid ${T.BORDER}`,padding:'8px 14px',fontSize:10,fontWeight:700,letterSpacing:2,cursor:'pointer',textTransform:'uppercase'},
    entry:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'10px 0',borderBottom:'1px solid #1a1208',gap:12},
    del:{background:'none',border:'none',color:T.AMBER_DIM,cursor:'pointer',fontSize:16,padding:'0 4px',lineHeight:1},
    tag:(c)=>({display:'inline-block',fontSize:9,letterSpacing:1.5,color:c,border:`1px solid ${c}40`,padding:'2px 6px',textTransform:'uppercase',background:`${c}10`}),
    barWrap:{background:'#1a1208',height:6,overflow:'hidden',marginTop:6},
    bar:(p,c)=>({height:'100%',width:`${p}%`,background:c,transition:'width 0.4s'}),
    sectionHead:{fontSize:10,color:T.AMBER,letterSpacing:3,textTransform:'uppercase',marginBottom:12,paddingBottom:6,borderBottom:`1px dashed ${T.BORDER}`,display:'flex',justifyContent:'space-between'},
    empty:{color:T.MUTED,fontSize:10,letterSpacing:2,textAlign:'center',padding:'20px 0'},
  }

  const Tip = ({ active, payload }) => active && payload?.length ? (
    <div style={{background:'#1a1208',border:`1px solid ${T.BORDER}`,padding:'8px 12px',fontSize:11,fontFamily:'inherit'}}>
      <div style={{color:T.AMBER,letterSpacing:1}}>{payload[0].name||payload[0].dataKey}</div>
      <div style={{color:T.TEXT,fontWeight:700}}>{fmt(payload[0].value)}</div>
    </div>
  ) : null

  if (!ready) return <div style={{...s.root,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:T.AMBER,fontSize:11,letterSpacing:4}}>SYNCING MAGI...</div></div>

  return (
    <div style={s.root}>
      <style>{`@keyframes magi_blink{50%{opacity:0}}input::placeholder{color:${T.AMBER_DIM}}input[type='date']::-webkit-calendar-picker-indicator{filter:invert(0.5) sepia(1) hue-rotate(-10deg);cursor:pointer}@media(max-width:640px){.sg{grid-template-columns:repeat(2,1fr)!important}.cg{grid-template-columns:1fr!important}}`}</style>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>MAGI · BUDGET</h1>
          <div style={s.sub}>{userEmail.split('@')[0].toUpperCase().slice(0,16)} // ONLINE</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{color:T.AMBER,fontSize:10,letterSpacing:2,textAlign:'right'}}>
            <span style={{animation:'magi_blink 1s steps(2) infinite'}}>●</span> SYNCED<br/>
            <span style={{color:T.MUTED}}>{time.toLocaleTimeString('en-US',{hour12:false})}</span>
          </div>
          <button onClick={signOut} style={s.btnSec}>⏻</button>
        </div>
      </header>
      <nav style={s.nav}>
        {['DASHBOARD','INCOME','EXPENSES','SAVINGS'].map(t=>(
          <button key={t} style={s.navBtn(tab===t)} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </nav>
      <main style={s.body}>
        {tab==='DASHBOARD' && <>
          <div className="sg" style={{...s.statGrid}}>
            {[[T.GREEN,'INFLOW',totalIncome],[T.RED,'OUTFLOW',totalExpenses],[T.YELLOW,'RESERVED',totalSaved],[available>=0?T.AMBER:T.RED,'AVAILABLE',available]].map(([c,l,v])=>(
              <div key={l} style={s.stat(c)}><div style={s.statLabel}>{l}</div><div style={s.statVal(c)}>{fmt(v)}</div></div>
            ))}
          </div>
          {goalState.goal>0 && <div style={s.panel}>
            <span style={s.panelLabel}>SAVINGS_TARGET</span>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,marginTop:4}}>
              <span style={{fontSize:11,color:T.MUTED}}>PROGRESS</span>
              <span style={{fontSize:12,color:T.YELLOW,fontVariantNumeric:'tabular-nums'}}>{fmt(totalSaved)} / {fmt(goalState.goal)}</span>
            </div>
            <div style={s.barWrap}><div style={s.bar(goalPct,T.YELLOW)}/></div>
            <div style={{fontSize:9,color:T.MUTED,marginTop:6,letterSpacing:2}}>{goalPct.toFixed(1)}% · {fmt(Math.max(0,goalState.goal-totalSaved))} REMAINING</div>
          </div>}
          {(donutData.length>0||monthlyIncome.length>0) && <div className="cg" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            {donutData.length>0 && <div style={s.panel}>
              <span style={s.panelLabel}>EXPENSE_BREAKDOWN</span>
              <div style={s.chartTitle}>SPENDING BY CATEGORY</div>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value">
                  {donutData.map((d,i)=><Cell key={i} fill={d.color} stroke="transparent"/>)}
                </Pie><Tooltip content={<Tip/>}/></PieChart>
              </ResponsiveContainer>
              <div style={{display:'flex',flexWrap:'wrap',gap:'5px 12px',marginTop:6}}>
                {donutData.map(d=><div key={d.name} style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:d.color}}/>
                  <span style={{fontSize:9,color:T.MUTED,letterSpacing:1}}>{d.name.toUpperCase()}</span>
                </div>)}
              </div>
            </div>}
            {monthlyIncome.length>0 && <div style={s.panel}>
              <span style={s.panelLabel}>INCOME_HISTORY</span>
              <div style={s.chartTitle}>MONTHLY INFLOW</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={monthlyIncome} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:T.MUTED,fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`} tick={{fill:T.MUTED,fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} width={38}/>
                  <Tooltip content={<Tip/>} cursor={{fill:'rgba(255,140,0,0.05)'}}/>
                  <Bar dataKey="amount" name="Income" fill={T.GREEN} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>}
          </div>}
          {balanceOverTime.length>1 && <div style={s.panel}>
            <span style={s.panelLabel}>BALANCE_TIMELINE</span>
            <div style={s.chartTitle}>RUNNING BALANCE</div>
            <ResponsiveContainer width="100%" height={175}>
              <AreaChart data={balanceOverTime}>
                <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.AMBER} stopOpacity={0.22}/><stop offset="95%" stopColor={T.AMBER} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} vertical={false}/>
                <XAxis dataKey="date" tick={{fill:T.MUTED,fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                <YAxis tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`} tick={{fill:T.MUTED,fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} width={38}/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="balance" name="Balance" stroke={T.AMBER} strokeWidth={2} fill="url(#bg)" dot={{fill:T.AMBER,strokeWidth:0,r:3}}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>}
          {income.rows.length===0&&expenses.rows.length===0&&<div style={s.panel}><span style={s.panelLabel}>STATUS</span><div style={{...s.empty,padding:'20px 0 8px'}}>NO TRANSACTIONS RECORDED<br/><span style={{color:T.AMBER_DIM,fontSize:9}}>USE INCOME / EXPENSES TABS TO BEGIN</span></div></div>}
        </>}

        {tab==='INCOME' && <>
          <div style={s.panel}><span style={s.panelLabel}>RECORD_INFLOW</span>
            <div style={{...s.row2,marginTop:6}}>
              <div><label style={s.label}>SOURCE</label><input style={s.input} placeholder="Sysco paycheck" value={incForm.label} onChange={e=>setIncForm(f=>({...f,label:e.target.value}))}/></div>
              <div><label style={s.label}>AMOUNT</label><input style={s.input} type="number" inputMode="decimal" placeholder="0.00" value={incForm.amount} onChange={e=>setIncForm(f=>({...f,amount:e.target.value}))}/></div>
            </div>
            <div style={s.row2}>
              <div><label style={s.label}>TYPE</label><select style={s.select} value={incForm.type} onChange={e=>setIncForm(f=>({...f,type:e.target.value}))}>{INCOME_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={s.label}>DATE</label><input style={s.input} type="date" value={incForm.date} onChange={e=>setIncForm(f=>({...f,date:e.target.value}))}/></div>
            </div>
            <button style={s.btn} onClick={addIncome} disabled={busy}>+ COMMIT</button>
          </div>
          <div style={s.panel}><span style={s.panelLabel}>LEDGER</span>
            <div style={s.sectionHead}><span>INFLOW HISTORY</span><span style={{color:T.GREEN}}>Σ {fmt(totalIncome)}</span></div>
            {income.rows.length===0?<div style={s.empty}>NO RECORDS</div>:income.rows.map(e=>(
              <div key={e.id} style={s.entry}>
                <div><div style={{fontSize:13,marginBottom:4,color:T.TEXT}}>{e.label}</div><div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}><span style={s.tag(T.GREEN)}>{e.type}</span><span style={{fontSize:10,color:T.MUTED}}>{e.date}</span></div></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{color:T.GREEN,fontSize:14,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>+{fmt(e.amount)}</span><button style={s.del} onClick={()=>income.remove(e.id)}>×</button></div>
              </div>
            ))}
          </div>
        </>}

        {tab==='EXPENSES' && <>
          <div style={s.panel}><span style={s.panelLabel}>RECORD_OUTFLOW</span>
            <div style={{...s.row2,marginTop:6}}>
              <div><label style={s.label}>ITEM</label><input style={s.input} placeholder="HEB groceries" value={expForm.label} onChange={e=>setExpForm(f=>({...f,label:e.target.value}))}/></div>
              <div><label style={s.label}>AMOUNT</label><input style={s.input} type="number" inputMode="decimal" placeholder="0.00" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))}/></div>
            </div>
            <div style={s.row2}>
              <div><label style={s.label}>CATEGORY</label><select style={s.select} value={expForm.category} onChange={e=>setExpForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={s.label}>DATE</label><input style={s.input} type="date" value={expForm.date} onChange={e=>setExpForm(f=>({...f,date:e.target.value}))}/></div>
            </div>
            <button style={s.btn} onClick={addExpense} disabled={busy}>+ COMMIT</button>
          </div>
          <div style={s.panel}><span style={s.panelLabel}>LEDGER</span>
            <div style={s.sectionHead}><span>OUTFLOW HISTORY</span><span style={{color:T.RED}}>Σ {fmt(totalExpenses)}</span></div>
            {expenses.rows.length===0?<div style={s.empty}>NO RECORDS</div>:expenses.rows.map(e=>(
              <div key={e.id} style={s.entry}>
                <div><div style={{fontSize:13,marginBottom:4,color:T.TEXT}}>{e.label}</div><div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}><span style={s.tag(CAT_COLOR[e.category])}>{e.category}</span><span style={{fontSize:10,color:T.MUTED}}>{e.date}</span></div></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{color:T.RED,fontSize:14,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>−{fmt(e.amount)}</span><button style={s.del} onClick={()=>expenses.remove(e.id)}>×</button></div>
              </div>
            ))}
          </div>
        </>}

        {tab==='SAVINGS' && <>
          <div style={s.panel}><span style={s.panelLabel}>TARGET_CONFIG</span>
            <div style={{marginTop:6}}>
              <label style={s.label}>SAVINGS GOAL ($)</label>
              <div style={{display:'flex',gap:8}}>
                <input style={{...s.input,flex:1}} type="number" inputMode="decimal" placeholder={goalState.goal>0?fmt(goalState.goal):'e.g. 3000'} value={goalInput} onChange={e=>setGoalInput(e.target.value)}/>
                <button style={s.btnSec} onClick={commitGoal} disabled={busy}>SET</button>
              </div>
              {goalState.goal>0&&<div style={{marginTop:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}><span style={{color:T.MUTED}}>CURRENT</span><span style={{color:T.YELLOW,fontVariantNumeric:'tabular-nums'}}>{fmt(totalSaved)} / {fmt(goalState.goal)}</span></div>
                <div style={s.barWrap}><div style={s.bar(goalPct,T.YELLOW)}/></div>
              </div>}
            </div>
          </div>
          <div style={s.panel}><span style={s.panelLabel}>RESERVE_TRANSFER</span>
            <div style={{...s.row2,marginTop:6}}>
              <div><label style={s.label}>AMOUNT</label><input style={s.input} type="number" inputMode="decimal" placeholder="0.00" value={savForm.amount} onChange={e=>setSavForm(f=>({...f,amount:e.target.value}))}/></div>
              <div><label style={s.label}>DATE</label><input style={s.input} type="date" value={savForm.date} onChange={e=>setSavForm(f=>({...f,date:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:10}}><label style={s.label}>NOTE (optional)</label><input style={s.input} placeholder="Emergency fund / apartment deposit" value={savForm.note} onChange={e=>setSavForm(f=>({...f,note:e.target.value}))}/></div>
            <button style={s.btn} onClick={addSaving} disabled={busy}>+ RESERVE</button>
          </div>
          <div style={s.panel}><span style={s.panelLabel}>LEDGER</span>
            <div style={s.sectionHead}><span>RESERVE HISTORY</span><span style={{color:T.YELLOW}}>Σ {fmt(totalSaved)}</span></div>
            {savings.rows.length===0?<div style={s.empty}>NO RESERVES</div>:savings.rows.map(e=>(
              <div key={e.id} style={s.entry}>
                <div><div style={{fontSize:13,marginBottom:4,color:T.TEXT}}>{e.note||'Transfer to savings'}</div><div style={{fontSize:10,color:T.MUTED}}>{e.date}</div></div>
                <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{color:T.YELLOW,fontSize:14,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{fmt(e.amount)}</span><button style={s.del} onClick={()=>savings.remove(e.id)}>×</button></div>
              </div>
            ))}
          </div>
        </>}
        <div style={{textAlign:'center',marginTop:24,fontSize:9,color:T.AMBER_DIM,letterSpacing:3}}>MAGI-01 · CASPER // SYNCED TO SUPABASE</div>
      </main>
    </div>
  )
}
