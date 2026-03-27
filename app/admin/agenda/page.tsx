'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person, ActivityWithSchedules, ActivitySchedule, ActivityEvent } from '@/lib/types'

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const EMOJI_OPTIONS = ['⚽', '🎾', '🏊', '🎸', '📚', '🎨', '🩺', '💊', '🏃', '🎭', '🧩', '🎮', '🏋️', '🤸', '🎯', '📅']
const COLOR_OPTIONS = ['#1a7a4a', '#a3e635', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

type FormMode = 'idle' | 'new-recurring' | 'new-event' | 'edit'

export default function AdminAgendaPage() {
  const router = useRouter()
  const [me, setMe] = useState<Person | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [activities, setActivities] = useState<ActivityWithSchedules[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>('idle')
  const [selectedPersonId, setSelectedPersonId] = useState('')

  // Form state
  const [fName, setFName] = useState('')
  const [fEmoji, setFEmoji] = useState('📅')
  const [fColor, setFColor] = useState('#1a7a4a')
  const [fNotes, setFNotes] = useState('')
  const [fPersonId, setFPersonId] = useState('')
  // Recurring
  const [fDays, setFDays] = useState<number[]>([])
  const [fTime, setFTime] = useState('09:00')
  // Event
  const [fDate, setFDate] = useState('')
  const [fEventTime, setFEventTime] = useState('')
  const [fEventNotes, setFEventNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: person } = await supabase.from('people').select('*').eq('id', session.user.id).single()
      if (!person?.is_admin) { router.replace('/chat'); return }
      setMe(person as Person)

      const { data: allPeople } = await supabase.from('people').select('*').order('name')
      const peopleList = (allPeople as Person[]) || []
      setPeople(peopleList)

      if (peopleList.length > 0) {
        setSelectedPersonId(peopleList[0].id)
        setFPersonId(peopleList[0].id)
      }

      await loadActivities()
      setLoading(false)
    }

    init()
  }, [router])

  async function loadActivities() {
    const supabase = getSupabase()

    const { data: acts } = await supabase.from('activities').select('*').order('name')
    if (!acts || acts.length === 0) { setActivities([]); return }

    const actIds = acts.map((a: { id: string }) => a.id)
    const [{ data: schedules }, { data: events }] = await Promise.all([
      supabase.from('activity_schedules').select('*').in('activity_id', actIds),
      supabase.from('activity_events').select('*').in('activity_id', actIds).order('date'),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = acts.map((a: any) => ({
      ...a,
      schedules: (schedules || []).filter((s: { activity_id: string }) => s.activity_id === a.id),
      events: (events || []).filter((e: { activity_id: string }) => e.activity_id === a.id),
    }))
    setActivities(merged)
  }

  function resetForm() {
    setFName(''); setFEmoji('📅'); setFColor('#1a7a4a'); setFNotes('')
    setFDays([]); setFTime('09:00'); setFDate(''); setFEventTime(''); setFEventNotes('')
    setMessage('')
  }

  async function saveRecurring(e: React.FormEvent) {
    e.preventDefault()
    if (!fName.trim() || fDays.length === 0) { setMessage('Completá el nombre y al menos un día'); return }
    setSaving(true)
    const supabase = getSupabase()

    const { data: act, error } = await supabase.from('activities').insert({
      person_id: fPersonId,
      name: fName.trim(),
      emoji: fEmoji,
      color: fColor,
      type: 'recurring',
      notes: fNotes.trim() || null,
      created_by: me!.id,
    }).select().single()

    if (error || !act) { setMessage('Error al guardar'); setSaving(false); return }

    await supabase.from('activity_schedules').insert(
      fDays.map(d => ({ activity_id: act.id, day_of_week: d, time_of_day: fTime }))
    )

    setMessage(`✅ ${fName} guardado`)
    resetForm()
    setFormMode('idle')
    await loadActivities()
    setSaving(false)
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!fName.trim() || !fDate) { setMessage('Completá el nombre y la fecha'); return }
    setSaving(true)
    const supabase = getSupabase()

    const { data: act, error } = await supabase.from('activities').insert({
      person_id: fPersonId,
      name: fName.trim(),
      emoji: fEmoji,
      color: fColor,
      type: 'event',
      notes: fNotes.trim() || null,
      created_by: me!.id,
    }).select().single()

    if (error || !act) { setMessage('Error al guardar'); setSaving(false); return }

    await supabase.from('activity_events').insert({
      activity_id: act.id,
      date: fDate,
      time_of_day: fEventTime || null,
      notes: fEventNotes.trim() || null,
    })

    setMessage(`✅ ${fName} guardado`)
    resetForm()
    setFormMode('idle')
    await loadActivities()
    setSaving(false)
  }

  async function deleteActivity(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    const supabase = getSupabase()
    await supabase.from('activities').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  async function deleteEvent(eventId: string, activityId: string) {
    const supabase = getSupabase()
    await supabase.from('activity_events').delete().eq('id', eventId)
    setActivities(prev => prev.map(a =>
      a.id === activityId ? { ...a, events: a.events.filter((e: ActivityEvent) => e.id !== eventId) } : a
    ))
  }

  function toggleDay(d: number) {
    setFDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const filteredActivities = activities.filter(a => !selectedPersonId || a.person_id === selectedPersonId)
  const personName = (id: string) => people.find(p => p.id === id)?.name || '?'

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* HEADER */}
      <div className="relative flex-shrink-0" style={{ backgroundColor: '#1a7a4a' }}>
        <div className="relative z-10 flex items-center gap-3 px-5 pt-8 pb-4">
          <button onClick={() => router.back()} className="text-2xl font-bold" style={{ color: '#a3e635' }}>‹</button>
          <div>
            <h1 className="text-white font-black text-2xl tracking-tight">Agenda — Admin</h1>
            <p className="text-white/50 text-xs">Gestioná las actividades</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 390 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '40px' }}>
            <path d="M0,20 C80,40 160,0 240,20 C310,38 355,10 390,20 L390,40 L0,40 Z" fill="#f0faf4" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10" style={{ backgroundColor: '#f0faf4' }}>

        {/* Botones nueva actividad */}
        {formMode === 'idle' && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { resetForm(); setFormMode('new-recurring') }}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white shadow-sm active:scale-95 transition-transform"
              style={{ backgroundColor: '#1a7a4a' }}
            >
              + Actividad semanal
            </button>
            <button
              onClick={() => { resetForm(); setFormMode('new-event') }}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white shadow-sm active:scale-95 transition-transform"
              style={{ backgroundColor: '#0ea5e9' }}
            >
              + Turno / Evento
            </button>
          </div>
        )}

        {/* Formulario actividad recurrente */}
        {formMode === 'new-recurring' && (
          <form onSubmit={saveRecurring} className="bg-white rounded-2xl shadow-sm p-4 mb-5 space-y-3">
            <h2 className="font-bold text-gray-700">Nueva actividad semanal</h2>

            {message && <p className="text-sm text-red-500">{message}</p>}

            <div>
              <label className="text-xs text-gray-500 font-medium">Para quién</label>
              <select value={fPersonId} onChange={e => setFPersonId(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Nombre</label>
              <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Ej: Inglés, Tenis..."
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(em => (
                  <button key={em} type="button" onClick={() => setFEmoji(em)}
                    className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                    style={{ backgroundColor: fEmoji === em ? '#a3e635' : '#f3f4f6' }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} type="button" onClick={() => setFColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: fColor === c ? '#111' : 'transparent' }} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Días</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_ES.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ backgroundColor: fDays.includes(i) ? '#1a7a4a' : '#f3f4f6', color: fDays.includes(i) ? 'white' : '#4b5563' }}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Hora</label>
              <input type="time" value={fTime} onChange={e => setFTime(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Notas (opcional)</label>
              <input value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Ej: Prof. Martínez, Club Náutico..."
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: '#1a7a4a' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => { resetForm(); setFormMode('idle') }}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Formulario turno/evento */}
        {formMode === 'new-event' && (
          <form onSubmit={saveEvent} className="bg-white rounded-2xl shadow-sm p-4 mb-5 space-y-3">
            <h2 className="font-bold text-gray-700">Nuevo turno / evento</h2>

            {message && <p className="text-sm text-red-500">{message}</p>}

            <div>
              <label className="text-xs text-gray-500 font-medium">Para quién</label>
              <select value={fPersonId} onChange={e => setFPersonId(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Nombre</label>
              <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Ej: Dr. García, Vacuna..."
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map(em => (
                  <button key={em} type="button" onClick={() => setFEmoji(em)}
                    className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                    style={{ backgroundColor: fEmoji === em ? '#a3e635' : '#f3f4f6' }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Color</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} type="button" onClick={() => setFColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: fColor === c ? '#111' : 'transparent' }} />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium">Fecha</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium">Hora (opcional)</label>
                <input type="time" value={fEventTime} onChange={e => setFEventTime(e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 font-medium">Notas (opcional)</label>
              <input value={fEventNotes} onChange={e => setFEventNotes(e.target.value)} placeholder="Ej: Av. Corrientes 1234, piso 3..."
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
                style={{ backgroundColor: '#0ea5e9' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => { resetForm(); setFormMode('idle') }}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-600">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {message && formMode === 'idle' && (
          <p className="text-sm text-emerald-600 font-medium mb-4 px-1">{message}</p>
        )}

        {/* Filtro por persona */}
        {people.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
            {people.map(p => (
              <button key={p.id} onClick={() => setSelectedPersonId(p.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: selectedPersonId === p.id ? '#1a7a4a' : '#e5e7eb',
                  color: selectedPersonId === p.id ? 'white' : '#4b5563',
                }}>
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Lista de actividades */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No hay actividades para {personName(selectedPersonId)}</p>
        ) : (
          <div className="space-y-3">
            {filteredActivities.map(act => (
              <div key={act.id} className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ borderLeft: `4px solid ${act.color}` }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl">{act.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{act.name}</p>
                    <p className="text-xs text-gray-400">{personName(act.person_id)}</p>
                    {act.notes && <p className="text-xs text-gray-400 truncate">{act.notes}</p>}
                    {act.type === 'recurring' && act.schedules.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: act.color }}>
                        {act.schedules.map((s: ActivitySchedule) => `${DAYS_ES[s.day_of_week]} ${s.time_of_day.slice(0, 5)}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <button onClick={() => deleteActivity(act.id, act.name)}
                    className="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-50 flex-shrink-0">
                    🗑
                  </button>
                </div>

                {/* Eventos del turno */}
                {act.type === 'event' && act.events.map((ev: ActivityEvent) => (
                  <div key={ev.id} className="flex items-center gap-2 px-4 py-2 border-t border-gray-50">
                    <span className="text-xs text-gray-500">
                      📌 {ev.date.split('-').reverse().join('/')}
                      {ev.time_of_day && ` · ${ev.time_of_day.slice(0, 5)}`}
                      {ev.notes && ` · ${ev.notes}`}
                    </span>
                    <button onClick={() => deleteEvent(ev.id, act.id)}
                      className="text-red-300 text-xs ml-auto">✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
