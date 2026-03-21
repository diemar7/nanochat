import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { channels, senderName, content } = await req.json()

  const preview = content.length > 60 ? content.slice(0, 60) + '...' : content

  const results = await Promise.allSettled(
    channels.map((channel: string) =>
      fetch(`https://ntfy.sh/${channel}`, {
        method: 'POST',
        headers: {
          'Title': `NanoChat — ${senderName}`,
          'Priority': 'default',
          'Tags': 'speech_balloon',
        },
        body: preview,
      }).then(r => ({ channel, status: r.status }))
    )
  )

  console.log('notify results:', JSON.stringify(results))
  return NextResponse.json({ ok: true, results })
}
