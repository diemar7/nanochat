'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      router.replace('/chat')
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: '#1a7a4a' }}>

      {/* Círculos decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute top-32 -left-12 w-48 h-48 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* Top — logo y personaje */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-8">
        <div className="relative mb-2">
          <div className="absolute inset-0 rounded-full blur-xl" style={{ backgroundColor: 'rgba(163,230,53,0.35)', transform: 'scale(1.2)' }} />
          <div className="relative w-28 h-28 select-none pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nano-character.png" alt="NanoChat" className="w-full h-full object-contain" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }} />
          </div>
        </div>
        <h1 className="text-white font-black text-4xl tracking-tight mt-2">NanoChat</h1>
        <p className="text-white/50 text-sm mt-1">El chat de la familia</p>
      </div>

      {/* Bottom — form */}
      <div className="relative z-10 rounded-t-3xl px-6 pt-8 pb-10 space-y-4" style={{ backgroundColor: '#f0faf4' }}>
        <h2 className="text-gray-800 font-bold text-xl mb-2">Entrar</h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm"
            style={{ '--tw-ring-color': '#1a7a4a' } as React.CSSProperties}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 text-sm"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-base transition active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: '#1a7a4a', color: '#fff' }}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>
      </div>
    </div>
  )
}
