import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';

export default function Layout({ children, title, subtitle, requireAuth = true, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.push('/login');
    }
    if (!loading && user && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect if role is not permitted
      if (user.role === 'SUPER_ADMIN') router.push('/super-admin');
      else if (user.role === 'ADMIN') router.push('/admin');
      else router.push('/dashboard');
    }
  }, [user, loading, requireAuth, allowedRoles, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '4px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Loading PSO Gaming Arena...</p>
      </div>
    );
  }

  if (requireAuth && !user) {
    return null;
  }

  return (
    <div className="app-layout">
      <MobileNav />
      <Sidebar />
      <main className="main-content">
        <Navbar title={title} subtitle={subtitle} />
        {children}
      </main>
    </div>
  );
}

