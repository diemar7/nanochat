'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person, Conversation } from '@/lib/types'

function Star({ style }: { style: React.CSSProperties }) {
  return (
    <div className="absolute text-white/30 select-none pointer-events-none animate-pulse" style={style}>
      ★
    </div>
  )
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

  // Colores por persona (cicla entre los disponibles)
  const cardColors = [
    'from-blue-400 to-blue-600',
    'from-red-400 to-red-600',
    'from-yellow-400 to-orange-500',
    'from-pink-400 to-pink-600',
    'from-purple-400 to-purple-600',
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'linear-gradient(160deg, #1ad9a0 0%, #0fb87a 60%, #0a9e68 100%)' }}>

      {/* Estrellas decorativas */}
      <Star style={{ top: '8%', left: '6%', fontSize: '2rem', animationDelay: '0s' }} />
      <Star style={{ top: '5%', right: '10%', fontSize: '1.4rem', animationDelay: '0.5s' }} />
      <Star style={{ top: '18%', right: '5%', fontSize: '1rem', animationDelay: '1s' }} />
      <Star style={{ top: '14%', left: '20%', fontSize: '0.8rem', animationDelay: '1.5s' }} />
      <Star style={{ top: '22%', right: '25%', fontSize: '1.2rem', animationDelay: '0.3s' }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <p className="text-white/80 font-bold text-sm uppercase tracking-widest">NANOCHAT</p>
        <div className="flex items-center gap-2">
          {me?.is_admin && (
            <button
              onClick={() => router.push('/admin')}
              className="text-white/80 text-xs px-3 py-1.5 rounded-full bg-white/20 font-bold uppercase tracking-wide"
            >
              ADMIN
            </button>
          )}
          <button
            onClick={logout}
            className="text-white/80 text-xs px-3 py-1.5 rounded-full bg-white/20 font-bold uppercase tracking-wide"
          >
            SALIR
          </button>
        </div>
      </div>

      {/* Personaje 3D */}
      <div className="flex flex-col items-center pt-2 pb-4 relative">
        <div className="text-[110px] leading-none drop-shadow-2xl select-none" style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.25))' }}>
          👨‍👩‍👦
        </div>
        <h1 className="text-white font-black text-3xl uppercase tracking-tight mt-1" style={{ textShadow: '0 3px 8px rgba(0,0,0,0.25)' }}>
          HOLA, {me?.name?.toUpperCase() || '...'}!
        </h1>
        <p className="text-white/80 font-bold text-sm uppercase tracking-widest mt-1">
          ¿CON QUIÉN HABLAMOS?
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">

        {/* Card grupal */}
        <button
          onClick={() => router.push('/chat/group')}
          className="w-full rounded-3xl overflow-hidden shadow-xl active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #6c63ff 0%, #4f46e5 100%)' }}
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner">
              🏠
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-black text-lg uppercase tracking-tight">FAMILIA</p>
              <p className="text-white/70 font-bold text-xs uppercase tracking-wide">CHAT GRUPAL</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-lg">›</span>
            </div>
          </div>
        </button>

        {/* Separador */}
        <p className="text-white/60 font-black text-xs uppercase tracking-widest px-1 pt-1">
          MENSAJES DIRECTOS
        </p>

        {/* Cards 1 a 1 */}
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : otherPeople.map((person, i) => {
          const gradient = cardColors[i % cardColors.length]
          const existing = conversations.find(c => c.other?.id === person.id)
          return (
            <button
              key={person.id}
              onClick={() => startConversation(person)}
              className={`w-full rounded-3xl overflow-hidden shadow-xl active:scale-95 transition-transform bg-gradient-to-r ${gradient}`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl shadow-inner">
                  {person.name[0].toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-black text-lg uppercase tracking-tight">{person.name.toUpperCase()}</p>
                  <p className="text-white/70 font-bold text-xs uppercase tracking-wide">
                    {existing ? 'CONVERSACIÓN ACTIVA' : 'INICIAR CHAT'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <span className="text-white font-black text-lg">›</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
