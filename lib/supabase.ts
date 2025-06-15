import { createClient } from '@supabase/supabase-js';

export const supabase = createClient('https://zuvzjcflxbtlibfcnwbc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dnpqY2ZseGJ0bGliZmNud2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDU3NzMsImV4cCI6MjA2NTU4MTc3M30.YS64veKOlZnUMHNn0b7P0nbwhI_K8zgZLV-mDBeIHx8')

export async function uploadFile(file: File) {
    const { data, error } = await supabase.storage.from('contracts').upload(file.name, file)
    if (error) {
        console.error('Error uploading file:', error)
    }
    return data
}