import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { theme } from './lib/theme'
import Auth from './components/Auth'
import MagiBudget from './components/MagiBudget'

const isDemo = new URLSearchParams(window.location.search).has('demo')

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(!isDemo)

  useEffect(() => {
    if (isDemo) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ background: theme.BG, color: theme.AMBER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, letterSpacing: 4, fontFamily: 'monospace' }}>
        BOOTING MAGI...
      </div>
    )
  }

  if (isDemo) {
    return <MagiBudget session={{ user: { id: 'demo', email: 'demo@magi.sys' } }} demoMode />
  }

  return session ? <MagiBudget session={session} /> : <Auth />
}
