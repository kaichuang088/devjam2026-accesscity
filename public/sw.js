self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Accessity', {
      body: data.body ?? 'You have a new notification.',
      icon: '/mimo-icon.png',
      badge: '/mimo-icon.png',
      data: { url: data.url ?? '/notifications' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/notifications'))
})
