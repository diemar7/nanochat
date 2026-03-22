const SW_VERSION = 3

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'NanoChat', body: event.data.text() }
  }
  const tag = data.tag || 'default'
  event.waitUntil(
    self.registration.getNotifications({ tag }).then((existing) => {
      // Acumular mensajes anteriores en el body
      const prevBody = existing.length > 0 ? existing[0].body : null
      existing.forEach(n => n.close())
      const body = prevBody ? `${prevBody}\n${data.body || ''}` : (data.body || '')
      return self.registration.showNotification(data.title || 'NanoChat', {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag,
        renotify: true,
        data: { url: data.url || '/' },
      })
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_NOTIFICATIONS') {
    const tag = event.data.tag
    event.waitUntil(
      self.registration.getNotifications({ tag }).then((notifications) => {
        notifications.forEach((n) => n.close())
      })
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
