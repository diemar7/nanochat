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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: person } = await supabase
        .from('people')
        .select('*')
        .eq('id', session.user.id)
        .single()

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

    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
    })

    if (error || !data.user) {
      setMessage('Error al crear el usuario: ' + (error?.message || 'desconocido'))
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('people').insert({
      id: data.user.id,
      name: newName,
      email: newEmail,
      is_admin: false,
    })

    if (insertError) {
      setMessage('Usuario creado pero error al guardar perfil: ' + insertError.message)
    } else {
      setMessage(`✅ ${newName} agregado correctamente`)
      setNewEmail('')
      setNewName('')
      setNewPassword('')
      const { data: updated } = await supabase.from('people').select('*').order('created_at')
      setPeople((updated as Person[]) || [])
    }
    setLoading(false)
  }

  async function removeUser(person: Person) {
    if (!confirm(`¿Eliminar a ${person.name}?`)) return
    const supabase = getSupabase()
    await supabase.from('people').delete().eq('id', person.id)
    setPeople(prev => prev.filter(p => p.id !== person.id))
  }

  async function toggleAdmin(person: Person) {
    const supabase = getSupabase()
    await supabase.from('people').update({ is_admin: !person.is_admin }).eq('id', person.id)
    setPeople(prev => prev.map(p => p.id === person.id ? { ...p, is_admin: !p.is_admin } : p))
  }

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-4 py-3 flex items-center gap-3 shadow-lg">
        <button onClick={() => router.push('/chat')} className="text-white/80 hover:text-white text-xl">
          ←
        </button>
        <h1 className="text-white font-bold text-lg">Gestión de usuarios</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Agregar usuario */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Agregar miembro</h2>
          <form onSubmit={addUser} className="space-y-3">
            <input
              type="text"
              placeholder="Nombre"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <input
              type="password"
              placeholder="Contraseña inicial"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            {message && (
              <p className="text-sm text-center text-gray-600">{message}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition"
            >
              {loading ? 'Agregando...' : 'Agregar'}
            </button>
          </form>
        </div>

        {/* Lista de miembros */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <h2 className="font-semibold text-gray-700 px-4 pt-4 pb-2">Miembros ({people.length})</h2>
          {people.map(person => (
            <div key={person.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-100">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {person.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{person.name}</p>
                <p className="text-xs text-gray-400 truncate">{person.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {person.is_admin && (
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">admin</span>
                )}
                {person.id !== me?.id && (
                  <>
                    <button
                      onClick={() => toggleAdmin(person)}
                      className="text-xs text-gray-400 hover:text-violet-600 transition"
                      title={person.is_admin ? 'Quitar admin' : 'Hacer admin'}
                    >
                      {person.is_admin ? '⬇' : '⬆'}
                    </button>
                    <button
                      onClick={() => removeUser(person)}
                      className="text-xs text-gray-400 hover:text-red-500 transition"
                      title="Eliminar"
                    >
                      🗑
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
