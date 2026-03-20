import type { Database } from './database.types'

export type Person = Database['public']['Tables']['people']['Row']
export type Message = Database['public']['Tables']['messages']['Row'] & {
  people?: Pick<Person, 'id' | 'name'> | null
}
