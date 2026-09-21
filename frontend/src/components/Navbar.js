import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { api } from '../services/api';
import { 
  LogOut, Plus, Bell, ShieldCheck, Sparkles, CheckSquare, Settings, Check, ExternalLink 
} from 'lucide-react';

export default function Navbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const items = await api.getInAppNotifications(10);
      setNotifications(items || []);
      const unread = (items || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (err) {
      // Ignore background errors
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await api.markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (e) {
        // Ignore
      }
    }
    setIsOpen(false);
    if (notif.data_url) {
      router.push(notif.data_url);
    }
  };

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
        {/* Notification Bell & Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              position: 'relative'
            }}
            title="Notifications"
          >
            <Bell size={18} />
            {/* Red Alert Dot / Badge */}
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: '18px',
                height: '18px',
                borderRadius: '9px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff',
                padding: '0 4px'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Interactive Notification Drawer Dropdown */}
          {isOpen && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: '0',
              width: '340px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
              zIndex: 1000,
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease'
            }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a' }}>
                  Notifications
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f8fafc',
                        backgroundColor: n.is_read ? '#ffffff' : '#f0f7ff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '1.1rem', marginTop: '1px' }}>
                        {n.type === 'ROOM_CREATED' ? '⚽' : n.type === 'LEADERBOARD_UPDATE' ? '🏆' : '🎮'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: n.is_read ? 600 : 700, fontSize: '0.82rem', color: '#0f172a' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px', lineHeight: 1.3 }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {!n.is_read && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb', marginTop: '6px' }} />
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer: Link to Diagnostics & Settings */}
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <Link
                  href="/settings/notifications"
                  onClick={() => setIsOpen(false)}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none'
                  }}
                >
                  <Settings size={14} />
                  <span>Diagnostics & Push Settings</span>
                </Link>
              </div>
            </div>
          )}
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

