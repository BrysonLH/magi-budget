import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useTable, useGoal, useCategories, useBudgetLimits } from '../hooks/useSupabaseData'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { theme, INCOME_TYPES, PALETTE, fmt, today, currentMonth } from '../lib/theme'
import { exportAll } from '../lib/csv'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts'

export default function MagiBudget({ session }) {
  const userId = session.user.id
  const userEmail = session.user.email

  const income = useTable('income', userId)
  const expenses = useTable('expenses', userId)
  const savings = useTable('savings', userId)
  const goalState = useGoal(userId)
  const cats = useCategories(userId)
  const limits = useBudgetLimits(userId)

  const [tab, setTab] = useState('DASHBOARD')
  const [time, setTime] = useState(new Date())
  const [expForm, setExpForm] = useState({ label: '', amount: '', category: '', date: today() })
  const [incForm, setIncForm] = useState({ label: '', amount: '', type: 'Internship', date: today() })
  const [savForm, setSavForm] = useState({ amount: '', note: '', date: today() })
  const [goalInput, setGoalInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [incSearch, setIncSearch] = useState('')
  const [expSearch, setExpSearch] = useState('')
  const [quickExp, setQuickExp] = useState({ amount: '', label: '', category: '' })
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(PALETTE[0])
  const [editingCat, setEditingCat] = useState(null)

  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i) }, [])

  useEffect(() => {
    if (cats.rows.length > 0 && !expForm.category) setExpForm(f => ({ ...f, category: cats.rows[0].name }))
    if (cats.rows.length > 0 && !quickExp.category) setQuickExp(q => ({ ...q, category: cats.rows[0].name }))
  }, [cats.rows.length])

  const CAT_COLOR = useMemo(() => { const m = {}; cats.rows.forEach(c => { m[c.name] = c.color }); return m }, [cats.rows])

  const ready = !income.loading && !expenses.loading && !savings.loading && !goalState.loading && !cats.loading && !limits.loading

  const totalIncome = income.rows.reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = expenses.rows.reduce((s, r) => s + Number(r.amount), 0)
  const totalSaved = savings.rows.reduce((s, r) => s + Number(r.amount), 0)
  const available = totalIncome - totalExpenses - totalSaved
  const goalPct = goalState.goal > 0 ? Math.min(100, (totalSaved / goalState.goal) * 100) : 0

  const thisMonth = currentMonth()
  const monthlyByCategory = useMemo(() => {
    const m = {}
    expenses.rows.forEach(e => { if (e.date?.startsWith(thisMonth)) m[e.category] = (m[e.category] || 0) + Number(e.amount) })
    return m
  }, [expenses.rows, thisMonth])

  const donutData = useMemo(() =>
    cats.rows.map(c => ({ name: c.name, value: expenses.rows.filter(e => e.category === c.name).reduce((s, e) => s + Number(e.amount), 0), color: c.color })).filter(x => x.value > 0),
    [expenses.rows, cats.rows])

  const monthlyIncome = useMemo(() => {
    const map = {}
    income.rows.forEach(r => { const k = r.date?.slice(0, 7); if (k) map[k] = (map[k] || 0) + Number(r.amount) })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([m, amount]) => ({ month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }), amount }))
  }, [income.rows])

  const balanceOverTime = useMemo(() => {
    const all = [
      ...income.rows.map(r => ({ date: r.date, delta: Number(r.amount) })),
      ...expenses.rows.map(r => ({ date: r.date, delta: -Number(r.amount) })),
      ...savings.rows.map(r => ({ date: r.date, delta: -Number(r.amount) })),
    ].sort((a, b) => a.date?.localeCompare(b.date))
    let running = 0
    return all.map(r => { running += r.delta; return { date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), balance: parseFloat(running.toFixed(2)) } })
  }, [income.rows, expenses.rows, savings.rows])

  const showToast = useCallback((msg, undoFn) => {
    setToast({ msg, undoFn, id: Date.now() })
    setTimeout(() => setToast(null), 5000)
  }, [])

  const onRefresh = useCallback(async () => {
    await Promise.all([
      supabase.from('income').select('*').is('deleted_at', null),
      supabase.from('expenses').select('*').is('deleted_at', null),
    ])
  }, [])

  const ptr = usePullToRefresh(onRefresh)

  const addExpense = async () => {
    const amt = parseFloat(expForm.amount)
    if (!expForm.label.trim() || isNaN(amt) || amt <= 0 || !expForm.category) return
    setBusy(true)
    await expenses.add({ ...expForm, label: expForm.label.trim(), amount: amt })
    setExpForm(f => ({ label: '', amount: '', category: f.category, date: today() }))
    setBusy(false)
  }

  const addQuick = async () => {
    const amt = parseFloat(quickExp.amount)
    if (!quickExp.label.trim() || isNaN(amt) || amt <= 0 || !quickExp.category) return
    setBusy(true)
    await expenses.add({ label: quickExp.label.trim(), amount: amt, category: quickExp.category, date: today() })
    setQuickExp(q => ({ amount: '', label: '', category: q.category }))
    setBusy(false)
  }

  const addIncome = async () => {
    const amt = parseFloat(incForm.amount)
    if (!incForm.label.trim() || isNaN(amt) || amt <= 0) return
    setBusy(true)
    await income.add({ ...incForm, label: incForm.label.trim(), amount: amt })
    setIncForm({ label: '', amount: '', type: 'Internship', date: today() })
    setBusy(false)
  }

  const addSaving = async () => {
    const amt = parseFloat(savForm.amount)
    if (isNaN(amt) || amt <= 0) return
    setBusy(true)
    await savings.add({ ...savForm, note: savForm.note.trim() || null, amount: amt })
    setSavForm({ amount: '', note: '', date: today() })
    setBusy(false)
  }

  const commitGoal = async () => {
    const g = parseFloat(goalInput)
    if (isNaN(g) || g < 0) return
    setBusy(true)
    await goalState.save(g)
    setGoalInput('')
    setBusy(false)
  }

  const deleteWithUndo = async (table, id) => {
    const { undoTarget } = await table.remove(id)
    if (undoTarget) showToast('Deleted', () => table.undo(undoTarget))
  }

  const addCategory = async () => {
    if (!newCatName.trim()) return
    setBusy(true)
    const { error } = await cats.add(newCatName.trim(), newCatColor)
    if (error) showToast('Already exists', null)
    setNewCatName('')
    setBusy(false)
  }

  const filteredIncome = useMemo(() => {
    const q = incSearch.trim().toLowerCase()
    if (!q) return income.rows
    return income.rows.filter(r => r.label?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q) || r.date?.includes(q))
  }, [income.rows, incSearch])

  const filteredExpenses = useMemo(() => {
    const q = expSearch.trim().toLowerCase()
    if (!q) return expenses.rows
    return expenses.rows.filter(r => r.label?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q) || r.date?.includes(q))
  }, [expenses.rows, expSearch])

  const signOut = () => supabase.auth.signOut()
  const exportCsv = () => exportAll({ income: income.rows, expenses: expenses.rows, savings: savings.rows })

  const T = theme
  const s = {
    root: { background: T.BG, minHeight: '100vh', fontFamily: "'IBM Plex Mono','Courier New',monospace", color: T.TEXT, backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,140,0,0.02) 0px,rgba(255,140,0,0.02) 1px,transparent 1px,transparent 3px)', paddingBottom: 80 },
    header: { borderBottom: `1px solid ${T.BORDER}`, padding: '14px 18px', background: '#0d0905', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 },
    title: { color: T.AMBER, fontSize: 14, fontWeight: 700, letterSpacing: 4, margin: 0 },
    sub: { color: T.MUTED, fontSize: 9, letterSpacing: 2, marginTop: 2 },
    nav: { display: 'flex', borderBottom: `1px solid ${T.BORDER}`, background: '#0d0905', overflowX: 'auto', position: 'sticky', top: 58, zIndex: 9 },
    navBtn: (a) => ({ background: a ? '#1f1408' : 'transparent', border: 'none', borderRight: `1px solid ${T.BORDER}`, borderBottom: a ? `2px solid ${T.AMBER}` : '2px solid transparent', color: a ? T.AMBER : T.MUTED, padding: '13px 18px', fontSize: 10, fontWeight: 700, letterSpacing: 2.5, cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }),
    body: { padding: '18px 14px', maxWidth: 900, margin: '0 auto' },
    panel: { background: T.PANEL, border: `1px solid ${T.BORDER}`, padding: '14px 16px', marginBottom: 12, position: 'relative' },
    panelLabel: { position: 'absolute', top: -8, left: 12, background: T.BG, padding: '0 8px', fontSize: 9, color: T.AMBER, letterSpacing: 3 },
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 },
    stat: (c) => ({ background: T.PANEL, border: `1px solid ${T.BORDER}`, borderLeft: `3px solid ${c}`, padding: '12px 14px' }),
    statLabel: { fontSize: 9, color: T.MUTED, letterSpacing: 3, marginBottom: 6 },
    statVal: (c) => ({ fontSize: 18, fontWeight: 700, color: c, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }),
    chartTitle: { fontSize: 9, color: T.AMBER, letterSpacing: 3, marginBottom: 14, paddingBottom: 6, borderBottom: `1px dashed ${T.BORDER}` },
    label: { display: 'block', fontSize: 9, color: T.MUTED, letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' },
    input: { background: '#070503', border: `1px solid ${T.BORDER}`, color: T.TEXT, padding: '10px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none', borderRadius: 0, minHeight: 42 },
    select: { background: '#070503', border: `1px solid ${T.BORDER}`, color: T.TEXT, padding: '10px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none', borderRadius: 0, minHeight: 42 },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
    btn: { background: T.AMBER, color: T.BG, border: 'none', padding: '12px 20px', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, cursor: 'pointer', textTransform: 'uppercase', minHeight: 44, width: '100%' },
    btnSec: { background: 'transparent', color: T.MUTED, border: `1px solid ${T.BORDER}`, padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase', minHeight: 44 },
    entry: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #1a1208', gap: 12 },
    del: { background: 'none', border: 'none', color: T.AMBER_DIM, cursor: 'pointer', fontSize: 18, padding: '6px 10px', lineHeight: 1, minHeight: 36, minWidth: 36 },
    tag: (c) => ({ display: 'inline-block', fontSize: 9, letterSpacing: 1.5, color: c, border: `1px solid ${c}40`, padding: '2px 6px', textTransform: 'uppercase', background: `${c}10` }),
    barWrap: { background: '#1a1208', height: 6, overflow: 'hidden', marginTop: 6 },
    bar: (p, c) => ({ height: '100%', width: `${Math.min(100, p)}%`, background: c, transition: 'width 0.4s' }),
    sectionHead: { fontSize: 10, color: T.AMBER, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: `1px dashed ${T.BORDER}`, display: 'flex', justifyContent: 'space-between' },
    empty: { color: T.MUTED, fontSize: 10, letterSpacing: 2, textAlign: 'center', padding: '20px 0' },
  }

  const Tip = ({ active, payload }) => active && payload?.length ? (
    <div style={{ background: '#1a1208', border: `1px solid ${T.BORDER}`, padding: '8px 12px', fontSize: 11, fontFamily: 'inherit' }}>
      <div style={{ color: T.AMBER, letterSpacing: 1 }}>{payload[0].name || payload[0].dataKey}</div>
      <div style={{ color: T.TEXT, fontWeight: 700 }}>{fmt(payload[0].value)}</div>
    </div>
  ) : null

  if (!ready) return <div style={{ ...s.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: T.AMBER, fontSize: 11, letterSpacing: 4 }}>SYNCING MAGI...</div></div>

  return (
    <div style={s.root}>
      <style>{`@media(min-width:640px){.sg{grid-template-columns:repeat(4,1fr)!important}.cg{grid-template-columns:1fr 1fr!important}}.ptr{position:fixed;top:0;left:50%;transform:translateX(-50%);color:${T.AMBER};font-size:10px;letter-spacing:3px;z-index:100;pointer-events:none;transition:opacity .2s}`}</style>

      {ptr.distance > 0 && <div className="ptr" style={{ top: ptr.distance - 30, opacity: ptr.distance / 80 }}>{ptr.pulling ? '↻ RELEASE TO SYNC' : '↓ PULL DOWN'}</div>}

      <header style={s.header}>
        <div><h1 style={s.title}>MAGI · MONEY</h1><div style={s.sub}>{userEmail.split('@')[0].toUpperCase().slice(0, 16)} // SYNCED</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: T.AMBER, fontSize: 10, letterSpacing: 2, textAlign: 'right' }}>
            <span style={{ animation: 'magi_blink 1s steps(2) infinite' }}>●</span> LIVE<br />
            <span style={{ color: T.MUTED }}>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
          <button onClick={signOut} style={{ ...s.btnSec, padding: '10px 12px' }}>⏻</button>
        </div>
      </header>

      <nav style={s.nav}>
        {['DASHBOARD', 'INCOME', 'EXPENSES', 'SAVINGS', 'SETTINGS'].map(t => (
          <button key={t} style={s.navBtn(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

      <main style={s.body}>
        {tab === 'DASHBOARD' && <>
          <div className="sg" style={s.statGrid}>
            {[[T.GREEN, 'INFLOW', totalIncome], [T.RED, 'OUTFLOW', totalExpenses], [T.YELLOW, 'RESERVED', totalSaved], [available >= 0 ? T.AMBER : T.RED, 'AVAILABLE', available]].map(([c, l, v]) => (
              <div key={l} style={s.stat(c)}><div style={s.statLabel}>{l}</div><div style={s.statVal(c)}>{fmt(v)}</div></div>
            ))}
          </div>

          <div style={s.panel}>
            <span style={s.panelLabel}>QUICK_ADD</span>
            <div style={{ ...s.row2, marginTop: 6 }}>
              <input style={s.input} placeholder="$ amount" type="number" inputMode="decimal" value={quickExp.amount} onChange={e => setQuickExp(q => ({ ...q, amount: e.target.value }))} />
              <input style={s.input} placeholder="what for?" value={quickExp.label} onChange={e => setQuickExp(q => ({ ...q, label: e.target.value }))} />
            </div>
            <select style={{ ...s.select, marginBottom: 10 }} value={quickExp.category} onChange={e => setQuickExp(q => ({ ...q, category: e.target.value }))}>
              {cats.rows.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <button style={s.btn} onClick={addQuick} disabled={busy}>+ LOG EXPENSE</button>
          </div>

          {Object.keys(limits.map).length > 0 && (
            <div style={s.panel}>
              <span style={s.panelLabel}>MONTHLY_LIMITS</span>
              <div style={s.chartTitle}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
              {Object.entries(limits.map).map(([cat, lim]) => {
                const spent = monthlyByCategory[cat] || 0
                const pct = (spent / lim) * 100
                const over = pct >= 100, warn = pct >= 80
                const color = over ? T.RED : warn ? T.YELLOW : T.GREEN
                return (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: CAT_COLOR[cat] || T.MUTED, letterSpacing: 1.5 }}>{cat.toUpperCase()}</span>
                      <span style={{ fontSize: 11, color, fontVariantNumeric: 'tabular-nums' }}>{fmt(spent)} / {fmt(lim)} {over && '⚠'}</span>
                    </div>
                    <div style={s.barWrap}><div style={s.bar(pct, color)} /></div>
                  </div>
                )
              })}
            </div>
          )}

          {goalState.goal > 0 && (
            <div style={s.panel}>
              <span style={s.panelLabel}>SAVINGS_TARGET</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: T.MUTED }}>PROGRESS</span>
                <span style={{ fontSize: 12, color: T.YELLOW, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalSaved)} / {fmt(goalState.goal)}</span>
              </div>
              <div style={s.barWrap}><div style={s.bar(goalPct, T.YELLOW)} /></div>
              <div style={{ fontSize: 9, color: T.MUTED, marginTop: 6, letterSpacing: 2 }}>{goalPct.toFixed(1)}% · {fmt(Math.max(0, goalState.goal - totalSaved))} REMAINING</div>
            </div>
          )}

          {(donutData.length > 0 || monthlyIncome.length > 0) && (
            <div className="cg" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
              {donutData.length > 0 && (
                <div style={s.panel}>
                  <span style={s.panelLabel}>EXPENSE_BREAKDOWN</span>
                  <div style={s.chartTitle}>SPENDING BY CATEGORY</div>
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={3} dataKey="value">
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<Tip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', marginTop: 6 }}>
                    {donutData.map(d => <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color }} /><span style={{ fontSize: 9, color: T.MUTED, letterSpacing: 1 }}>{d.name.toUpperCase()}</span></div>)}
                  </div>
                </div>
              )}
              {monthlyIncome.length > 0 && (
                <div style={s.panel}>
                  <span style={s.panelLabel}>INCOME_HISTORY</span>
                  <div style={s.chartTitle}>MONTHLY INFLOW</div>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={monthlyIncome} barSize={26}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: T.MUTED, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fill: T.MUTED, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={38} />
                      <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,140,0,0.05)' }} />
                      <Bar dataKey="amount" name="Income" fill={T.GREEN} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {balanceOverTime.length > 1 && (
            <div style={s.panel}>
              <span style={s.panelLabel}>BALANCE_TIMELINE</span>
              <div style={s.chartTitle}>RUNNING BALANCE</div>
              <ResponsiveContainer width="100%" height={175}>
                <AreaChart data={balanceOverTime}>
                  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.AMBER} stopOpacity={0.22} /><stop offset="95%" stopColor={T.AMBER} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.BORDER} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: T.MUTED, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fill: T.MUTED, fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={38} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="balance" name="Balance" stroke={T.AMBER} strokeWidth={2} fill="url(#bg)" dot={{ fill: T.AMBER, strokeWidth: 0, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>}

        {tab === 'INCOME' && <>
          <div style={s.panel}>
            <span style={s.panelLabel}>RECORD_INFLOW</span>
            <div style={{ ...s.row2, marginTop: 6 }}>
              <div><label style={s.label}>SOURCE</label><input style={s.input} placeholder="Sysco paycheck" value={incForm.label} onChange={e => setIncForm(f => ({ ...f, label: e.target.value }))} /></div>
              <div><label style={s.label}>AMOUNT</label><input style={s.input} type="number" inputMode="decimal" placeholder="0.00" value={incForm.amount} onChange={e => setIncForm(f => ({ ...f, amount: e.target.value }))} /></div>
            </div>
            <div style={s.row2}>
              <div><label style={s.label}>TYPE</label><select style={s.select} value={incForm.type} onChange={e => setIncForm(f => ({ ...f, type: e.target.value }))}>{INCOME_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label style={s.label}>DATE</label><input style={s.input} type="date" value={incForm.date} onChange={e => setIncForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <button style={s.btn} onClick={addIncome} disabled={busy}>+ COMMIT</button>
          </div>
          <div style={s.panel}>
            <span style={s.panelLabel}>LEDGER</span>
            <input style={{ ...s.input, marginBottom: 10 }} placeholder="🔍 SEARCH INFLOW..." value={incSearch} onChange={e => setIncSearch(e.target.value)} />
            <div style={s.sectionHead}><span>HISTORY · {filteredIncome.length}</span><span style={{ color: T.GREEN }}>Σ {fmt(totalIncome)}</span></div>
            {filteredIncome.length === 0 ? <div style={s.empty}>{incSearch ? 'NO MATCHES' : 'NO RECORDS'}</div> : filteredIncome.map(e => (
              <div key={e.id} style={s.entry}>
                <div><div style={{ fontSize: 13, marginBottom: 4, color: T.TEXT }}>{e.label}</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}><span style={s.tag(T.GREEN)}>{e.type}</span><span style={{ fontSize: 10, color: T.MUTED }}>{e.date}</span></div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: T.GREEN, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>+{fmt(e.amount)}</span><button style={s.del} onClick={() => deleteWithUndo(income, e.id)}>×</button></div>
              </div>
            ))}
          </div>
        </>}

        {tab === 'EXPENSES' && <>
          <div style={s.panel}>
            <span style={s.panelLabel}>RECORD_OUTFLOW</span>
            <div style={{ ...s.row2, marginTop: 6 }}>
              <div><label style={s.label}>ITEM</label><input style={s.input} placeholder="HEB groceries" value={expForm.label} onChange={e => setExpForm(f => ({ ...f, label: e.target.value }))} /></div>
              <div><label style={s.label}>AMOUNT</label><input style={s.input} type="number" inputMode="decimal" placeholder="0.00" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} /></div>
            </div>
            <div style={s.row2}>
              <div><label style={s.label}>CATEGORY</label><select style={s.select} value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>{cats.rows.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              <div><label style={s.label}>DATE</label><input style={s.input} type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <button style={s.btn} onClick={addExpense} disabled={busy}>+ COMMIT</button>
          </div>
          <div style={s.panel}>
            <span style={s.panelLabel}>LEDGER</span>
            <input style={{ ...s.input, marginBottom: 10 }} placeholder="🔍 SEARCH OUTFLOW..." value={expSearch} onChange={e => setExpSearch(e.target.value)} />
            <div style={s.sectionHead}><span>HISTORY · {filteredExpenses.length}</span><span style={{ color: T.RED }}>Σ {fmt(totalExpenses)}</span></div>
            {filteredExpenses.length === 0 ? <div style={s.empty}>{expSearch ? 'NO MATCHES' : 'NO RECORDS'}</div> : filteredExpenses.map(e => (
              <div key={e.id} style={s.entry}>
                <div><div style={{ fontSize: 13, marginBottom: 4, color: T.TEXT }}>{e.label}</div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}><span style={s.tag(CAT_COLOR[e.category] || T.MUTED)}>{e.category}</span><span style={{ fontSize: 10, color: T.MUTED }}>{e.date}</span></div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: T.RED, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>−{fmt(e.amount)}</span><button style={s.del} onClick={() => deleteWithUndo(expenses, e.id)}>×</button></div>
              </div>
            ))}
          </div>
        </>}

        {tab === 'SAVINGS' && <>
          <div style={s.panel}>
            <span style={s.panelLabel}>TARGET_CONFIG</span>
            <div style={{ marginTop: 6 }}>
              <label style={s.label}>SAVINGS GOAL ($)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...s.input, flex: 1 }} type="number" inputMode="decimal" placeholder={goalState.goal > 0 ? fmt(goalState.goal) : 'e.g. 3000'} value={goalInput} onChange={e => setGoalInput(e.target.value)} />
                <button style={s.btnSec} onClick={commitGoal} disabled={busy}>SET</button>
              </div>
              {goalState.goal > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}><span style={{ color: T.MUTED }}>CURRENT</span><span style={{ color: T.YELLOW, fontVariantNumeric: 'tabular-nums' }}>{fmt(totalSaved)} / {fmt(goalState.goal)}</span></div>
                  <div style={s.barWrap}><div style={s.bar(goalPct, T.YELLOW)} /></div>
                </div>
              )}
            </div>
          </div>
          <div style={s.panel}>
            <span style={s.panelLabel}>RESERVE_TRANSFER</span>
            <div style={{ ...s.row2, marginTop: 6 }}>
              <div><label style={s.label}>AMOUNT</label><input style={s.input} type="number" inputMode="decimal" placeholder="0.00" value={savForm.amount} onChange={e => setSavForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><label style={s.label}>DATE</label><input style={s.input} type="date" value={savForm.date} onChange={e => setSavForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 10 }}><label style={s.label}>NOTE (optional)</label><input style={s.input} placeholder="Emergency fund / apartment deposit" value={savForm.note} onChange={e => setSavForm(f => ({ ...f, note: e.target.value }))} /></div>
            <button style={s.btn} onClick={addSaving} disabled={busy}>+ RESERVE</button>
          </div>
          <div style={s.panel}>
            <span style={s.panelLabel}>LEDGER</span>
            <div style={s.sectionHead}><span>RESERVE HISTORY</span><span style={{ color: T.YELLOW }}>Σ {fmt(totalSaved)}</span></div>
            {savings.rows.length === 0 ? <div style={s.empty}>NO RESERVES</div> : savings.rows.map(e => (
              <div key={e.id} style={s.entry}>
                <div><div style={{ fontSize: 13, marginBottom: 4, color: T.TEXT }}>{e.note || 'Transfer to savings'}</div><div style={{ fontSize: 10, color: T.MUTED }}>{e.date}</div></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: T.YELLOW, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(e.amount)}</span><button style={s.del} onClick={() => deleteWithUndo(savings, e.id)}>×</button></div>
              </div>
            ))}
          </div>
        </>}

        {tab === 'SETTINGS' && <>
          <div style={s.panel}>
            <span style={s.panelLabel}>CATEGORIES</span>
            <div style={s.sectionHead}><span>CUSTOM CATEGORIES</span><span style={{ color: T.MUTED }}>{cats.rows.length}</span></div>
            {cats.rows.map(c => (
              <div key={c.id} style={s.entry}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{ width: 14, height: 14, background: c.color, flexShrink: 0 }} />
                  {editingCat?.id === c.id ? (
                    <input style={{ ...s.input, padding: '4px 8px', minHeight: 32 }} autoFocus value={editingCat.name}
                      onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
                      onBlur={async () => { if (editingCat.name.trim()) await cats.update(c.id, { name: editingCat.name.trim() }); setEditingCat(null) }}
                      onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                  ) : (
                    <span style={{ fontSize: 13, color: T.TEXT, cursor: 'pointer' }} onClick={() => setEditingCat({ id: c.id, name: c.name })}>{c.name}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="color" value={c.color} onChange={e => cats.update(c.id, { color: e.target.value })} style={{ width: 32, height: 32, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                  <button style={s.del} onClick={() => { if (confirm(`Delete "${c.name}"? Existing transactions keep this label.`)) cats.remove(c.id) }}>×</button>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input style={{ ...s.input, flex: 1 }} placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} style={{ width: 42, height: 42, padding: 0, border: `1px solid ${T.BORDER}`, background: 'transparent', cursor: 'pointer' }} />
              <button style={{ ...s.btnSec, width: 'auto' }} onClick={addCategory} disabled={busy}>ADD</button>
            </div>
          </div>

          <div style={s.panel}>
            <span style={s.panelLabel}>BUDGET_LIMITS</span>
            <div style={s.sectionHead}><span>MONTHLY CAPS</span><span style={{ color: T.MUTED, fontSize: 9 }}>TAP TO SET</span></div>
            {cats.rows.map(c => (
              <BudgetLimitRow key={c.id} category={c} currentLimit={limits.map[c.name]} onSave={(v) => limits.setLimit(c.name, v)} theme={T} styles={s} />
            ))}
          </div>

          <div style={s.panel}>
            <span style={s.panelLabel}>DATA_EXPORT</span>
            <p style={{ color: T.MUTED, fontSize: 11, lineHeight: 1.5, marginBottom: 12 }}>Download all transactions as a CSV file. Works with Excel, Google Sheets, Numbers.</p>
            <button style={s.btn} onClick={exportCsv}>↓ EXPORT TO CSV</button>
          </div>

          <div style={s.panel}>
            <span style={s.panelLabel}>ACCOUNT</span>
            <div style={{ fontSize: 11, color: T.MUTED, marginTop: 6, marginBottom: 12, letterSpacing: 1 }}>SIGNED IN AS<br /><span style={{ color: T.AMBER, fontSize: 12 }}>{userEmail}</span></div>
            <button style={{ ...s.btnSec, width: '100%' }} onClick={signOut}>⏻ SIGN OUT</button>
          </div>
        </>}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 9, color: T.AMBER_DIM, letterSpacing: 3 }}>MAGI-01 · CASPER // PERSISTENT LEDGER</div>
      </main>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1208', border: `1px solid ${T.AMBER}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 100, animation: 'magi_slide_up 0.2s ease', boxShadow: `0 4px 20px rgba(0,0,0,0.5)` }}>
          <span style={{ color: T.TEXT, fontSize: 11, letterSpacing: 1 }}>{toast.msg.toUpperCase()}</span>
          {toast.undoFn && <button style={{ background: 'transparent', border: 'none', color: T.AMBER, fontSize: 11, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }} onClick={() => { toast.undoFn(); setToast(null) }}>UNDO</button>}
        </div>
      )}
    </div>
  )
}

function BudgetLimitRow({ category, currentLimit, onSave, theme: T, styles: s }) {
  const [val, setVal] = useState('')
  const [editing, setEditing] = useState(false)
  const commit = async () => {
    const n = parseFloat(val)
    if (!isNaN(n)) await onSave(n)
    setEditing(false); setVal('')
  }
  return (
    <div style={s.entry}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 10, height: 10, background: category.color }} />
        <span style={{ fontSize: 13, color: T.TEXT }}>{category.name}</span>
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <input autoFocus style={{ ...s.input, width: 100, padding: '6px 8px', minHeight: 32 }} type="number" inputMode="decimal" placeholder="0" value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && commit()} />
          <button style={{ ...s.btnSec, padding: '6px 10px', minHeight: 32 }} onClick={commit}>OK</button>
        </div>
      ) : (
        <span style={{ fontSize: 12, color: currentLimit > 0 ? T.YELLOW : T.MUTED, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' }} onClick={() => { setEditing(true); setVal(currentLimit > 0 ? String(currentLimit) : '') }}>{currentLimit > 0 ? fmt(currentLimit) : 'SET LIMIT'}</span>
      )}
    </div>
  )
}
