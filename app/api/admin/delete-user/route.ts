import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://yjpbnwiibmtcjjqbehrl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGJud2lpYm10Y2pqcWJlaHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAyMjA3OSwiZXhwIjoyMDg5NTk4MDc5fQ.5e2o9-R8olHEmTt5eTWNAGTeCpZxt0grW7V2hHdr_qk'
)

export async function POST(req: Request) {
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'falta userId' }, { status: 400 })

  // Borrar de people (cascade borra conversation_members, reactions, etc.)
  await supabaseAdmin.from('people').delete().eq('id', userId)

  // Borrar de Auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
