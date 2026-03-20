import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = 'https://yjpbnwiibmtcjjqbehrl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqcGJud2lpYm10Y2pqcWJlaHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMjIwNzksImV4cCI6MjA4OTU5ODA3OX0.gO0ftsSrw50-jv2uByttoWNGB05AF_d5ONHJrLJ0DT8'

let client: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return client
}
