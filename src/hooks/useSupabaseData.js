import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { DEFAULT_CATEGORIES } from '../lib/theme'

/**
 * Per-user collection table with realtime sync and soft delete.
 */
export function useTable(table, userId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const undoStack = useRef([])

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!userId) return
    let active = true
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) setError(error.message)
      else setRows(data || [])
      setLoading(false)
    })()

    // Realtime: cross-device sync
    const channel = supabase
      .channel(`${table}-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        (payload) => {
          setRows((prev) => {
            if (payload.eventType === 'INSERT') {
              if (prev.find((r) => r.id === payload.new.id)) return prev
              if (payload.new.deleted_at) return prev
              return [payload.new, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              if (payload.new.deleted_at) {
                return prev.filter((r) => r.id !== payload.new.id)
              }
              return prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((r) => r.id !== payload.old.id)
            }
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
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
      setRows((prev) => (prev.find((r) => r.id === data.id) ? prev : [data, ...prev]))
      return { data }
    },
    [table, userId]
  )

  // Soft delete with undo
  const remove = useCallback(
    async (id) => {
      const target = rows.find((r) => r.id === id)
      if (!target) return {}
      setRows((prev) => prev.filter((r) => r.id !== id))
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        setError(error.message)
        setRows((prev) => [target, ...prev])
        return { error }
      }
      undoStack.current.push(target)
      return { undoTarget: target }
    },
    [table, rows]
  )

  const undo = useCallback(
    async (target) => {
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', target.id)
      if (error) {
        setError(error.message)
        return { error }
      }
      setRows((prev) => (prev.find((r) => r.id === target.id) ? prev : [target, ...prev]))
      return {}
    },
    [table]
  )

  return { rows, loading, error, add, remove, undo }
}

/**
 * Single-row goal with realtime.
 */
export function useGoal(userId) {
  const [goal, setGoal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('goals')
        .select('savings_goal')
        .eq('user_id', userId)
        .maybeSingle()
      if (!active) return
      setGoal(Number(data?.savings_goal) || 0)
      setLoading(false)
    })()

    const ch = supabase
      .channel(`goals-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        (p) => setGoal(Number(p.new?.savings_goal) || 0)
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(ch)
    }
  }, [userId])

  const save = useCallback(
    async (newGoal) => {
      const { error } = await supabase.from('goals').upsert({
        user_id: userId,
        savings_goal: newGoal,
        updated_at: new Date().toISOString(),
      })
      if (error) return { error }
      setGoal(newGoal)
      return {}
    },
    [userId]
  )

  return { goal, loading, save }
}

/**
 * Custom categories. Seeds defaults on first login.
 */
export function useCategories(userId) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!active) return

      // Seed defaults on first login
      if (!data || data.length === 0) {
        const seed = DEFAULT_CATEGORIES.map((c, i) => ({
          ...c,
          user_id: userId,
          sort_order: i,
        }))
        const { data: inserted } = await supabase
          .from('categories')
          .insert(seed)
          .select()
        setRows(inserted || [])
      } else {
        setRows(data)
      }
      setLoading(false)
    })()

    const ch = supabase
      .channel(`categories-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        () => {
          // Refetch on any change (simpler than reconciling)
          supabase
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true })
            .then(({ data }) => setRows(data || []))
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(ch)
    }
  }, [userId])

  const add = useCallback(
    async (name, color) => {
      const { error } = await supabase
        .from('categories')
        .insert({ user_id: userId, name, color, sort_order: rows.length })
      return { error }
    },
    [userId, rows.length]
  )

  const update = useCallback(async (id, fields) => {
    const { error } = await supabase.from('categories').update(fields).eq('id', id)
    return { error }
  }, [])

  const remove = useCallback(async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    return { error }
  }, [])

  return { rows, loading, add, update, remove }
}

/**
 * Budget limits per category.
 */
export function useBudgetLimits(userId) {
  const [map, setMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let active = true
    ;(async () => {
      const { data } = await supabase.from('budget_limits').select('*')
      if (!active) return
      const m = {}
      ;(data || []).forEach((r) => {
        m[r.category] = Number(r.monthly_limit)
      })
      setMap(m)
      setLoading(false)
    })()

    const ch = supabase
      .channel(`limits-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budget_limits', filter: `user_id=eq.${userId}` },
        (p) => {
          setMap((prev) => {
            const next = { ...prev }
            if (p.eventType === 'DELETE') delete next[p.old.category]
            else next[p.new.category] = Number(p.new.monthly_limit)
            return next
          })
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(ch)
    }
  }, [userId])

  const setLimit = useCallback(
    async (category, monthlyLimit) => {
      if (!monthlyLimit || monthlyLimit <= 0) {
        await supabase.from('budget_limits').delete().eq('category', category)
        setMap((prev) => {
          const n = { ...prev }
          delete n[category]
          return n
        })
        return {}
      }
      const { error } = await supabase.from('budget_limits').upsert({
        user_id: userId,
        category,
        monthly_limit: monthlyLimit,
        updated_at: new Date().toISOString(),
      })
      if (!error) setMap((prev) => ({ ...prev, [category]: monthlyLimit }))
      return { error }
    },
    [userId]
  )

  return { map, loading, setLimit }
}
