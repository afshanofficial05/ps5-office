import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { 
  LogOut, Plus, Bell, ShieldCheck, Sparkles 
} from 'lucide-react';

export default function Navbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="desktop-navbar" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '20px',
      marginBottom: '28px',
      paddingBottom: '8px'
    }}>
      {/* Left: Greeting */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            {title ? title : `Welcome back, ${user?.name || 'Player'}`}
          </h1>
          <span style={{ fontSize: '1.6rem' }}>👋</span>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: '2px', fontWeight: 500 }}>
          {subtitle || 'Play. Compete. Climb the Ranks.'}
        </p>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => alert('No new match notifications')}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0f172a',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
            title="Notifications"
          >
            <Bell size={18} />
          </button>
          {/* Red Alert Dot */}
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid #ffffff'
          }} />
        </div>

        {/* Role-Specific Primary Action Button */}
        {user?.role === 'SUPER_ADMIN' ? (
          <Link href="/super-admin" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            <ShieldCheck size={16} />
            <span>Admin Console</span>
          </Link>
        ) : user?.role === 'ADMIN' ? (
          <Link href="/admin/pending" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            <CheckSquare size={16} />
            <span>Verify Matches</span>
          </Link>
        ) : (
          <Link href="/matches/create" className="btn btn-cyan" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
            <Plus size={16} />
            <span>Create Match</span>
          </Link>
        )}

        {/* Profile Link */}
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }} title="My Profile">
          <Avatar
            src={user?.profile_photo}
            name={user?.name}
            size="sm"
            borderColor="#cbd5e1"
          />
        </Link>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ padding: '9px 18px', fontSize: '0.88rem' }}
          title="Sign Out"
        >
          <LogOut size={16} color="#64748b" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

