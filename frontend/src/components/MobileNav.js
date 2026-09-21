import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { api } from '../services/api';
import {
  Menu, X, Home, Swords, Trophy, Shield, User, History,
  CheckSquare, Users, Settings, FileText, LogOut, ChevronRight,
  Gamepad2, PlusCircle, Calendar, BarChart3, Plus, Camera, KeyRound, Sparkles, Award, Bug, Bell
} from 'lucide-react';

export default function MobileNav() {
  const router = useRouter();
  const { user, logout, hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api.getInAppNotifications(10).then((items) => {
        if (Array.isArray(items)) {
          setUnreadCount(items.filter(n => n && !n.is_read).length);
        }
      }).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 25000);
    return () => clearInterval(interval);
  }, [user]);

  // Close drawer and action sheet on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(false);
      setIsActionSheetOpen(false);
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  // Lock body scroll when drawer or action sheet is open
  useEffect(() => {
    if (isOpen || isActionSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isActionSheetOpen]);

  if (!user) return null;

  const role = user.role;

  // Primary Bottom Tabs
  const getBottomNavItems = () => {
    if (role === 'SUPER_ADMIN') {
      return [
        { href: '/super-admin', label: 'Console', icon: Shield },
        { href: '/super-admin/admins', label: 'Admins', icon: Users },
        { href: '/admin/seasons', label: 'Seasons', icon: Calendar },
        { href: '/admin/teams', label: 'Teams', icon: Gamepad2 },
        { href: '/profile', label: 'Profile', icon: User },
      ];
    }
    if (role === 'ADMIN') {
      const items = [{ href: '/admin', label: 'Overview', icon: Home }];
      if (hasPermission && hasPermission('VIEW_SEASON')) {
        items.push({ href: '/admin/seasons', label: 'Seasons', icon: Calendar });
      }
      if (hasPermission && hasPermission('VERIFY_RESULTS')) {
        items.push({ href: '/admin/pending', label: 'Approvals', icon: CheckSquare });
      } else if (hasPermission && hasPermission('VIEW_TEAMS')) {
        items.push({ href: '/admin/teams', label: 'Teams', icon: Shield });
      }
      if (items.length < 4 && hasPermission && hasPermission('VIEW_PLAYERS')) {
        items.push({ href: '/admin/players', label: 'Players', icon: Users });
      }
      items.push({ href: '/profile', label: 'Profile', icon: User });
      return items;
    }
    // Default Player items with Elevated Center Action Button
    return [
      { href: '/dashboard', label: 'Home', icon: Home },
      { href: '/leaderboards', label: 'Ranks', icon: Trophy },
      { href: '#action', label: 'Quick Action', icon: Plus, isAction: true },
      { href: '/matches/history', label: 'Matches', icon: Swords },
      { href: '/profile', label: 'Profile', icon: User },
    ];
  };

  // Full Drawer Menu Items
  const getDrawerNavSections = () => {
    const sections = [];

    // Player Section (visible only to competitive players)
    if (role === 'USER') {
      sections.push({
        title: 'Player Arena',
        items: [
          { href: '/dashboard', label: 'Dashboard', icon: Home },
          { href: '/matches/create', label: 'Create Match', icon: Swords },
          { href: '/matches/join', label: 'Join Match', icon: PlusCircle },
          { href: '/matches/submit', label: 'Submit Result', icon: CheckSquare },
          { href: '/leaderboards', label: 'Leaderboards', icon: Trophy },
          { href: '/matches/history', label: 'Match History', icon: History },
          { href: '/settings/notifications', label: 'Notifications & Alerts', icon: Bell },
          { href: '/bugs', label: 'Report a Bug', icon: Bug },
        ],
      });
    }

    // Admin Section
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const rawAdminItems = [
        { href: '/admin', label: 'Admin Hub', icon: Shield, perm: null },
        { href: '/admin/achievements', label: 'Achievements & Badges', icon: Award, perm: null },
        { href: '/admin/seasons', label: 'Season Management', icon: Calendar, perm: 'VIEW_SEASON' },
        { href: '/admin/pending', label: 'Pending Results', icon: CheckSquare, perm: 'VERIFY_RESULTS' },
        { href: '/admin/teams', label: 'Teams & Requests', icon: Gamepad2, perm: 'VIEW_TEAMS' },
        { href: '/admin/players', label: 'Player Accounts', icon: Users, perm: 'VIEW_PLAYERS' },
        { href: '/admin/manual', label: 'Record Match', icon: Swords, perm: 'MANUAL_MATCH_CREATE' },
        { href: '/admin/bugs', label: 'Bug Reports', icon: Bug, perm: null },
        { href: '/admin/reports', label: 'Platform Reports', icon: BarChart3, perm: 'VIEW_REPORTS' },
        { href: '/settings/notifications', label: 'Notifications & Alerts', icon: Bell, perm: null },
        { href: '/leaderboards', label: 'Leaderboards', icon: Trophy, perm: null },
        { href: '/matches/history', label: 'Match History', icon: History, perm: null },
      ];

      const visibleAdminItems = rawAdminItems.filter(item => !item.perm || (hasPermission && hasPermission(item.perm)));

      if (visibleAdminItems.length > 0) {
        sections.push({
          title: 'Admin Management',
          items: visibleAdminItems,
        });
      }
    }

    // Super Admin Section
    if (role === 'SUPER_ADMIN') {
      sections.push({
        title: 'Super Admin Core',
        items: [
          { href: '/super-admin', label: 'Executive Console', icon: Shield },
          { href: '/super-admin/admins', label: 'Staff Management', icon: Users },
          { href: '/admin/bugs', label: 'Bug Reports', icon: Bug },
          { href: '/super-admin/players', label: 'Rating Overrides', icon: Trophy },
          { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText },
          { href: '/settings/notifications', label: 'Notifications & Alerts', icon: Bell },
          { href: '/super-admin/settings', label: 'System Settings', icon: Settings },
        ],
      });
    }

    // Account
    sections.push({
      title: 'Account',
      items: [
        { href: '/settings/notifications', label: 'Notification Settings & Diagnostics', icon: Bell },
        { href: '/profile', label: 'My Profile & Photo', icon: User },
      ],
    });

    return sections;
  };

  const bottomItems = getBottomNavItems();
  const drawerSections = getDrawerNavSections();

  return (
    <div className="mobile-nav-root">
      {/* 1. Mobile Top Header */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="mobile-brand-icon">
            <Gamepad2 size={16} color="#ffffff" />
          </div>
          <div>
            <h1 className="mobile-brand-title">PSO GAMING</h1>
            <span className="mobile-brand-subtitle">
              {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin Portal' : 'Office League'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mobile Top Notification Bell */}
          <Link
            href="/settings/notifications"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              position: 'relative',
              textDecoration: 'none'
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '8px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff',
                padding: '0 3px'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <Link href="/profile" style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              src={user.profile_photo}
              name={user.name}
              size="sm"
              borderColor="#3b82f6"
            />
          </Link>
          <button
            type="button"
            className="mobile-menu-trigger"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X size={18} color="#0f172a" /> : <Menu size={18} color="#0f172a" />}
          </button>
        </div>
      </header>

      {/* 2. Mobile Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="mobile-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with Avatar & User Info */}
            <div className="mobile-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar
                  src={user.profile_photo}
                  name={user.name}
                  size="lg"
                  borderColor="#2563eb"
                />
                <div style={{ minWidth: 0 }}>
                  <p className="mobile-drawer-name">{user.name}</p>
                  <p className="mobile-drawer-email">{user.email}</p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <span className="badge badge-primary">{user.player_id}</span>
                    <span className={role !== 'USER' ? 'badge badge-amber' : 'badge badge-emerald'}>
                      {role}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Navigation Sections */}
            <div className="mobile-drawer-scroll">
              {drawerSections.map((sec, idx) => (
                <div key={idx} className="mobile-drawer-section">
                  <div className="mobile-drawer-section-title">{sec.title}</div>
                  <div className="mobile-drawer-links">
                    {sec.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = router.pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`mobile-drawer-link ${isActive ? 'active' : ''}`}
                          onClick={() => setIsOpen(false)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Icon size={18} />
                            <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                          </div>
                          <ChevronRight size={14} opacity={isActive ? 1 : 0.4} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="mobile-drawer-footer">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="mobile-drawer-logout-btn"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.5 Native Mobile Action Sheet (Triggered by Center [+] Button) */}
      {isActionSheetOpen && (
        <div className="mobile-actionsheet-backdrop" onClick={() => setIsActionSheetOpen(false)}>
          <div className="mobile-actionsheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-actionsheet-handle" />

            <div className="mobile-actionsheet-header">
              <div>
                <h3 className="mobile-actionsheet-title">Match Central</h3>
                <p className="mobile-actionsheet-sub">What would you like to do?</p>
              </div>
              <button
                type="button"
                className="mobile-actionsheet-close"
                onClick={() => setIsActionSheetOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mobile-actionsheet-grid">
              {/* Action 1: Submit Match Result with Proof */}
              <Link
                href="/matches/submit"
                className="mobile-action-item primary-action"
                onClick={() => setIsActionSheetOpen(false)}
              >
                <div className="mobile-action-icon-wrap primary">
                  <Camera size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="mobile-action-name">Submit Match Result</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>Fast Proof</span>
                  </div>
                  <p className="mobile-action-desc">Upload screenshot proof and record 1v1 / 2v2 score</p>
                </div>
                <ChevronRight size={15} color="#94a3b8" />
              </Link>

              {/* Action 2: Create / Challenge Match */}
              <Link
                href="/matches/create"
                className="mobile-action-item"
                onClick={() => setIsActionSheetOpen(false)}
              >
                <div className="mobile-action-icon-wrap violet">
                  <Swords size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="mobile-action-name">Create Match Challenge</span>
                  <p className="mobile-action-desc">Start a live 1v1 or 2v2 competitive room</p>
                </div>
                <ChevronRight size={15} color="#94a3b8" />
              </Link>

              {/* Action 3: Join Match with Code */}
              <Link
                href="/matches/join"
                className="mobile-action-item"
                onClick={() => setIsActionSheetOpen(false)}
              >
                <div className="mobile-action-icon-wrap amber">
                  <KeyRound size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="mobile-action-name">Join with Room Code</span>
                  <p className="mobile-action-desc">Enter 6-digit match pin to join opponent</p>
                </div>
                <ChevronRight size={15} color="#94a3b8" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. Mobile Bottom Navigation Bar (PWA Dock) */}
      <nav className="mobile-bottom-bar">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href;

          if (item.isAction) {
            return (
              <button
                key={item.label}
                type="button"
                className="mobile-bottom-action-trigger"
                onClick={() => setIsActionSheetOpen(true)}
                aria-label="Quick Action Menu"
              >
                <div className="mobile-fab-circle">
                  <Plus size={18} color="#ffffff" strokeWidth={2.2} />
                </div>
                <span className="mobile-tab-label action-label">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-bottom-tab ${isActive ? 'active' : ''}`}
            >
              <div className="mobile-tab-icon-wrap">
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <span className="mobile-tab-label">{item.label}</span>
              {isActive && <span className="mobile-tab-active-dot" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
