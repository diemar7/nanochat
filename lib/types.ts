import type { Database } from './database.types'

export type Person = Database['public']['Tables']['people']['Row']
export type Message = Database['public']['Tables']['messages']['Row'] & {
  people?: Pick<Person, 'id' | 'name'> | null
  reply_to?: Pick<Message, 'id' | 'content'> & { people?: Pick<Person, 'id' | 'name'> | null } | null
}
export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  other?: Person | null // para 1 a 1: el otro participante
}
export type MessageReaction = {
  id: string
  message_id: string
  person_id: string
  emoji: string
  created_at: string | null
}

export type Activity = {
  id: string
  person_id: string
  name: string
  emoji: string
  color: string
  type: 'recurring' | 'event'
  notes: string | null
  created_by: string | null
  created_at: string
}

export type ActivitySchedule = {
  id: string
  activity_id: string
  day_of_week: number // 0=domingo..6=sábado
  time_of_day: string // HH:MM:SS
  created_at: string
}

export type ActivityEvent = {
  id: string
  activity_id: string
  date: string // YYYY-MM-DD
  time_of_day: string | null
  notes: string | null
  created_at: string
}

export type ActivityWithSchedules = Activity & {
  schedules: ActivitySchedule[]
  events: ActivityEvent[]
}
