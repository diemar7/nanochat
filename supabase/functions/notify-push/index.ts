import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const VAPID_PUBLIC_KEY = 'BCooHVGXBmeEk_L9tzrstSmoevS-1ZDHUhUYsE2a0K2FbYsBI-c8EK08raTjfD0jvmZe4YRqWQdg-pOzUFOfDsY'

webpush.setVapidDetails(
  'mailto:diemar7@gmail.com',
  VAPID_PUBLIC_KEY,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record
    if (!record) return new Response('ok')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: sender } = await supabase
      .from('people')
      .select('name')
      .eq('id', record.user_id)
      .single()

    if (!sender) return new Response('ok')

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .neq('person_id', record.user_id)

    if (!subs || subs.length === 0) return new Response('ok')

    const preview = record.content.length > 60
      ? record.content.slice(0, 60) + '...'
      : record.content

    const notification = JSON.stringify({
      title: `NanoChat — ${sender.name}`,
      body: preview,
      url: '/chat',
    })

    await Promise.allSettled(
      subs.map((row: { subscription: webpush.PushSubscription }) =>
        webpush.sendNotification(row.subscription, notification)
      )
    )

    return new Response(JSON.stringify({ ok: true }))
  } catch (e) {
    return new Response(String(e), { status: 500 })
  }
})
