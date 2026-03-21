import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record) return new Response('ok')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener sender
    const { data: sender } = await supabase
      .from('people')
      .select('name, ntfy_channel')
      .eq('id', record.user_id)
      .single()

    if (!sender) return new Response('ok')

    // Obtener todos los canales excepto el sender
    const { data: others } = await supabase
      .from('people')
      .select('ntfy_channel')
      .neq('id', record.user_id)
      .not('ntfy_channel', 'is', null)

    if (!others || others.length === 0) return new Response('ok')

    const preview = record.content.length > 60
      ? record.content.slice(0, 60) + '...'
      : record.content

    await Promise.allSettled(
      others.map((p: { ntfy_channel: string }) =>
        fetch(`https://ntfy.sh/${p.ntfy_channel}`, {
          method: 'POST',
          headers: {
            'Title': `NanoChat — ${sender.name}`,
            'Priority': 'default',
            'Tags': 'speech_balloon',
          },
          body: preview,
        })
      )
    )

    return new Response(JSON.stringify({ ok: true }))
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
