'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person, Conversation } from '@/lib/types'

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

      // Cargar todas las personas para mostrar nombres
      const { data: allPeople } = await supabase.from('people').select('*')
      const peopleList = (allPeople as Person[]) || []
      setPeople(peopleList)

      // Cargar conversaciones 1 a 1 donde participo
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

        // Para cada conversación 1 a 1, encontrar el otro participante
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

    // Verificar si ya existe una conversación 1 a 1 con esta persona
    const existing = conversations.find(c => c.other?.id === other.id)
    if (existing) {
      router.push(`/chat/${existing.id}`)
      return
    }

    // Crear nueva conversación
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
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">NanoChat</h1>
            <p className="text-white/70 text-xs">Familia</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {me?.is_admin && (
            <button onClick={() => router.push('/admin')} className="text-white/80 hover:text-white text-sm px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition">
              👥 Admin
            </button>
          )}
          <button onClick={logout} className="text-white/80 hover:text-white text-sm">Salir</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Chat grupal */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Grupo</p>
          <button
            onClick={() => router.push('/chat/group')}
            className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl">
              👨‍👩‍👦
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Familia</p>
              <p className="text-xs text-gray-400">Chat grupal</p>
            </div>
          </button>
        </div>

        {/* Chats 1 a 1 */}
        <div className="px-4 pt-2 pb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Mensajes directos</p>
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : otherPeople.map(person => {
              const existing = conversations.find(c => c.other?.id === person.id)
              return (
                <button
                  key={person.id}
                  onClick={() => startConversation(person)}
                  className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold">
                    {person.name[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">{person.name}</p>
                    <p className="text-xs text-gray-400">{existing ? 'Conversación activa' : 'Iniciar chat'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
