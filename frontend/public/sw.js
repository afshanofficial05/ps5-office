// PSO Gaming Arena - Web Push Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = {
      title: 'PSO Gaming Arena',
      body: event.data.text()
    };
  }

  const title = data.title || '⚽ PSO Gaming Arena';
  const options = {
    body: data.body || 'New match notification in the arena!',
    icon: data.icon || '/gamepad_banner.jpg',
    badge: data.badge || '/gamepad_banner.jpg',
    vibrate: [150, 80, 150, 80, 300],
    tag: data.tag || 'pso-match-alert',
    renotify: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: '🎮 View Arena' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
