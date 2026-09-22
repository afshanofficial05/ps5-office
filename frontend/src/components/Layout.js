import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';

import ArenaDataLoader from './MorphingInfinity';

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
        backgroundColor: 'var(--bg-main)'
      }}>
        <ArenaDataLoader text="Loading PSO Gaming Arena..." />
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

