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
  const [typingPeople, setTypingPeople] = useState<string[]>([])
  const [headerHeight, setHeaderHeight] = useState(80)
  const [inputHeight, setInputHeight] = useState(64)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const headerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const presenceChannelRef = useRef<any>(null)

  usePushSubscription(me?.id ?? null)

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight)
    if (inputRef.current) setInputHeight(inputRef.current.offsetHeight)
  }, [allPeople])

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

      // Marcar grupal como leído
      const now = new Date().toISOString()
      await supabase.from('read_receipts').delete()
        .eq('person_id', session.user.id)
        .is('conversation_id', null)
      await supabase.from('read_receipts').insert(
        { person_id: session.user.id, conversation_id: null, last_read_at: now }
      )
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

  // Canal de presence para "escribiendo..."
  useEffect(() => {
    if (!me) return
    const supabase = getSupabase()
    const channel = supabase.channel('typing-group', { config: { presence: { key: me.id } } })
    presenceChannelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ typing: boolean; name: string }>()
        const names = Object.entries(state)
          .filter(([key, presences]) => key !== me.id && presences.some(p => p.typing))
          .map(([, presences]) => presences[0].name)
        setTypingPeople(names)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [me])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    const channel = presenceChannelRef.current
    if (channel && me) {
      channel.track({ typing: true, name: me.name })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        channel.track({ typing: false, name: me.name })
      }, 2000)
    }
  }

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
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
    <div style={{ backgroundColor: '#f0faf4' }}>

      {/* Header — fixed arriba */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-20" style={{ backgroundColor: '#1a7a4a' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-5">
          <button onClick={() => router.push('/chat')} className="text-xl w-8 flex-shrink-0 font-bold" style={{ color: '#a3e635' }}>←</button>
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full blur-sm" style={{ backgroundColor: 'rgba(163,230,53,0.35)', transform: 'scale(1.2)' }} />
            <div className="relative w-11 h-11 rounded-full border-2 flex items-center justify-center text-lg"
              style={{ backgroundColor: '#0f5c35', borderColor: '#a3e635' }}>
              🏠
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-lg leading-tight">Familia</p>
            <p className="text-xs font-semibold" style={{ color: '#a3e635' }}>Chat grupal</p>
          </div>
          <div className="flex -space-x-2 flex-shrink-0">
            {allPeople.slice(0, 3).map((p, i) => (
              <div key={p.id} className={`w-7 h-7 rounded-full ${COLORS[i % COLORS.length]} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                {p.name[0].toUpperCase()}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 390 16" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '16px' }}>
            <path d="M0,8 C80,16 160,0 240,8 C310,15 355,4 390,8 L390,16 L0,16 Z" fill="#f0faf4" />
          </svg>
        </div>
      </div>

      {/* Input — fixed abajo, sube con el teclado via VirtualKeyboard API */}
      <div ref={inputRef} className="fixed left-0 right-0 z-20 bg-white border-t border-gray-100" style={{ bottom: 'env(keyboard-inset-height, 0px)' }}>
        <form onSubmit={sendMessage} className="px-4 py-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Escribí un mensaje..."
            autoComplete="off"
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

      {/* Mensajes — scroll en el medio */}
      <div
        ref={messagesRef}
        className="overflow-y-auto px-4 space-y-2"
        style={{ paddingTop: `calc(${headerHeight}px + 0.75rem)`, paddingBottom: `calc(${inputHeight}px + 0.75rem)`, minHeight: '100dvh' }}
        onScroll={() => {
          const el = messagesRef.current
          if (!el) return
          isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {messages.map(msg => {
          const isMe = msg.user_id === me?.id
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
        {typingPeople.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-gray-400">{typingPeople.join(', ')}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
