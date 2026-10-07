import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Megaphone, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GlobalAnnouncementPopup() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAnnouncements = async () => {
      try {
        const announcements = await api.getAnnouncements();
        // Find the first announcement that has show_popup = true and is NOT acknowledged (or read if ack is not required)
        const popupAnnouncement = announcements.find(a => 
          a.show_popup && 
          ((a.requires_ack && !a.is_acknowledged) || (!a.requires_ack && !a.is_read))
        );

        if (popupAnnouncement) {
          setAnnouncement(popupAnnouncement);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Failed to fetch global announcements for popup', err);
      }
    };

    fetchAnnouncements();
  }, [user]);

  const handleDismiss = async () => {
    if (!announcement) return;
    setIsSubmitting(true);
    try {
      if (announcement.requires_ack) {
        await api.acknowledgeAnnouncement(announcement.id);
      } else {
        await api.markAnnouncementRead(announcement.id);
      }
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to dismiss announcement', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !announcement) return null;

  const isImportant = announcement.type === 'IMPORTANT';
  const isWarning = announcement.type === 'WARNING';
  const isUpdate = announcement.type === 'UPDATE';

  const bgColor = isImportant ? '#fef2f2' : isWarning ? '#fffbeb' : isUpdate ? '#f0fdf4' : '#eff6ff';
  const iconColor = isImportant ? '#ef4444' : isWarning ? '#f59e0b' : isUpdate ? '#10b981' : '#3b82f6';
  const btnColor = isImportant ? '#ef4444' : isWarning ? '#f59e0b' : isUpdate ? '#10b981' : '#2563eb';
  const btnTextColor = '#ffffff';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative'
      }}>
        {!announcement.requires_ack && (
          <button 
            onClick={handleDismiss}
            disabled={isSubmitting}
            style={{
              position: 'absolute',
              top: '16px', right: '16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s ease',
              zIndex: 10
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        )}

        <div style={{ padding: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: bgColor,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: `0 8px 20px ${bgColor}`
          }}>
            <Megaphone size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', lineHeight: 1.2 }}>
            {announcement.title}
          </h2>
          
          <div style={{ 
            fontSize: '1rem', 
            color: '#475569', 
            lineHeight: 1.6, 
            marginBottom: '24px',
            whiteSpace: 'pre-wrap'
          }}>
            {announcement.message}
          </div>

          {announcement.action_url && (
            <a 
              href={announcement.action_url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: btnColor,
                fontWeight: 700,
                textDecoration: 'none',
                marginBottom: '24px',
                fontSize: '0.95rem'
              }}
            >
              {announcement.action_text || 'Learn More'} <ChevronRight size={16} />
            </a>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {announcement.requires_ack ? (
              <button
                onClick={handleDismiss}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: btnColor,
                  color: btnTextColor,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.2s',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Processing...' : 'I Understand & Acknowledge'}
              </button>
            ) : (
              <button
                onClick={handleDismiss}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                {isSubmitting ? 'Dismissing...' : 'Dismiss'}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
