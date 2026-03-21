'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Message, Person } from '@/lib/types'
import { usePushSubscription } from '@/lib/usePushSubscription'

export default function GroupChatPage() {
  const router = useRouter()
  const [me, setMe] = useState<Person | null>(null)
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  usePushSubscription(me?.id ?? null)

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: person } = await supabase.from('people').select('*').eq('id', session.user.id).single()
      if (!person) { router.replace('/login'); return }
      setMe(person as Person)

      const { data: people } = await supabase.from('people').select('*')
      setAllPeople((people as Person[]) || [])

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, people(id, name)')
        .is('conversation_id', null)
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages((msgs as Message[]) || [])
    }

    init()

    const supabase2 = getSupabase()
    const channel = supabase2
      .channel('group-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=is.null' }, async (payload) => {
        const { data } = await supabase2.from('messages').select('*, people(id, name)').eq('id', payload.new.id).single()
        if (data) setMessages(prev => [...prev, data as Message])
      })
      .subscribe()

    return () => { supabase2.removeChannel(channel) }
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !me || sending) return
    setSending(true)
    const supabase = getSupabase()
    await supabase.from('messages').insert({ user_id: me.id, content: input.trim(), conversation_id: null })
    setInput('')
    setSending(false)
  }

  function formatTime(ts: string | null) {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  const COLORS = ['bg-emerald-400', 'bg-teal-400', 'bg-cyan-400', 'bg-lime-500', 'bg-green-400']

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#f0faf4' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shadow-sm" style={{ backgroundColor: '#1a7a4a' }}>
        <button onClick={() => router.push('/chat')} className="text-white/80 hover:text-white text-xl w-8">←</button>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">🏠</div>
        <div className="flex-1">
          <p className="text-white font-bold leading-none">Familia</p>
          <p className="text-white/60 text-xs">Chat grupal</p>
        </div>
        <div className="flex -space-x-2">
          {allPeople.slice(0, 3).map((p, i) => (
            <div key={p.id} className={`w-7 h-7 rounded-full ${COLORS[i % COLORS.length]} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
              {p.name[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map(msg => {
          const isMe = msg.user_id === me?.id
          const senderIdx = allPeople.findIndex(p => p.id === msg.user_id)
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-xs text-gray-500 px-1 font-medium">{msg.people?.name}</span>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe
                  ? 'text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm'}`}
                  style={isMe ? { backgroundColor: '#1a7a4a' } : {}}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400 px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="px-4 py-3 bg-white border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 text-sm bg-gray-50"
          style={{ '--tw-ring-color': '#1a7a4a' } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white disabled:opacity-40 transition active:scale-95"
          style={{ backgroundColor: '#1a7a4a' }}
        >
          ➤
        </button>
      </form>
    </div>
  )
}
