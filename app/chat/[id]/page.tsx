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
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null)
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
  }, [other])

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

        // Cargar last_read_at del otro
        const { data: receipt } = await supabase
          .from('read_receipts')
          .select('last_read_at')
          .eq('person_id', otherId)
          .eq('conversation_id', convId)
          .single()
        if (receipt) setOtherLastRead(receipt.last_read_at)
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
        if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Message])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'read_receipts', filter: `conversation_id=eq.${convId}` }, (payload) => {
        const row = payload.new as { person_id: string; last_read_at: string } | undefined
        if (row && row.person_id !== undefined) {
          // Se actualiza cuando el otro abre el chat — no sabemos el otherId acá, lo actualizamos siempre
          setOtherLastRead(row.last_read_at)
        }
      })
      .subscribe()

    return () => { supabase2.removeChannel(channel) }
  }, [router, convId])

  // Canal de presence para "escribiendo..."
  useEffect(() => {
    if (!me) return
    const supabase = getSupabase()
    const channel = supabase.channel(`typing-${convId}`, { config: { presence: { key: me.id } } })
    presenceChannelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ typing: boolean }>()
        const otherTypingNow = Object.entries(state).some(
          ([key, presences]) => key !== me.id && presences.some(p => p.typing)
        )
        setOtherTyping(otherTypingNow)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [me, convId])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    // Broadcast que estoy escribiendo
    const channel = presenceChannelRef.current
    if (channel && me) {
      channel.track({ typing: true })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        channel.track({ typing: false })
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
    const content = input.trim()
    setInput('')
    const supabase = getSupabase()
    const { data } = await supabase
      .from('messages')
      .insert({ user_id: me.id, content, conversation_id: convId })
      .select('*, people(id, name)')
      .single()
    if (data) setMessages(prev => [...prev, data as Message])
    setSending(false)
  }

  function formatTime(ts: string | null) {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ backgroundColor: '#f0faf4' }}>

      {/* Header — fixed arriba */}
      <div ref={headerRef} className="fixed top-0 left-0 right-0 z-20" style={{ backgroundColor: '#1a7a4a' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-5">
          <button onClick={() => router.push('/chat')} className="text-xl w-8 flex-shrink-0 font-bold" style={{ color: '#a3e635' }}>←</button>
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full blur-sm" style={{ backgroundColor: 'rgba(163,230,53,0.35)', transform: 'scale(1.2)' }} />
            <div className="relative w-11 h-11 rounded-full border-2 flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: '#0f5c35', borderColor: '#a3e635' }}>
              {other?.name[0].toUpperCase() || '?'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-lg leading-tight truncate">{other?.name || '...'}</p>
            <p className="text-xs font-semibold" style={{ color: '#a3e635' }}>Mensaje directo</p>
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
            placeholder={`Escribile a ${other?.name || ''}...`}
            autoComplete="off"
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

      {/* Mensajes — scroll en el medio */}
      <div
        ref={messagesRef}
        className="overflow-y-auto px-4 space-y-2"
        style={{ paddingTop: `calc(${headerHeight}px + 0.75rem)`, paddingBottom: `calc(${inputHeight}px + env(keyboard-inset-height, 0px) + 3rem)`, minHeight: '100dvh' }}
        onScroll={() => {
          const el = messagesRef.current
          if (!el) return
          isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {messages.map(msg => {
          const isMe = msg.user_id === me?.id
          const isRead = isMe && otherLastRead && msg.created_at && otherLastRead >= msg.created_at
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? 'text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}
                  style={isMe ? { backgroundColor: '#1a7a4a' } : {}}
                >
                  {msg.content}
                </div>
                <div className="flex items-center gap-1 px-1">
                  <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                  {isMe && (
                    <span className="text-xs leading-none" style={{ color: isRead ? '#a3e635' : 'rgba(0,0,0,0.25)' }}>
                      {isRead ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
