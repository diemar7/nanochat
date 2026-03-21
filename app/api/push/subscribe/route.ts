import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yjpbnwiibmtcjjqbehrl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGJud2lpYm10Y2pqcWJlaHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAyMjA3OSwiZXhwIjoyMDg5NTk4MDc5fQ.5e2o9-R8olHEmTt5eTWNAGTeCpZxt0grW7V2hHdr_qk'
)

export async function POST(req: Request) {
  const { personId, subscription } = await req.json()
  if (!personId || !subscription?.endpoint) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  await supabase.from('push_subscriptions').upsert(
    { person_id: personId, endpoint: subscription.endpoint, subscription },
    { onConflict: 'person_id,endpoint' }
  )

  return NextResponse.json({ ok: true })
}
