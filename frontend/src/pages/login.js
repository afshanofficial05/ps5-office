import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { Gamepad2, Lock, Mail, User, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import FootballLoader from '../components/FootballLoader';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  const startSlowTimer = () => {
    setIsSlowLoading(false);
    return setTimeout(() => {
      setIsSlowLoading(true);
    }, 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const slowTimer = startSlowTimer();

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      clearTimeout(slowTimer);
      setIsSlowLoading(false);
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    const slowTimer = startSlowTimer();
    try {
      await login(demoEmail, demoPassword);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      clearTimeout(slowTimer);
      setIsSlowLoading(false);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      backgroundColor: '#f0f4f9'
    }}>
      <Head>
        <title>Sign In | PSO Gaming Platform</title>
      </Head>

      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px',
        position: 'relative',
        zIndex: 1,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }}>
        {/* Logo and Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
            marginBottom: '14px'
          }}>
            <Gamepad2 size={30} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            PSO GAMING ARENA
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px' }}>
            {isRegister ? 'Register your player profile' : 'Sign in to challenge colleagues & climb the leaderboard'}
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '8px 0', animation: 'fadeIn 0.3s ease' }}>
            <FootballLoader
              title={isRegister ? "Creating Player Profile..." : "Entering PSO Arena..."}
              subtitle={isRegister ? "Setting up player profile & initial 1200 Elo ranking" : "Authenticating credentials & syncing player statistics"}
              isColdStart={isSlowLoading}
            />
            {isSlowLoading && (
              <div style={{ textAlign: 'center', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setLoading(false); setIsSlowLoading(false); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '0.8rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                >
                  Cancel and try again
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isRegister && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Mercer"
                      className="form-input"
                      style={{ paddingLeft: '42px' }}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Office Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    required
                    placeholder="you@pso.com"
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', padding: '12px' }}
              >
                {isRegister ? 'Create Account' : 'Sign In'}
                <ArrowRight size={18} />
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isRegister ? 'Already have an account? Sign In' : 'New player? Create an account'}
              </button>
            </div>

            {/* Demo Login Shortcuts */}
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', justifyContent: 'center' }}>
                <Zap size={14} color="#2563eb" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  One-Click Demo Credentials
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('alex@pso.com', 'player123')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '8px', borderRadius: '10px' }}
                >
                  ⚽ Alex (Player 1)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('sarah@pso.com', 'player123')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '8px', borderRadius: '10px' }}
                >
                  ⚽ Sarah (Player 2)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin@pso.com', 'admin123')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '8px', borderRadius: '10px' }}
                >
                  🛡️ Gaming Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('superadmin@pso.com', 'admin123')}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '8px', borderRadius: '10px' }}
                >
                  👑 Super Admin
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
