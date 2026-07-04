import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApplicationForm } from '@/components/forms/ApplicationForm'
import { useCreateApplication } from '@/hooks/useApplications'
import { useUpdateStreak } from '@/hooks/useGamification'
import { toast } from 'sonner'
import type { Application } from '@/types'

export function NewApplicationPage() {
  const navigate = useNavigate()
  const create = useCreateApplication()
  const touchStreak = useUpdateStreak()

  async function handleSubmit(values: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const app = await create.mutateAsync(values)
    toast.success(`${values.company_name} added!`)
    void touchStreak()
    navigate(`/applications/${app.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <div>
        <h2 className="text-xl font-semibold">Add application</h2>
        <p className="text-sm text-muted-foreground">Only company and role are required to save — fill the rest in later.</p>
      </div>
      <ApplicationForm onSubmit={handleSubmit} submitLabel="Save application" loading={create.isPending} />
    </div>
  )
}
