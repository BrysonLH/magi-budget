import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { theme } from '../lib/theme'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  return (
    <div
      style={{
        background: theme.BG,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(255,140,0,0.02) 0px, rgba(255,140,0,0.02) 1px, transparent 1px, transparent 3px)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          border: `1px solid ${theme.BORDER}`,
          background: theme.PANEL,
          padding: '32px 24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: 16,
            background: theme.BG,
            padding: '0 8px',
            fontSize: 9,
            color: theme.AMBER,
            letterSpacing: 3,
          }}
        >
          ACCESS_TERMINAL
        </div>

        <h1
          style={{
            color: theme.AMBER,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 4,
            margin: '0 0 6px',
          }}
        >
          MAGI · SYSTEM
        </h1>
        <p style={{ color: theme.MUTED, fontSize: 10, letterSpacing: 2, marginTop: 0, marginBottom: 28 }}>
          BUDGET INTERFACE // AUTHORIZATION REQUIRED
        </p>

        {status === 'sent' ? (
          <div>
            <div
              style={{
                color: theme.GREEN,
                fontSize: 12,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              ✓ MAGIC LINK DISPATCHED
            </div>
            <div style={{ color: theme.TEXT, fontSize: 12, lineHeight: 1.6 }}>
              Check <span style={{ color: theme.AMBER }}>{email}</span> for a sign-in link.
            </div>
            <div style={{ color: theme.MUTED, fontSize: 10, marginTop: 12, letterSpacing: 1 }}>
              Link expires in 1 hour. Check spam if not received.
            </div>
            <button
              onClick={() => {
                setStatus('idle')
                setEmail('')
              }}
              style={{
                marginTop: 20,
                background: 'transparent',
                color: theme.MUTED,
                border: `1px solid ${theme.BORDER}`,
                padding: '8px 14px',
                fontSize: 10,
                letterSpacing: 2,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              ← Use different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: 'block',
                fontSize: 9,
                color: theme.MUTED,
                letterSpacing: 2,
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: '100%',
                background: '#070503',
                border: `1px solid ${theme.BORDER}`,
                color: theme.TEXT,
                padding: '10px 12px',
                fontSize: 13,
                outline: 'none',
                marginBottom: 16,
              }}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                width: '100%',
                background: theme.AMBER,
                color: theme.BG,
                border: 'none',
                padding: '11px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                cursor: status === 'sending' ? 'wait' : 'pointer',
                textTransform: 'uppercase',
                opacity: status === 'sending' ? 0.6 : 1,
              }}
            >
              {status === 'sending' ? 'DISPATCHING...' : 'SEND MAGIC LINK'}
            </button>
            {status === 'error' && (
              <div style={{ color: theme.RED, fontSize: 11, marginTop: 12, letterSpacing: 1 }}>
                ERROR: {errorMsg}
              </div>
            )}
          </form>
        )}

        <div
          style={{
            marginTop: 28,
            paddingTop: 14,
            borderTop: `1px dashed ${theme.BORDER}`,
            fontSize: 9,
            color: theme.AMBER_DIM,
            letterSpacing: 2,
            textAlign: 'center',
          }}
        >
          NERV INTERNAL USE ONLY
        </div>
      </div>
    </div>
  )
}
