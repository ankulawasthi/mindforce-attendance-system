import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Fingerprint Icon */}
        <div style={styles.iconWrap}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
            <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
            <path d="M2 12a10 10 0 0 1 18-6"/>
            <path d="M2 17.5a14.5 14.5 0 0 0 4.56 5.5"/>
            <path d="M6 10.5A7.5 7.5 0 0 1 19 10"/>
            <path d="M6.5 17.5A16 16 0 0 0 8 20"/>
            <path d="M9 14.5A7 7 0 0 0 9.1 17"/>
          </svg>
        </div>

        <h2 style={styles.title}>Attendance System</h2>
        <p style={styles.subtitle}>Smart Employee Tracking</p>

        {error && (
          <div style={styles.error}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>✉️</span>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, opacity: loading ? 0.8 : 1 }}
          >
            {loading ? 'Signing in...' : '→ Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a8a7a 0%, #2d6bcf 50%, #6b3fcf 100%)',
  },
  card: {
    background: '#ffffff',
    padding: '2.5rem 2rem',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '380px',
    textAlign: 'center',
  },
  iconWrap: {
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a8a7a, #2d6bcf)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
    boxShadow: '0 8px 24px rgba(45,107,207,0.35)',
  },
  title: {
    margin: '0 0 6px',
    fontSize: '22px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    margin: '0 0 1.75rem',
    fontSize: '13px',
    color: '#888',
  },
  error: {
    background: '#fff0f0',
    color: '#e53e3e',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '13px',
    textAlign: 'left',
  },
  field: {
    marginBottom: '1.25rem',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#444',
    marginBottom: '6px',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#f9fafb',
  },
  inputIcon: {
    padding: '0 12px',
    fontSize: '15px',
    background: '#f9fafb',
  },
  input: {
    flex: 1,
    padding: '11px 12px 11px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    background: '#f9fafb',
    color: '#1a1a2e',
    width: '100%',
  },
  button: {
    width: '100%',
    padding: '13px',
    background: 'linear-gradient(135deg, #2d6bcf, #6b3fcf)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '0.5rem',
    letterSpacing: '0.3px',
  },
}