import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { InterviewRound, ResearchNote, Document, Offer, NegotiationLogEntry, ActivityLogEntry } from '@/types'

// ─── Interview Rounds ──────────────────────────────────────────────────────────
export function useInterviewRounds(applicationId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['interview-rounds', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interview_rounds')
        .select('*')
        .eq('application_id', applicationId)
        .eq('user_id', user!.id)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as InterviewRound[]
    },
    enabled: !!user && !!applicationId,
  })
}

export function useCreateInterviewRound() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: Omit<InterviewRound, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('interview_rounds')
        .insert({ ...input, user_id: user!.id })
        .select().single()
      if (error) throw error
      return data as InterviewRound
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['interview-rounds', d.application_id] }),
  })
}

export function useUpdateInterviewRound() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, applicationId, ...updates }: Partial<InterviewRound> & { id: string; applicationId: string }) => {
      const { data, error } = await supabase
        .from('interview_rounds')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select().single()
      if (error) throw error
      return data as InterviewRound
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['interview-rounds', d.application_id] }),
  })
}

export function useDeleteInterviewRound() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
      const { error } = await supabase.from('interview_rounds').delete().eq('id', id).eq('user_id', user!.id)
      if (error) throw error
      return applicationId
    },
    onSuccess: (applicationId) => qc.invalidateQueries({ queryKey: ['interview-rounds', applicationId] }),
  })
}

// ─── Research Notes ────────────────────────────────────────────────────────────
export function useResearchNotes(applicationId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['research-notes', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_notes')
        .select('*')
        .eq('application_id', applicationId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ResearchNote[]
    },
    enabled: !!user && !!applicationId,
  })
}

export function useCreateResearchNote() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ applicationId, content }: { applicationId: string; content: string }) => {
      const { data, error } = await supabase
        .from('research_notes')
        .insert({ application_id: applicationId, content, user_id: user!.id })
        .select().single()
      if (error) throw error
      return data as ResearchNote
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['research-notes', d.application_id] }),
  })
}

export function useDeleteResearchNote() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
      const { error } = await supabase.from('research_notes').delete().eq('id', id).eq('user_id', user!.id)
      if (error) throw error
      return applicationId
    },
    onSuccess: (applicationId) => qc.invalidateQueries({ queryKey: ['research-notes', applicationId] }),
  })
}

// ─── Documents ────────────────────────────────────────────────────────────────
export function useDocuments(applicationId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['documents', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', applicationId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Document[]
    },
    enabled: !!user && !!applicationId,
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({
      applicationId, file, docType, versionLabel, dateUsed,
    }: {
      applicationId: string
      file: File
      docType: string
      versionLabel?: string
      dateUsed?: string
    }) => {
      const ext = file.name.split('.').pop()
      const path = `${user!.id}/${applicationId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user!.id,
          application_id: applicationId,
          doc_type: docType,
          file_name: file.name,
          storage_path: path,
          version_label: versionLabel ?? null,
          date_used: dateUsed ?? null,
        })
        .select().single()
      if (error) throw error
      return data as Document
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['documents', d.application_id] }),
  })
}

export function useAddDocumentLink() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({
      applicationId, fileName, fileUrl, docType, versionLabel, dateUsed,
    }: {
      applicationId: string
      fileName: string
      fileUrl: string
      docType: string
      versionLabel?: string
      dateUsed?: string
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user!.id,
          application_id: applicationId,
          doc_type: docType,
          file_name: fileName,
          file_url: fileUrl,
          version_label: versionLabel ?? null,
          date_used: dateUsed ?? null,
        })
        .select().single()
      if (error) throw error
      return data as Document
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['documents', d.application_id] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, applicationId, storagePath }: { id: string; applicationId: string; storagePath?: string | null }) => {
      if (storagePath) {
        await supabase.storage.from('documents').remove([storagePath])
      }
      const { error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', user!.id)
      if (error) throw error
      return applicationId
    },
    onSuccess: (applicationId) => qc.invalidateQueries({ queryKey: ['documents', applicationId] }),
  })
}

// ─── Offers ───────────────────────────────────────────────────────────────────
export function useOffer(applicationId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['offer', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*, negotiation_log_entries(*)')
        .eq('application_id', applicationId)
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data as (Offer & { negotiation_log_entries: NegotiationLogEntry[] }) | null
    },
    enabled: !!user && !!applicationId,
  })
}

export function useUpsertOffer() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ applicationId, ...updates }: Partial<Offer> & { applicationId: string }) => {
      const { data, error } = await supabase
        .from('offers')
        .upsert({ ...updates, application_id: applicationId, user_id: user!.id }, { onConflict: 'application_id' })
        .select().single()
      if (error) throw error
      return data as Offer
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['offer', d.application_id] }),
  })
}

export function useAddNegotiationEntry() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ offerId, applicationId, content }: { offerId: string; applicationId: string; content: string }) => {
      const { data, error } = await supabase
        .from('negotiation_log_entries')
        .insert({ offer_id: offerId, user_id: user!.id, content })
        .select().single()
      if (error) throw error
      return { data: data as NegotiationLogEntry, applicationId }
    },
    onSuccess: (result) => qc.invalidateQueries({ queryKey: ['offer', result.applicationId] }),
  })
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
export function useActivityLog(applicationId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['activity-log', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('application_id', applicationId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ActivityLogEntry[]
    },
    enabled: !!user && !!applicationId,
  })
}

// ─── Update Research Note ─────────────────────────────────────────────────────
export function useUpdateResearchNote() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; applicationId: string; content: string }) => {
      const { data, error } = await supabase
        .from('research_notes')
        .update({ content })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select().single()
      if (error) throw error
      return data as ResearchNote
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['research-notes', d.application_id] }),
  })
}

// ─── All upcoming interviews (for Kanban countdown) ───────────────────────────
export function useUpcomingInterviews() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['upcoming-interviews'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('interview_rounds')
        .select('id, application_id, scheduled_at, round_type, outcome')
        .eq('user_id', user!.id)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as Pick<InterviewRound, 'id' | 'application_id' | 'scheduled_at' | 'round_type' | 'outcome'>[]
    },
    enabled: !!user,
    staleTime: 60_000,
  })
}
