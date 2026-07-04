import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile } from '@/types'

const QK = 'profile'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [QK, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
    staleTime: 60_000,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'provider'>>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK, user?.id] }),
  })
}

export function useUploadAvatar() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const ext  = file.name.split('.').pop()
      const path = `${user!.id}/avatar.${ext}`

      // Upsert — replaces existing avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      // Cache-bust the URL so the browser doesn't show the old avatar
      const avatarUrl = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user!.id)
      if (updateError) throw updateError

      return avatarUrl
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK, user?.id] }),
  })
}

export function useChangePassword() {
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      // Re-authenticate to verify current password before updating
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })
      if (reAuthError) throw new Error('Current password is incorrect.')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      // Deleting from auth.users cascades to all user data via ON DELETE CASCADE
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error
    },
  })
}
