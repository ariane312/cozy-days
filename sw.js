// Service worker mínimo: serve só para exibir notificações em navegadores
// (como o Chrome no Android) que não aceitam `new Notification(...)`.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      if (lista.length) return lista[0].focus();
      return self.clients.openWindow('./');
    })
  );
});
