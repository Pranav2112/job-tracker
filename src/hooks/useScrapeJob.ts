import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ScrapedJob {
  company_name: string | null
  role_title: string | null
  location: string | null
  remote_type: 'Remote' | 'Hybrid' | 'Onsite' | null
  salary_info: string | null
  posting_url: string
  source: string | null
  detected_board: string | null
}

export function useScrapeJob() {
  return useMutation({
    mutationFn: async (url: string): Promise<ScrapedJob> => {
      const { data, error } = await supabase.functions.invoke('scrape-job', {
        body: { url },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      return data as ScrapedJob
    },
  })
}
