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

      {/* Header */}
      <header className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">NanoChat</p>
            <h1 className="text-white text-2xl font-bold">Hola, {me?.name || '...'} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            {me?.is_admin && (
              <button
                onClick={() => router.push('/admin')}
                className="text-white/70 hover:text-white text-sm transition-colors"
              >
                Admin
              </button>
            )}
            <button onClick={logout} className="text-white/70 hover:text-white text-sm transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Hero card con personaje */}
      <div className="px-4 pb-6 relative">
        <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-3xl p-5 shadow-xl overflow-visible relative">
          <p className="text-white/70 text-sm mb-1">¿Con quién hablamos hoy?</p>
          <p className="text-white text-xl font-bold mb-4">Chat familiar 💬</p>
          <button
            onClick={() => router.push('/chat/group')}
            className="font-bold text-sm px-5 py-2.5 rounded-2xl transition active:scale-95"
            style={{ backgroundColor: '#a3e635', color: '#0a2a1a' }}
          >
            Abrir chat grupal →
          </button>

          {/* Personaje */}
          <div className="absolute -top-8 right-3 w-28 h-28 select-none pointer-events-none">
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

      {/* Sección inferior clara */}
      <div className="bg-gray-50 rounded-t-3xl flex-1 overflow-y-auto px-4 pt-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">Mensajes directos</h2>
        </div>

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
