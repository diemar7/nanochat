import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://yjpbnwiibmtcjjqbehrl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGJud2lpYm10Y2pqcWJlaHJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAyMjA3OSwiZXhwIjoyMDg5NTk4MDc5fQ.5e2o9-R8olHEmTt5eTWNAGTeCpZxt0grW7V2hHdr_qk'
)

export async function POST(req: Request) {
  const { email, password, name, directsWith, addToGroup } = await req.json()
  if (!email || !password || !name) {
    return NextResponse.json({ error: 'faltan datos' }, { status: 400 })
  }

  // Crear usuario sin afectar la sesión actual
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'error desconocido' }, { status: 500 })
  }

  // Insertar en people
  const { error: insertError } = await supabaseAdmin.from('people').insert({
    id: data.user.id,
    name,
    email,
    is_admin: false,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Agregar al grupo Familia si se eligió
  if (addToGroup) {
    await supabaseAdmin.from('conversation_members').insert({
      conversation_id: '00000000-0000-0000-0000-000000000001',
      person_id: data.user.id,
    })
  }

  // Crear chats directos seleccionados
  for (const otherId of (directsWith || [])) {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .insert({ is_group: false })
      .select('id')
      .single()
    if (conv) {
      await supabaseAdmin.from('conversation_members').insert([
        { conversation_id: conv.id, person_id: data.user.id },
        { conversation_id: conv.id, person_id: otherId },
      ])
    }
  }

  return NextResponse.json({ ok: true, userId: data.user.id })
}
