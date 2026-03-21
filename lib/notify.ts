export async function notifyAll(channels: string[], senderName: string, content: string) {
  fetch('https://yjpbnwiibmtcjjqbehrl.supabase.co/functions/v1/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels, senderName, content }),
  }).catch(() => {})
}
