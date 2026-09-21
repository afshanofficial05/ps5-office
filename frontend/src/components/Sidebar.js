import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { 
  Gamepad2, Swords, Trophy, History, User, Users, Shield, 
  Settings, CheckSquare, PlusCircle, LogIn, FileText, Activity, ShieldCheck,
  HelpCircle, Home, ChevronRight, Sparkles, LayoutDashboard, Calendar, BarChart3, Award, Bug
} from 'lucide-react';

export default function Sidebar() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  if (!user) return null;

  const role = user.role;

  const userNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Create Match', href: '/matches/create', icon: PlusCircle },
    { label: 'Join Match', href: '/matches/join', icon: LogIn },
    { label: 'Submit Result', href: '/matches/submit', icon: CheckSquare },
    { label: 'Leaderboards', href: '/leaderboards', icon: Trophy },
    { label: 'My Matches', href: '/matches/history', icon: History },
    { label: 'Notifications', href: '/settings/notifications', icon: Bell },
    { label: 'Report a Bug', href: '/bugs', icon: Bug },
    { label: 'My Profile', href: '/profile', icon: User },
  ];

  const adminNavRaw = [
    { label: 'Admin Overview', href: '/admin', icon: Activity, requiredPerm: null },
    { label: 'Achievements', href: '/admin/achievements', icon: Award, requiredPerm: null },
    { label: 'Seasons', href: '/admin/seasons', icon: Calendar, requiredPerm: 'VIEW_SEASON' },
    { label: 'Pending Verification', href: '/admin/pending', icon: CheckSquare, requiredPerm: 'VERIFY_RESULTS' },
    { label: 'Manual Match Entry', href: '/admin/manual', icon: Swords, requiredPerm: 'MANUAL_MATCH_CREATE' },
    { label: 'Players Directory', href: '/admin/players', icon: Users, requiredPerm: 'VIEW_PLAYERS' },
    { label: 'Teams Database', href: '/admin/teams', icon: Shield, requiredPerm: 'VIEW_TEAMS' },
    { label: 'Bug Reports', href: '/admin/bugs', icon: Bug, requiredPerm: null },
    { label: 'Platform Reports', href: '/admin/reports', icon: BarChart3, requiredPerm: 'VIEW_REPORTS' },
    { label: 'Notifications', href: '/settings/notifications', icon: Bell, requiredPerm: null },
    { label: 'Leaderboards', href: '/leaderboards', icon: Trophy, requiredPerm: null },
    { label: 'Match History', href: '/matches/history', icon: History, requiredPerm: null },
  ];

  const adminNav = adminNavRaw.filter(item => !item.requiredPerm || (hasPermission && hasPermission(item.requiredPerm)));

  const superAdminNav = [
    { label: 'Super Dashboard', href: '/super-admin', icon: Activity },
    { label: 'Achievements', href: '/admin/achievements', icon: Award },
    { label: 'Admin Management', href: '/super-admin/admins', icon: ShieldCheck },
    { label: 'Seasons', href: '/admin/seasons', icon: Calendar },
    { label: 'Player Management', href: '/super-admin/players', icon: Users },
    { label: 'Pending Results', href: '/admin/pending', icon: CheckSquare },
    { label: 'Manual Match', href: '/admin/manual', icon: Swords },
    { label: 'Teams & Ratings', href: '/admin/teams', icon: Shield },
    { label: 'Bug Reports', href: '/admin/bugs', icon: Bug },
    { label: 'Platform Reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Notifications', href: '/settings/notifications', icon: Bell },
    { label: 'Leaderboards', href: '/leaderboards', icon: Trophy },
    { label: 'System Settings', href: '/super-admin/settings', icon: Settings },
    { label: 'Audit Logs', href: '/super-admin/audit-logs', icon: FileText },
  ];

  let navItems = userNav;
  let sectionTitle = 'Player Arena';
  if (role === 'SUPER_ADMIN') {
    navItems = superAdminNav;
    sectionTitle = 'Super Admin Arena';
  } else if (role === 'ADMIN') {
    navItems = adminNav;
    sectionTitle = 'Gaming Admin Arena';
  }


  return (
    <aside className="desktop-sidebar" style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40,
      padding: '24px 16px 16px 16px',
      boxShadow: '2px 0 10px rgba(0, 0, 0, 0.02)'
    }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '20px', paddingLeft: '4px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
        }}>
          <Gamepad2 size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            PSO GAMING
          </h1>
          <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            FC COMPETITION
          </p>
        </div>
      </div>

      {/* Arena Pill Highlight */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.92rem',
          boxShadow: '0 6px 16px rgba(37, 99, 235, 0.28)'
        }}>
          <Home size={18} />
          <span>{sectionTitle}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563eb' : '#64748b',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} color={isActive ? '#2563eb' : '#94a3b8'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Card */}
      <Link
        href="/profile"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          marginBottom: '14px',
          textDecoration: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <Avatar
            src={user.profile_photo}
            name={user.name}
            size="sm"
            status="online"
            borderColor="#cbd5e1"
          />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </p>
            <p style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
              {user.player_id}
            </p>
          </div>
        </div>
        <ChevronRight size={16} color="#94a3b8" />
      </Link>

      {/* Sidebar Footer Links */}
      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Link
          href="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            color: '#64748b',
            fontSize: '0.8rem',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 500
          }}
        >
          <Settings size={15} color="#94a3b8" />
          <span>Settings</span>
        </Link>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert('PSO Gaming Platform v1.0. For support contact FC Admins.'); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            color: '#64748b',
            fontSize: '0.8rem',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 500
          }}
        >
          <HelpCircle size={15} color="#94a3b8" />
          <span>Help & Support</span>
        </a>
        <div style={{
          fontSize: '0.68rem',
          color: '#94a3b8',
          padding: '6px 8px 0 8px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Gamepad2 size={13} />
          <span>Play · Compete · Level Up</span>
        </div>
      </div>
    </aside>
  );
}
