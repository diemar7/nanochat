export async function notifyAll(channels: string[], senderName: string, content: string) {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels, senderName, content }),
  }).catch(() => {})
}
