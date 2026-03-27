'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<Person | null>(null)

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: person } = await supabase.from('people').select('*').eq('id', session.user.id).single()
      if (!person?.is_admin) { router.replace('/chat'); return }
      setMe(person as Person)
    }

    init()
  }, [router])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* HEADER */}
      <div className="relative flex-shrink-0" style={{ backgroundColor: '#1a7a4a' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <div className="absolute top-16 -left-8 w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
        </div>

        <div className="relative z-10 flex items-center gap-3 px-5 pt-8 pb-0">
          <button onClick={() => router.push('/chat')} className="text-2xl font-bold" style={{ color: '#a3e635' }}>‹</button>
          <div>
            <h1 className="text-white font-black text-2xl tracking-tight leading-none">Panel Admin</h1>
            {me && <p className="text-white/50 text-xs mt-0.5">{me.name}</p>}
          </div>
        </div>

        <div className="relative z-10 px-5 pt-3 pb-10">
          <p className="text-white/40 text-sm">Gestioná la familia y la agenda</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 390 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '40px' }}>
            <path d="M0,20 C80,40 160,0 240,20 C310,38 355,10 390,20 L390,40 L0,40 Z" fill="#f0faf4" />
          </svg>
        </div>
      </div>

      {/* MENÚ */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10 space-y-3" style={{ backgroundColor: '#f0faf4' }}>

        <button
          onClick={() => router.push('/admin/miembros')}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4 active:scale-95 transition-transform hover:shadow-md"
          style={{ borderLeft: '4px solid #1a7a4a' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#f0faf4' }}>
            👥
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-800">Miembros</p>
            <p className="text-xs text-gray-400 mt-0.5">Agregar, eliminar y gestionar miembros de la familia</p>
          </div>
          <span className="text-gray-300 text-xl">›</span>
        </button>

        <button
          onClick={() => router.push('/admin/agenda')}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-4 flex items-center gap-4 active:scale-95 transition-transform hover:shadow-md"
          style={{ borderLeft: '4px solid #0ea5e9' }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
            📅
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-800">Agenda</p>
            <p className="text-xs text-gray-400 mt-0.5">Actividades semanales y turnos de cada miembro</p>
          </div>
          <span className="text-gray-300 text-xl">›</span>
        </button>

      </div>
    </div>
  )
}
