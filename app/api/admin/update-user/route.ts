import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://yjpbnwiibmtcjjqbehrl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGJud2lpYm10Y2pqcWJlaHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAyMjA3OSwiZXhwIjoyMDg5NTk4MDc5fQ.5e2o9-R8olHEmTt5eTWNAGTeCpZxt0grW7V2hHdr_qk'
)

export async function POST(req: Request) {
  const { userId, name, email, password, is_admin } = await req.json()
  if (!userId) return NextResponse.json({ error: 'falta userId' }, { status: 400 })

  // Actualizar en auth.users (email y/o password)
  const authUpdate: { email?: string; password?: string } = {}
  if (email) authUpdate.email = email
  if (password) authUpdate.password = password

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdate)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Actualizar en people
  const peopleUpdate: { name?: string; email?: string; is_admin?: boolean } = {}
  if (name) peopleUpdate.name = name
  if (email) peopleUpdate.email = email
  if (is_admin !== undefined) peopleUpdate.is_admin = is_admin

  if (Object.keys(peopleUpdate).length > 0) {
    const { error } = await supabaseAdmin.from('people').update(peopleUpdate).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
