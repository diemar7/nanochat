import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { channels, senderName, content } = await req.json()

  const preview = content.length > 60 ? content.slice(0, 60) + '...' : content

  await Promise.allSettled(
    channels.map((channel: string) =>
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
  )

  return NextResponse.json({ ok: true })
}
