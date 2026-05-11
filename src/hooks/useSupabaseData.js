import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook for a per-user collection table (income, expenses, savings).
 * Pulls rows for current user, exposes add/remove with optimistic updates.
 */
export function useTable(table, userId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setRows(data || [])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [table, userId])

  const add = useCallback(
    async (row) => {
      const { data, error } = await supabase
        .from(table)
        .insert({ ...row, user_id: userId })
        .select()
        .single()
      if (error) {
        setError(error.message)
        return { error }
      }
      setRows((prev) => [data, ...prev])
      return { data }
    },
    [table, userId]
  )

  const remove = useCallback(
    async (id) => {
      // Optimistic: remove from UI, rollback if it fails
      const snapshot = rows
      setRows((prev) => prev.filter((r) => r.id !== id))
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) {
        setError(error.message)
        setRows(snapshot)
        return { error }
      }
      return {}
    },
    [table, rows]
  )

  return { rows, loading, error, add, remove }
}

/**
 * Goal is a single row per user. Uses upsert.
 */
export function useGoal(userId) {
  const [goal, setGoal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('savings_goal')
        .eq('user_id', userId)
        .maybeSingle()
      if (!active) return
      if (error) setError(error.message)
      else setGoal(Number(data?.savings_goal) || 0)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [userId])

  const save = useCallback(
    async (newGoal) => {
      const { error } = await supabase.from('goals').upsert({
        user_id: userId,
        savings_goal: newGoal,
        updated_at: new Date().toISOString(),
      })
      if (error) {
        setError(error.message)
        return { error }
      }
      setGoal(newGoal)
      return {}
    },
    [userId]
  )

  return { goal, loading, error, save }
}
