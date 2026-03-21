'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Message, Person } from '@/lib/types'
import { usePushSubscription } from '@/lib/usePushSubscription'

export default function DirectChatPage() {
  const router = useRouter()
  const params = useParams()
  const convId = params.id as string
  const [me, setMe] = useState<Person | null>(null)
  const [other, setOther] = useState<Person | null>(null)
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

      const { data: members } = await supabase
        .from('conversation_members')
        .select('person_id')
        .eq('conversation_id', convId)

      const otherId = (members || []).find((m: { person_id: string }) => m.person_id !== session.user.id)?.person_id
      if (otherId) {
        const { data: otherPerson } = await supabase.from('people').select('*').eq('id', otherId).single()
        if (otherPerson) setOther(otherPerson as Person)
      }

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, people(id, name)')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages((msgs as Message[]) || [])

      // Marcar conversación como leída
      const now = new Date().toISOString()
      await supabase.from('read_receipts').delete()
        .eq('person_id', session.user.id)
        .eq('conversation_id', convId)
      await supabase.from('read_receipts').insert(
        { person_id: session.user.id, conversation_id: convId, last_read_at: now }
      )
    }

    init()

    const supabase2 = getSupabase()
    const channel = supabase2
      .channel(`conv-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` }, async (payload) => {
        const { data } = await supabase2.from('messages').select('*, people(id, name)').eq('id', payload.new.id).single()
        if (data) setMessages(prev => [...prev, data as Message])
      })
      .subscribe()

    return () => { supabase2.removeChannel(channel) }
  }, [router, convId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !me || sending) return
    setSending(true)
    const supabase = getSupabase()
    await supabase.from('messages').insert({ user_id: me.id, content: input.trim(), conversation_id: convId })
    setInput('')
    setSending(false)
  }

  function formatTime(ts: string | null) {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh', backgroundColor: '#f0faf4' }}>

      {/* Header */}
      <div className="flex-shrink-0 relative" style={{ backgroundColor: '#1a7a4a' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-5">
          <button onClick={() => router.push('/chat')} className="text-white/80 hover:text-white text-xl w-8 flex-shrink-0">←</button>
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full blur-sm" style={{ backgroundColor: 'rgba(163,230,53,0.35)', transform: 'scale(1.2)' }} />
            <div className="relative w-11 h-11 rounded-full border-2 flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: '#0f5c35', borderColor: '#a3e635' }}>
              {other?.name[0].toUpperCase() || '?'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-lg leading-tight truncate">{other?.name || '...'}</p>
            <p className="text-white/50 text-xs">Mensaje directo</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 390 16" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '16px' }}>
            <path d="M0,8 C80,16 160,0 240,8 C310,15 355,4 390,8 L390,16 L0,16 Z" fill="#f0faf4" />
          </svg>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map(msg => {
          const isMe = msg.user_id === me?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}
                  style={isMe ? { backgroundColor: '#1a7a4a' } : {}}
                >
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
          placeholder={`Escribile a ${other?.name || ''}...`}
          className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 text-sm bg-gray-50"
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
