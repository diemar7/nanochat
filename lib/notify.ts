export async function notifyAll(channels: string[], senderName: string, content: string) {
  const preview = content.length > 60 ? content.slice(0, 60) + '...' : content

  Promise.allSettled(
    channels.map(channel =>
      fetch(`https://ntfy.sh/${channel}`, {
        method: 'POST',
        headers: {
          'Title': `NanoChat — ${senderName}`,
          'Priority': 'default',
          'Tags': 'speech_balloon',
        },
        body: preview,
      })
    )
  ).catch(() => {})
}
