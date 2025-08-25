import { createClient } from '@supabase/supabase-js'

// Cliente Supabase simple con la clave real
export const supabase = createClient(
  'https://reqfyvseikyjztmnqjdt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcWZ5dnNlaWt5anp0bW5xamR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODEyMzAsImV4cCI6MjA2NDQ1NzIzMH0.GgxfrPBK8q8bq6uaQZd5jskj-UL5qx8IlboH7YL01ZM'
)
