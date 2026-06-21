import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginModal() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (res.ok) {
        const data = await res.json()
        login(data.token, data.user)
      } else if (res.status === 401) {
        setError('Email ou mot de passe incorrect')
      } else {
        setError('Erreur de connexion')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--gh-canvas-default)' }}>
      <div style={{
        background: 'var(--gh-canvas-subtle)',
        border: '1px solid var(--gh-border-default)',
        borderRadius: '6px',
        padding: '32px',
        width: '320px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <svg height="32" viewBox="0 0 16 16" width="32" style={{ fill: 'var(--gh-text-primary)', margin: '0 auto 12px', display: 'block' }}>
            <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
          </svg>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--gh-text-primary)', marginBottom: '4px' }}>TaskHorizon</h1>
          <p style={{ fontSize: '14px', color: 'var(--gh-text-muted)' }}>Connectez-vous pour continuer</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email"
            placeholder="Adresse email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            className="gh-input"
            autoFocus
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            className="gh-input"
            disabled={loading}
          />
          {error && (
            <p style={{ fontSize: '12px', color: 'var(--gh-danger-fg)', margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="gh-btn gh-btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
