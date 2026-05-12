import { useState } from 'react'
import {
  MOCK_INCOME, MOCK_EXPENSES, MOCK_SAVINGS,
  MOCK_GOAL, MOCK_CATEGORIES, MOCK_LIMITS
} from '../lib/mockData'

// Fake hook that mirrors useTable API but uses local state only
function useMockTable(initialData) {
  const [rows, setRows] = useState(initialData)
  const add = (row) => { setRows(prev => [{ ...row, id: String(Date.now()) }, ...prev]); return {} }
  const remove = (id) => {
    const target = rows.find(r => r.id === id)
    setRows(prev => prev.filter(r => r.id !== id))
    return { undoTarget: target }
  }
  const undo = (target) => { setRows(prev => [target, ...prev]); return {} }
  return { rows, loading: false, error: null, add, remove, undo }
}

function useMockGoal(initial) {
  const [goal, setGoal] = useState(initial)
  return { goal, loading: false, save: (g) => { setGoal(g); return {} } }
}

function useMockCategories(initial) {
  const [rows, setRows] = useState(initial)
  const add = (name, color) => { setRows(prev => [...prev, { id: String(Date.now()), name, color, sort_order: prev.length }]); return {} }
  const update = (id, fields) => { setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r)); return {} }
  const remove = (id) => { setRows(prev => prev.filter(r => r.id !== id)); return {} }
  return { rows, loading: false, add, update, remove }
}

function useMockLimits(initial) {
  const [map, setMap] = useState(initial)
  const setLimit = (category, v) => { setMap(prev => ({ ...prev, [category]: v })); return {} }
  return { map, loading: false, setLimit }
}

// Export mock hooks for use in MagiBudget
export function useDemoData() {
  return {
    income: useMockTable(MOCK_INCOME),
    expenses: useMockTable(MOCK_EXPENSES),
    savings: useMockTable(MOCK_SAVINGS),
    goalState: useMockGoal(MOCK_GOAL),
    cats: useMockCategories(MOCK_CATEGORIES),
    limits: useMockLimits(MOCK_LIMITS),
    isDemo: true,
  }
}
