'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person, Conversation } from '@/lib/types'

const AVATAR_COLORS = [
  'bg-emerald-400',
  'bg-teal-400',
  'bg-cyan-400',
  'bg-lime-500',
  'bg-green-400',
]

function greeting(name: string) {
  const h = new Date().getHours()
  if (h < 12) return `¡Buenos días, ${name}! ☀️`
  if (h < 19) return `¡Buenas tardes, ${name}! 👋`
  return `¡Buenas noches, ${name}! 🌙`
}

export default function ChatPage() {
  const router = useRouter()
  const [me, setMe] = useState<Person | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: person } = await supabase.from('people').select('*').eq('id', session.user.id).single()
      if (!person) { router.replace('/login'); return }
      setMe(person as Person)

      const { data: allPeople } = await supabase.from('people').select('*')
      const peopleList = (allPeople as Person[]) || []
      setPeople(peopleList)

      const { data: memberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('person_id', session.user.id)

      const convIds = (memberships || []).map((m: { conversation_id: string }) => m.conversation_id)

      if (convIds.length > 0) {
        const { data: convs } = await supabase
          .from('conversations')
          .select('*')
          .in('id', convIds)
          .eq('is_group', false)

        const { data: allMembers } = await supabase
          .from('conversation_members')
          .select('conversation_id, person_id')
          .in('conversation_id', convIds)

        const convsWithOther = ((convs as Conversation[]) || []).map(conv => {
          const otherMember = (allMembers || []).find(
            (m: { conversation_id: string; person_id: string }) =>
              m.conversation_id === conv.id && m.person_id !== session.user.id
          )
          const other = peopleList.find(p => p.id === otherMember?.person_id) || null
          return { ...conv, other }
        })

        setConversations(convsWithOther)
      }

      setLoading(false)
    }

    init()
  }, [router])

  async function startConversation(other: Person) {
    if (!me) return
    const supabase = getSupabase()

    const existing = conversations.find(c => c.other?.id === other.id)
    if (existing) {
      router.push(`/chat/${existing.id}`)
      return
    }

    const { data: conv } = await supabase
      .from('conversations')
      .insert({ is_group: false })
      .select()
      .single() as { data: Conversation | null }

    if (!conv) return

    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, person_id: me.id },
      { conversation_id: conv.id, person_id: other.id },
    ])

    router.push(`/chat/${conv.id}`)
  }

  async function logout() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const otherPeople = people.filter(p => p.id !== me?.id)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* ── SECCIÓN SUPERIOR ── */}
      <div className="relative flex-shrink-0" style={{ backgroundColor: '#1a7a4a' }}>

        {/* Círculos decorativos orgánicos */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <div className="absolute top-16 -left-8 w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
          <div className="absolute -bottom-4 right-16 w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </div>

        {/* Botones top derecha */}
        <div className="relative z-10 flex justify-end gap-2 px-5 pt-8 pb-0">
          {me?.is_admin && (
            <button
              onClick={() => router.push('/admin')}
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}
            >
              Admin
            </button>
          )}
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}
          >
            Salir
          </button>
        </div>

        {/* Avatar + nombre */}
        <div className="relative z-10 flex flex-col items-center px-5 pt-4 pb-10">
          {/* Anillo glow + avatar */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full blur-md" style={{ backgroundColor: 'rgba(163,230,53,0.4)', transform: 'scale(1.15)' }} />
            <div className="relative w-24 h-24 rounded-full border-4 flex items-center justify-center font-black text-4xl"
              style={{ backgroundColor: '#0f5c35', borderColor: '#a3e635', color: '#a3e635' }}>
              {me?.name?.[0].toUpperCase() || '?'}
            </div>
            {/* Badge punto activo */}
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: '#a3e635' }} />
          </div>

          {/* Saludo dinámico */}
          <p className="text-white/60 text-sm font-medium mb-1">
            {me ? greeting(me.name) : ''}
          </p>

          {/* Nombre grande */}
          <h1 className="text-white font-black text-4xl tracking-tight leading-none text-center mb-1">
            {me?.name?.toUpperCase() || ''}
          </h1>
          <p className="text-white/40 text-xs">{me?.email}</p>
        </div>

        {/* Onda SVG inferior */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 390 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '40px' }}>
            <path d="M0,20 C80,40 160,0 240,20 C310,38 355,10 390,20 L390,40 L0,40 Z" fill="#f0faf4" />
          </svg>
        </div>
      </div>

      {/* ── SECCIÓN INFERIOR ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10" style={{ backgroundColor: '#f0faf4' }}>

        {/* Grupos */}
        <h2 className="font-bold text-gray-700 text-base mb-3 px-1">Grupos</h2>
        <button
          onClick={() => router.push('/chat/group')}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform hover:shadow-md mb-6"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl flex-shrink-0">
            🏠
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-800">Familia</p>
            <p className="text-xs text-gray-400 mt-0.5">Chat grupal</p>
          </div>
          <span className="text-gray-300 text-xl">›</span>
        </button>

        {/* Mensajes directos */}
        <h2 className="font-bold text-gray-700 text-base mb-3 px-1">Mensajes directos</h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {otherPeople.map((person, i) => {
              const existing = conversations.find(c => c.other?.id === person.id)
              return (
                <button
                  key={person.id}
                  onClick={() => startConversation(person)}
                  className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform hover:shadow-md"
                >
                  <div className={`w-11 h-11 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                    {person.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-800">{person.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {existing ? 'Conversación activa' : 'Iniciar chat'}
                    </p>
                  </div>
                  <span className="text-gray-300 text-xl">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
