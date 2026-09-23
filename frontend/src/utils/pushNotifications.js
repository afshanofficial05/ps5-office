/**
 * Push Notification client utilities for Web Push & VAPID.
 */

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default', 'granted', 'denied'
}

export async function registerServiceWorker() {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error('Failed to register Service Worker:', err);
    throw err;
  }
}

export async function subscribeUserToPush(vapidPublicKey) {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  // 1. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied or dismissed.');
  }

  // 2. Ensure SW is ready
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Could not register Service Worker.');
  }

  // 3. Convert key and subscribe
  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey
  });

  return subscription;
}

export async function getExistingPushSubscription() {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    return null;
  }
}

export async function unsubscribeUserFromPush() {
  const subscription = await getExistingPushSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    return subscription.endpoint;
  }
  return null;
}

export function getDeviceDetails() {
  if (typeof window === 'undefined' || !navigator) {
    return { device_name: 'Unknown Device', device_type: 'DESKTOP' };
  }

  const ua = navigator.userAgent || '';
  let device_type = 'DESKTOP';
  let os = 'Unknown OS';
  let browser = 'Browser';

  // Detect Type & OS
  if (/iPad|Tablet/i.test(ua)) {
    device_type = 'TABLET';
    os = 'Tablet';
  } else if (/Android/i.test(ua)) {
    device_type = /Mobile/i.test(ua) ? 'MOBILE' : 'TABLET';
    os = 'Android';
  } else if (/iPhone|iPod/i.test(ua)) {
    device_type = 'MOBILE';
    os = 'iOS';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(ua)) {
    browser = 'Safari';
  }

  const device_name = `${os} (${browser})`;
  return { device_name, device_type };
}

export async function syncDevicePushSubscription(apiClient, options = {}) {
  const { forcePrompt = false } = options;

  if (!isPushNotificationSupported()) {
    return { status: 'unsupported' };
  }

  let permission = getNotificationPermission();

  if (permission === 'denied') {
    return { status: 'denied' };
  }

  if (permission === 'default') {
    if (!forcePrompt) {
      return { status: 'prompt_needed' };
    }
    permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { status: 'denied' };
    }
  }

  // Permission is 'granted'
  try {
    let subscription = await getExistingPushSubscription();

    // If permission is granted but subscription is missing or revoked, auto-recover using VAPID key
    if (!subscription) {
      const vapidData = await apiClient.getVapidPublicKey();
      if (!vapidData?.public_key) {
        return { status: 'vapid_not_configured' };
      }
      subscription = await subscribeUserToPush(vapidData.public_key);
    }

    if (!subscription) {
      return { status: 'failed_to_subscribe' };
    }

    const subJson = subscription.toJSON();
    const { device_name, device_type } = getDeviceDetails();

    const response = await apiClient.subscribePushNotification({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || ''
      },
      user_agent: navigator.userAgent,
      device_name,
      device_type
    });

    return {
      status: 'synced',
      subscription,
      endpoint: subscription.endpoint,
      device_name,
      device_type,
      response
    };
  } catch (err) {
    console.error('Error syncing device push subscription:', err);
    return { status: 'error', error: err.message };
  }
}

export async function disassociateDevicePush(apiClient) {
  try {
    const subscription = await getExistingPushSubscription();
    if (subscription) {
      if (apiClient?.unsubscribePushNotification) {
        await apiClient.unsubscribePushNotification(subscription.endpoint).catch(() => {});
      }
      await subscription.unsubscribe().catch(() => {});
      return true;
    }
  } catch (err) {
    console.error('Error disassociating device push:', err);
  }
  return false;
}

