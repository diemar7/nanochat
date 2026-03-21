'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person, Conversation } from '@/lib/types'

const AVATAR_COLORS = [
  { bg: 'bg-emerald-400', border: 'border-emerald-300' },
  { bg: 'bg-teal-400', border: 'border-teal-300' },
  { bg: 'bg-cyan-400', border: 'border-cyan-300' },
  { bg: 'bg-lime-400', border: 'border-lime-300' },
  { bg: 'bg-green-400', border: 'border-green-300' },
]

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
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#0a2a1a' }}>

      {/* Círculos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: '#4ade80' }} />
        <div className="absolute top-40 -left-16 w-48 h-48 rounded-full opacity-10" style={{ backgroundColor: '#86efac' }} />
        <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: '#4ade80' }} />
      </div>

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-8 pb-2">
        <div>
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Bienvenido</p>
          <h1 className="text-white font-black text-2xl leading-tight">{me?.name || '...'} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          {me?.is_admin && (
            <button
              onClick={() => router.push('/admin')}
              className="text-xs px-3 py-1.5 rounded-full font-bold"
              style={{ backgroundColor: '#1a4a2e', color: '#4ade80' }}
            >
              Admin
            </button>
          )}
          <button
            onClick={logout}
            className="text-xs px-3 py-1.5 rounded-full font-bold"
            style={{ backgroundColor: '#1a4a2e', color: '#4ade80' }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Hero card con personaje */}
      <div className="relative z-10 mx-4 mt-4 mb-2">
        <div className="rounded-3xl overflow-visible relative" style={{ backgroundColor: '#0f3d24', minHeight: '180px' }}>
          {/* Contenido de la card */}
          <div className="px-6 pt-6 pb-5">
            <p className="text-emerald-300 font-bold text-xs uppercase tracking-widest mb-1">NanoChat</p>
            <h2 className="text-white font-black text-2xl leading-tight mb-4">
              ¿Con quién<br/>hablamos hoy?
            </h2>
            <button
              onClick={() => router.push('/chat/group')}
              className="font-black text-sm px-5 py-2.5 rounded-2xl transition active:scale-95"
              style={{ backgroundColor: '#a3e635', color: '#0a2a1a' }}
            >
              Chat Familiar →
            </button>
          </div>

          {/* Personaje desbordando la card */}
          <div className="absolute top-2 right-3 w-28 h-28 select-none pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nano-character.png"
              alt="Nano"
              className="w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.5))' }}
            />
          </div>
        </div>
      </div>

      {/* Lista de contactos */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pt-2 pb-6">
        <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-3 px-1">
          Mensajes directos
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {otherPeople.map((person, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
              const existing = conversations.find(c => c.other?.id === person.id)
              return (
                <button
                  key={person.id}
                  onClick={() => startConversation(person)}
                  className="w-full rounded-2xl px-4 py-4 flex items-center gap-4 active:scale-95 transition-transform"
                  style={{ backgroundColor: '#0f3d24' }}
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-2xl ${color.bg} border-2 ${color.border} flex items-center justify-center text-white font-black text-xl shadow-lg flex-shrink-0`}>
                    {person.name[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left">
                    <p className="text-white font-bold text-base">{person.name}</p>
                    <p className="text-emerald-400/70 text-xs font-medium mt-0.5">
                      {existing ? 'Conversación activa' : 'Iniciar chat'}
                    </p>
                  </div>

                  {/* Flecha */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1a5c36' }}>
                    <span className="text-emerald-300 font-black text-sm">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
