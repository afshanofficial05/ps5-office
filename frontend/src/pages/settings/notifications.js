import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeUserToPush,
  getExistingPushSubscription,
  unsubscribeUserFromPush,
  registerServiceWorker,
  syncDevicePushSubscription,
  getDeviceDetails
} from '../../utils/pushNotifications';
import {
  Bell, CheckCircle, AlertTriangle, XCircle, ShieldCheck, Zap,
  Send, RefreshCw, Smartphone, Radio, Settings, Trophy, Swords, ArrowRight, Info,
  Trash2, Laptop
} from 'lucide-react';

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  
  // Diagnostics states
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [swActive, setSwActive] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState('');
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [vapidConfigured, setVapidConfigured] = useState(false);
  const [vapidSubject, setVapidSubject] = useState('');
  
  // User Preferences
  const [notifyRooms, setNotifyRooms] = useState(true);
  const [notifyLeaderboard, setNotifyLeaderboard] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Test notification states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // In-app notifications
  const [notifications, setNotifications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const runDiagnostics = async () => {
    setRefreshing(true);
    setErrorMsg('');

    // 1. Check browser support
    const isSupp = isPushNotificationSupported();
    setSupported(isSupp);

    // 2. Check permission
    const perm = getNotificationPermission();
    setPermission(perm);

    // 3. Check service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await registerServiceWorker();
        setSwActive(!!reg);
      } catch (e) {
        setSwActive(false);
      }
    }

    // 4. Check existing browser subscription on this device
    const existingSub = await getExistingPushSubscription();
    setIsSubscribed(!!existingSub);
    setCurrentEndpoint(existingSub?.endpoint || '');

    // 5. Check backend VAPID status, registered devices & preferences
    try {
      const [vapidData, statusData, devicesData] = await Promise.all([
        api.getVapidPublicKey().catch(() => ({})),
        api.getNotificationStatus().catch(() => ({})),
        api.getRegisteredDevices().catch(() => ([]))
      ]);
      setVapidConfigured(!!vapidData.is_configured);
      setVapidSubject(vapidData.subject || '');
      setSubscriptionCount(statusData.active_subscriptions || 0);
      setRegisteredDevices(Array.isArray(devicesData) ? devicesData : []);
      if (statusData.notify_rooms !== undefined) setNotifyRooms(statusData.notify_rooms);
      if (statusData.notify_leaderboard !== undefined) setNotifyLeaderboard(statusData.notify_leaderboard);
    } catch (err) {
      console.error('Failed to load server notification status', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadHistory = async () => {
    try {
      const list = await api.getInAppNotifications(20);
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      setNotifications([]);
      console.error('Failed to load notification history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
    loadHistory();
  }, []);

  const handleSubscribeToggle = async () => {
    setErrorMsg('');
    setSubscribing(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const endpoint = await unsubscribeUserFromPush();
        if (endpoint) {
          await api.unsubscribePushNotification(endpoint);
        }
        setIsSubscribed(false);
        setCurrentEndpoint('');
      } else {
        // Subscribe / Sync with auto-recovery
        const res = await syncDevicePushSubscription(api, { forcePrompt: true });
        if (res.status === 'denied') {
          throw new Error('Notification permission was blocked in browser settings. Please allow notifications.');
        } else if (res.status === 'unsupported') {
          throw new Error('Push notifications are not supported on this browser or device.');
        } else if (res.status === 'error') {
          throw new Error(res.error || 'Failed to register push subscription.');
        }
        setIsSubscribed(true);
      }
      await runDiagnostics();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update push subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    try {
      await api.deleteRegisteredDevice(deviceId);
      await runDiagnostics();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove device');
    }
  };

  const handleSavePreferences = async (newRooms, newLeaderboard) => {
    setSavingPrefs(true);
    setPrefsSaved(false);
    try {
      await api.updateNotificationPreferences({
        notify_rooms: newRooms,
        notify_leaderboard: newLeaderboard
      });
      setNotifyRooms(newRooms);
      setNotifyLeaderboard(newLeaderboard);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSendTestPush = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMsg('');

    try {
      const res = await api.sendTestNotification();
      setTestResult(res);
      await loadHistory();
    } catch (err) {
      setErrorMsg(err.message || 'Test push notification failed');
    } finally {
      setTesting(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => Array.isArray(prev) ? prev.map(n => ({ ...n, is_read: true })) : []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout title="Notification Settings & Diagnostics" subtitle="Configure Web Push alerts and run system delivery checks">
      <Head>
        <title>Notifications & Diagnostics | PSO Gaming Arena</title>
      </Head>

      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Error Notification */}
        {errorMsg && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#b91c1c',
            padding: '14px 18px',
            borderRadius: '14px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Permission Granted but Subscription Missing Banner (Scenario 4 Recovery) */}
        {permission === 'granted' && !isSubscribed && (
          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            padding: '16px 20px',
            borderRadius: '16px',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}>
                <Zap size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#78350f' }}>
                  Permission Granted, But Device Not Registered
                </div>
                <div style={{ fontSize: '0.82rem', color: '#92400e', marginTop: '2px' }}>
                  Your browser allowed notifications, but this device does not have an active Web Push subscription yet. Click to sync and start receiving alerts.
                </div>
              </div>
            </div>

            <button
              onClick={handleSubscribeToggle}
              disabled={subscribing}
              className="btn btn-primary"
              style={{
                backgroundColor: '#d97706',
                border: 'none',
                fontSize: '0.84rem',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Smartphone size={15} />
              <span>{subscribing ? 'Registering...' : 'Sync & Connect This Device'}</span>
            </button>
          </div>
        )}

        {/* Top Diagnostics Card */}
        <div className="glass-card" style={{ padding: '24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Radio size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Web Push Diagnostics
                </h3>
                <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
                  Live verification of browser capabilities, VAPID encryption & device registration
                </p>
              </div>
            </div>

            <button
              onClick={runDiagnostics}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{ fontSize: '0.84rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              <span>{refreshing ? 'Testing...' : 'Re-check Diagnostics'}</span>
            </button>
          </div>

          {/* 4 Health Indicator Tiles */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '22px'
          }}>
            {/* Tile 1: Browser Support */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Browser Engine
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {supported ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : (
                  <XCircle size={18} color="#ef4444" />
                )}
                <span style={{ fontWeight: 700, fontSize: '0.94rem', color: supported ? '#065f46' : '#991b1b' }}>
                  {supported ? 'Web Push Ready' : 'Unsupported'}
                </span>
              </div>
            </div>

            {/* Tile 2: Permission */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Notification Permission
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {permission === 'granted' ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : permission === 'denied' ? (
                  <XCircle size={18} color="#ef4444" />
                ) : (
                  <AlertTriangle size={18} color="#f59e0b" />
                )}
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  color: permission === 'granted' ? '#065f46' : permission === 'denied' ? '#991b1b' : '#b45309'
                }}>
                  {permission === 'granted' ? 'Allowed (Granted)' : permission === 'denied' ? 'Blocked (Denied)' : 'Prompt Required'}
                </span>
              </div>
            </div>

            {/* Tile 3: Service Worker */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Service Worker (sw.js)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {swActive ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : (
                  <AlertTriangle size={18} color="#f59e0b" />
                )}
                <span style={{ fontWeight: 700, fontSize: '0.94rem', color: swActive ? '#065f46' : '#b45309' }}>
                  {swActive ? 'Active & Listening' : 'Pending Register'}
                </span>
              </div>
            </div>

            {/* Tile 4: VAPID Status */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                VAPID Cloud Keys
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {vapidConfigured ? (
                  <ShieldCheck size={18} color="#10b981" />
                ) : (
                  <XCircle size={18} color="#ef4444" />
                )}
                <span style={{ fontWeight: 700, fontSize: '0.94rem', color: vapidConfigured ? '#065f46' : '#991b1b' }}>
                  {vapidConfigured ? 'Secured & Active' : 'Not Configured'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Notification Action Row */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="#2563eb" /> Run Diagnostic Push Test
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#3b82f6', marginTop: '3px' }}>
                Dispatches an instant test push to all your registered devices to verify delivery, sound, and badge.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleSubscribeToggle}
                disabled={subscribing || !supported}
                className={isSubscribed ? 'btn btn-secondary' : 'btn btn-primary'}
                style={{ fontSize: '0.86rem', padding: '10px 18px' }}
              >
                <Smartphone size={16} />
                <span>{subscribing ? 'Updating...' : isSubscribed ? 'Disable on this device' : (permission === 'granted' ? 'Sync & Enable on this device' : 'Enable on this device')}</span>
              </button>

              <button
                onClick={handleSendTestPush}
                disabled={testing}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  fontSize: '0.86rem',
                  padding: '10px 20px'
                }}
              >
                <Send size={16} />
                <span>{testing ? 'Dispatching...' : 'Send Test Notification'}</span>
              </button>
            </div>
          </div>

          {/* Test Diagnostic Output */}
          {testResult && (
            <div style={{
              marginTop: '16px',
              padding: '14px 18px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '12px',
              fontSize: '0.84rem',
              color: '#166534',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} color="#16a34a" /> Diagnostic Test Dispatched Successfully!
              </div>
              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                • Devices registered for player: <strong>{testResult.devices_registered}</strong><br/>
                • Push packets delivered: <strong>{testResult.devices_delivered}</strong><br/>
                • VAPID Subject: <code>{testResult.subject}</code><br/>
                • Delivered at: {new Date(testResult.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Device Registered Devices Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <Smartphone size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Registered Devices ({registeredDevices.length})
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Notifications are delivered simultaneously to all active devices registered to your account
                </p>
              </div>
            </div>

            <button
              onClick={runDiagnostics}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              Refresh Devices
            </button>
          </div>

          {registeredDevices.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '28px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
              color: '#64748b',
              fontSize: '0.88rem'
            }}>
              No devices currently registered for push notifications. Click "Enable on this device" above to register your browser.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {registeredDevices.map((dev) => {
                const isCurrent = currentEndpoint && dev.endpoint === currentEndpoint;
                return (
                  <div
                    key={dev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: isCurrent ? '#f0fdf4' : '#f8fafc',
                      border: isCurrent ? '1px solid #86efac' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: isCurrent ? '#dcfce7' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isCurrent ? '#16a34a' : '#475569'
                      }}>
                        {dev.device_type === 'MOBILE' ? <Smartphone size={18} /> : <Laptop size={18} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                            {dev.device_name || 'Web Device'}
                          </span>
                          {isCurrent && (
                            <span style={{
                              backgroundColor: '#16a34a',
                              color: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px'
                            }}>
                              This Device
                            </span>
                          )}
                          <span style={{
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            {dev.device_type || 'DEVICE'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                          Last active: {dev.last_active_at ? new Date(dev.last_active_at).toLocaleString() : new Date(dev.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDevice(dev.id)}
                      className="btn btn-secondary"
                      style={{
                        fontSize: '0.78rem',
                        padding: '6px 12px',
                        color: '#b91c1c',
                        borderColor: '#fca5a5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Remove device from receiving notifications"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Notification Preferences
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
                Choose which arena events trigger Web Push notifications on your devices
              </p>
            </div>
            {prefsSaved && (
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={15} /> Saved
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Preference 1: Room Creation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <Swords size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                    Match Room Creation Alerts
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Receive instant push alerts whenever any colleague creates a 1v1 or 2v2 challenge room.
                  </div>
                </div>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyRooms}
                  disabled={savingPrefs}
                  onChange={(e) => handleSavePreferences(e.target.checked, notifyLeaderboard)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: notifyRooms ? '#2563eb' : '#cbd5e1',
                  borderRadius: '26px',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: notifyRooms ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    transition: '0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>

            {/* Preference 2: Leaderboard & Ratings */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706'
                }}>
                  <Trophy size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                    Leaderboard & Rating Updates
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Receive alerts when match results are verified, showing your Elo change and new leaderboard standing.
                  </div>
                </div>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={notifyLeaderboard}
                  disabled={savingPrefs}
                  onChange={(e) => handleSavePreferences(notifyRooms, e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: notifyLeaderboard ? '#2563eb' : '#cbd5e1',
                  borderRadius: '26px',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: notifyLeaderboard ? '24px' : '3px',
                    bottom: '3px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    transition: '0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* In-App Notification History */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Recent Notification Feed
              </h3>
            </div>
            {Array.isArray(notifications) && notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
              Loading notification logs...
            </div>
          ) : (!Array.isArray(notifications) || notifications.length === 0) ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '14px',
              border: '1px dashed #cbd5e1'
            }}>
              <Bell size={32} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
              <div style={{ fontWeight: 700, color: '#475569', fontSize: '0.94rem' }}>
                No notifications yet
              </div>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                Room creation alerts and leaderboard changes will appear here and on your device.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    backgroundColor: n.is_read ? '#f8fafc' : '#ffffff',
                    border: n.is_read ? '1px solid #e2e8f0' : '1px solid #93c5fd',
                    boxShadow: n.is_read ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: n.type === 'ROOM_CREATED' ? '#dbeafe' : n.type === 'LEADERBOARD_UPDATE' ? '#fef3c7' : '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem'
                    }}>
                      {n.type === 'ROOM_CREATED' ? '⚽' : n.type === 'LEADERBOARD_UPDATE' ? '🏆' : '🎮'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {n.data_url && (
                    <Link
                      href={n.data_url}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>View</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
