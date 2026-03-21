'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Message, Person } from '@/lib/types'

export default function GroupChatPage() {
  const router = useRouter()
  const [me, setMe] = useState<Person | null>(null)
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-4 py-3 flex items-center gap-3 shadow-lg">
        <button onClick={() => router.push('/chat')} className="text-white/80 hover:text-white text-xl">←</button>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-lg">👨‍👩‍👦</div>
        <div>
          <p className="text-white font-bold leading-none">Familia</p>
          <p className="text-white/70 text-xs">Chat grupal</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map(msg => {
          const isMe = msg.user_id === me?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && <span className="text-xs text-gray-500 px-1">{msg.people?.name}</span>}
                <div className={`px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400 px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="px-4 py-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white disabled:opacity-50 transition"
        >
          ➤
        </button>
      </form>
    </div>
  )
}
