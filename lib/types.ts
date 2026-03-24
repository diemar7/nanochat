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
