import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Contact } from '@/types'

const QUERY_KEY = 'contacts'

export function useContacts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, application_contacts(application_id)')
        .eq('user_id', user!.id)
        .order('name')
      if (error) throw error
      return data as Contact[]
    },
    enabled: !!user,
  })
}

export function useApplicationContacts(applicationId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [QUERY_KEY, 'for-app', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_contacts')
        .select('contacts(*)')
        .eq('application_id', applicationId)
      if (error) throw error
      return data.map((r: { contacts: unknown }) => r.contacts) as Contact[]
    },
    enabled: !!user && !!applicationId,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (input: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'application_contacts'>) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...input, user_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Contact
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data as Contact
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id).eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  })
}

export function useLinkContactToApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ applicationId, contactId }: { applicationId: string; contactId: string }) => {
      const { error } = await supabase
        .from('application_contacts')
        .insert({ application_id: applicationId, contact_id: contactId })
      if (error && error.code !== '23505') throw error
    },
    onSuccess: (_d, { applicationId }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'for-app', applicationId] })
    },
  })
}

export function useUnlinkContactFromApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ applicationId, contactId }: { applicationId: string; contactId: string }) => {
      const { error } = await supabase
        .from('application_contacts')
        .delete()
        .eq('application_id', applicationId)
        .eq('contact_id', contactId)
      if (error) throw error
    },
    onSuccess: (_d, { applicationId }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, 'for-app', applicationId] })
    },
  })
}
