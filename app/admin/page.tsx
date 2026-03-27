'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person } from '@/lib/types'

export default function AdminPage() {
  const router = useRouter()
  const [me, setMe] = useState<Person | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [directsWith, setDirectsWith] = useState<string[]>([])
  const [addToGroup, setAddToGroup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [lastCreated, setLastCreated] = useState<{ name: string; email: string; password: string } | null>(null)
  const [shareTarget, setShareTarget] = useState<{ person: Person; password: string } | null>(null)

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: person } = await supabase.from('people').select('*').eq('id', session.user.id).single()
      if (!person?.is_admin) { router.replace('/chat'); return }
      setMe(person as Person)

      const { data } = await supabase.from('people').select('*').order('created_at')
      setPeople((data as Person[]) || [])
    }

    init()
  }, [router])

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPassword, name: newName, directsWith, addToGroup }),
    })
    const json = await res.json()

    if (!res.ok) {
      setMessage('Error: ' + (json.error || 'desconocido'))
      setLoading(false)
      return
    }

    setMessage(`✅ ${newName} agregado correctamente`)
    setLastCreated({ name: newName, email: newEmail, password: newPassword })
    setNewEmail(''); setNewName(''); setNewPassword(''); setDirectsWith([]); setAddToGroup(false)
    const supabase = getSupabase()
    const { data: updated } = await supabase.from('people').select('*').order('created_at')
    setPeople((updated as Person[]) || [])
    setLoading(false)
  }

  async function removeUser(person: Person) {
    if (!confirm(`¿Eliminar a ${person.name}?`)) return
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: person.id }),
    })
    if (!res.ok) {
      const json = await res.json()
      alert('Error al eliminar: ' + (json.error || 'desconocido'))
      return
    }
    setPeople(prev => prev.filter(p => p.id !== person.id))
  }

  async function toggleAdmin(person: Person) {
    const supabase = getSupabase()
    await supabase.from('people').update({ is_admin: !person.is_admin }).eq('id', person.id)
    setPeople(prev => prev.map(p => p.id === person.id ? { ...p, is_admin: !p.is_admin } : p))
  }

  function shareOnWhatsApp(user: { name: string; email: string; password: string }) {
    const texto = `¡Hola ${user.name}! 👋

Te invito a *NanoChat*, la app de la familia para chatear con Nano 💚

📲 *Cómo instalarla:*

*En Android:*
1. Abrí este link en Chrome: https://nanochat-three.vercel.app
2. Tocá los 3 puntitos (⋮) arriba a la derecha
3. Tocá *"Agregar a pantalla de inicio"*
4. Confirmá tocando *"Agregar"*

*En iPhone:*
1. Abrí este link en Safari: https://nanochat-three.vercel.app
2. Tocá el botón compartir (□↑) abajo en el centro
3. Tocá *"Agregar a pantalla de inicio"*
4. Tocá *"Agregar"* arriba a la derecha

🔑 *Tus datos para entrar:*
• Usuario: ${user.email}
• Contraseña: ${user.password}

¡Ya podés chatear con la familia! 🎉`

    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const COLORS = ['bg-emerald-400', 'bg-teal-400', 'bg-cyan-400', 'bg-lime-500', 'bg-green-400']

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#f0faf4' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shadow-sm" style={{ backgroundColor: '#1a7a4a' }}>
        <button onClick={() => router.push('/chat')} className="text-white/80 hover:text-white text-xl w-8">←</button>
        <div className="flex-1">
          <p className="text-white font-bold">Gestión de usuarios</p>
          <p className="text-white/60 text-xs">{people.length} miembros</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Acceso rápido a Agenda */}
        <button
          onClick={() => router.push('/admin/agenda')}
          className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform"
          style={{ borderLeft: '4px solid #1a7a4a' }}
        >
          <span className="text-2xl">📅</span>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-800">Gestionar Agenda</p>
            <p className="text-xs text-gray-400">Actividades y turnos de cada miembro</p>
          </div>
          <span className="text-gray-300 text-xl">›</span>
        </button>

        {/* Agregar usuario */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Agregar miembro</h2>
          <form onSubmit={addUser} className="space-y-3">
            <input
              type="text"
              placeholder="Nombre"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
            />
            <input
              type="password"
              placeholder="Contraseña inicial"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 bg-gray-50"
            />
            {/* Grupo Familia */}
            <label className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={addToGroup}
                onChange={e => setAddToGroup(e.target.checked)}
                className="w-4 h-4 accent-emerald-600"
              />
              <span className="text-sm text-gray-700">Agregar al grupo <strong>Familia</strong> 🏠</span>
            </label>

            {/* Chats directos */}
            {people.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crear chat directo con</p>
                {people.map(p => (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={directsWith.includes(p.id)}
                      onChange={e => setDirectsWith(prev =>
                        e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                      )}
                      className="w-4 h-4 accent-emerald-600"
                    />
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
            {message && <p className="text-sm text-center text-gray-600">{message}</p>}
            {lastCreated && (
              <button
                type="button"
                onClick={() => shareOnWhatsApp(lastCreated)}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition active:scale-95 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#25d366' }}
              >
                📲 Compartir acceso por WhatsApp
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60 transition active:scale-95"
              style={{ backgroundColor: '#1a7a4a' }}
            >
              {loading ? 'Agregando...' : 'Agregar miembro →'}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <h2 className="font-bold text-gray-700 px-4 pt-4 pb-2">Miembros ({people.length})</h2>
          {people.map((person, i) => (
            <div key={person.id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-100">
              <div className={`w-10 h-10 rounded-full ${COLORS[i % COLORS.length]} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                {person.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm truncate">{person.name}</p>
                  {person.is_admin && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>admin</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate">{person.email}</p>
              </div>
              {person.id !== me?.id && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShareTarget(shareTarget?.person.id === person.id ? null : { person, password: '' })}
                    className="text-gray-300 hover:text-green-500 transition text-base"
                    title="Compartir acceso"
                  >
                    📲
                  </button>
                  <button
                    onClick={() => toggleAdmin(person)}
                    className="text-gray-400 hover:text-emerald-600 transition text-sm"
                    title={person.is_admin ? 'Quitar admin' : 'Hacer admin'}
                  >
                    {person.is_admin ? '↓' : '↑'}
                  </button>
                  <button
                    onClick={() => removeUser(person)}
                    className="text-gray-300 hover:text-red-500 transition text-base"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              )}
              {shareTarget?.person.id === person.id && (
                <div className="w-full mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Contraseña"
                    value={shareTarget.password}
                    onChange={e => setShareTarget({ ...shareTarget, password: e.target.value })}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none"
                  />
                  <button
                    onClick={() => { shareOnWhatsApp({ name: person.name, email: person.email, password: shareTarget.password }); setShareTarget(null) }}
                    disabled={!shareTarget.password}
                    className="px-3 py-1.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                    style={{ backgroundColor: '#25d366' }}
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
