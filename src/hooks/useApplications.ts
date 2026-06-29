import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Application, PipelineStage } from '@/types'

const QUERY_KEY = 'applications'

export function useApplications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Application[]
    },
    enabled: !!user,
  })
}

export function useApplication(id: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as Application
    },
    enabled: !!user && !!id,
  })
}

export function useCreateApplication() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('applications')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single()
      if (error) throw error

      await supabase.from('activity_log').insert({
        user_id: user!.id,
        application_id: data.id,
        event_type: 'created',
        payload: { stage: data.stage },
      })

      return data as Application
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateApplication() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, prev, ...updates }: Partial<Application> & { id: string; prev?: Application }) => {
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single()
      if (error) throw error

      if (prev && 'stage' in updates && updates.stage !== prev.stage) {
        await supabase.from('activity_log').insert({
          user_id: user!.id,
          application_id: id,
          event_type: 'stage_changed',
          payload: { from: prev.stage, to: updates.stage },
        })
      }

      return data as Application
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: [QUERY_KEY, data.id] })
    },
  })
}

export function useUpdateStage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, stage, prevStage }: { id: string; stage: PipelineStage; prevStage: PipelineStage }) => {
      const { error } = await supabase
        .from('applications')
        .update({ stage })
        .eq('id', id)
        .eq('user_id', user!.id)
      if (error) throw error

      await supabase.from('activity_log').insert({
        user_id: user!.id,
        application_id: id,
        event_type: 'stage_changed',
        payload: { from: prevStage, to: stage },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteApplication() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}
