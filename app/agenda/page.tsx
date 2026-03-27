'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import type { Person, ActivityWithSchedules } from '@/lib/types'

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatTime(t: string | null) {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatDate(d: string) {
  const [year, month, day] = d.split('-')
  return `${day}/${month}/${year}`
}

type AgendaItem = {
  key: string
  activityId: string
  name: string
  emoji: string
  color: string
  time: string | null
  notes: string | null
  type: 'recurring' | 'event'
  date?: string
}

export default function AgendaPage() {
  const router = useRouter()
  const [me, setMe] = useState<Person | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [viewingPersonId, setViewingPersonId] = useState<string | null>(null)
  const [activities, setActivities] = useState<ActivityWithSchedules[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(0)

  useEffect(() => {
    const supabase = getSupabase()

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: person } = await supabase.from('people').select('*').eq('id', session.user.id).single()
      if (!person) { router.replace('/login'); return }
      setMe(person as Person)

      // Si es admin, cargar lista de personas
      if (person.is_admin) {
        const { data: allPeople } = await supabase.from('people').select('*').order('name')
        const list = (allPeople as Person[]) || []
        setPeople(list)
        // Por defecto ver el primer no-admin (Nano), o el primero disponible
        const defaultPerson = list.find(p => !p.is_admin) || list[0]
        if (defaultPerson) {
          setViewingPersonId(defaultPerson.id)
          await loadActivities(defaultPerson.id)
        }
      } else {
        setViewingPersonId(session.user.id)
        await loadActivities(session.user.id)
      }

      setLoading(false)
    }

    init()
  }, [router])

  async function loadActivities(userId: string) {
    const supabase = getSupabase()
    setLoading(true)

    const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .eq('person_id', userId)
      .order('name')

    if (!acts || acts.length === 0) {
      setActivities([])
      setLoading(false)
      return
    }

    const actIds = acts.map((a: { id: string }) => a.id)

    const [{ data: schedules }, { data: events }] = await Promise.all([
      supabase.from('activity_schedules').select('*').in('activity_id', actIds),
      supabase.from('activity_events').select('*').in('activity_id', actIds).gte('date', new Date().toISOString().slice(0, 10)),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = acts.map((a: any) => ({
      ...a,
      schedules: (schedules || []).filter((s: { activity_id: string }) => s.activity_id === a.id),
      events: (events || []).filter((e: { activity_id: string }) => e.activity_id === a.id),
    }))

    setActivities(merged)
    setLoading(false)
  }

  async function handleSelectPerson(personId: string) {
    setViewingPersonId(personId)
    await loadActivities(personId)
  }

  function getItemsForOffset(offset: number): AgendaItem[] {
    const target = new Date()
    target.setDate(target.getDate() + offset)
    const dayOfWeek = target.getDay()
    const dateStr = target.toISOString().slice(0, 10)

    const items: AgendaItem[] = []

    for (const act of activities) {
      if (act.type === 'recurring') {
        for (const s of act.schedules) {
          if (s.day_of_week === dayOfWeek) {
            items.push({
              key: `rec-${act.id}-${s.id}`,
              activityId: act.id,
              name: act.name,
              emoji: act.emoji,
              color: act.color,
              time: s.time_of_day,
              notes: act.notes,
              type: 'recurring',
            })
          }
        }
      } else {
        for (const ev of act.events) {
          if (ev.date === dateStr) {
            items.push({
              key: `ev-${act.id}-${ev.id}`,
              activityId: act.id,
              name: act.name,
              emoji: act.emoji,
              color: act.color,
              time: ev.time_of_day,
              notes: ev.notes || act.notes,
              type: 'event',
              date: ev.date,
            })
          }
        }
      }
    }

    items.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return a.time.localeCompare(b.time)
    })

    return items
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      offset: i,
      label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAYS_SHORT[d.getDay()],
      items: getItemsForOffset(i),
    }
  })

  const todayItems = getItemsForOffset(selectedDay)
  const selectedDate = new Date()
  selectedDate.setDate(selectedDate.getDate() + selectedDay)

  const viewingPerson = people.find(p => p.id === viewingPersonId) || me

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* HEADER */}
      <div className="relative flex-shrink-0" style={{ backgroundColor: '#1a7a4a' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <div className="absolute top-16 -left-8 w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }} />
        </div>

        <div className="relative z-10 flex items-center gap-3 px-5 pt-8 pb-0">
          <button
            onClick={() => router.back()}
            className="text-2xl font-bold leading-none"
            style={{ color: '#a3e635' }}
          >
            ‹
          </button>
          <div>
            <h1 className="text-white font-black text-2xl tracking-tight leading-none">Agenda</h1>
            {viewingPerson && (
              <p className="text-white/50 text-xs mt-0.5">{viewingPerson.name}</p>
            )}
          </div>
        </div>

        {/* Selector de persona (solo admins) */}
        {me?.is_admin && people.length > 1 && (
          <div className="relative z-10 flex gap-2 px-5 pt-3 overflow-x-auto scrollbar-hide">
            {people.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPerson(p.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: viewingPersonId === p.id ? '#a3e635' : 'rgba(255,255,255,0.15)',
                  color: viewingPersonId === p.id ? '#1a7a4a' : 'rgba(255,255,255,0.8)',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Selector de días */}
        <div className="relative z-10 flex gap-2 px-4 pt-3 pb-10 overflow-x-auto scrollbar-hide">
          {weekDays.map((day) => (
            <button
              key={day.offset}
              onClick={() => setSelectedDay(day.offset)}
              className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all"
              style={{
                backgroundColor: selectedDay === day.offset ? '#a3e635' : 'rgba(255,255,255,0.12)',
                color: selectedDay === day.offset ? '#1a7a4a' : 'rgba(255,255,255,0.8)',
              }}
            >
              <span className="text-xs font-semibold">{day.label}</span>
              {day.items.length > 0 && (
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1"
                  style={{ backgroundColor: selectedDay === day.offset ? '#1a7a4a' : '#a3e635' }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 390 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full" style={{ height: '40px' }}>
            <path d="M0,20 C80,40 160,0 240,20 C310,38 355,10 390,20 L390,40 L0,40 Z" fill="#f0faf4" />
          </svg>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10" style={{ backgroundColor: '#f0faf4' }}>

        <p className="text-sm font-semibold text-gray-500 mb-4 px-1">
          {selectedDay === 0 ? 'Hoy' : selectedDay === 1 ? 'Mañana' : DAYS_ES[selectedDate.getDay()]}{' '}
          {selectedDay > 1 && <span className="font-normal text-gray-400">{formatDate(selectedDate.toISOString().slice(0, 10))}</span>}
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">🎉</span>
            <p className="text-gray-500 font-medium">Nada para este día</p>
            <p className="text-gray-400 text-sm mt-1">¡Día libre!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayItems.map((item) => (
              <div
                key={item.key}
                className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3"
                style={{ borderLeft: `4px solid ${item.color}` }}
              >
                <span className="text-3xl flex-shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {item.time && (
                    <span className="text-sm font-bold" style={{ color: item.color }}>{formatTime(item.time)}</span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                    {item.type === 'recurring' ? 'Semanal' : '📌 Turno'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
