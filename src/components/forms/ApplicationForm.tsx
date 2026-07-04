import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PIPELINE_STAGES, STAGE_LABELS, SOURCES } from '@/lib/constants'
import type { Application, PipelineStage } from '@/types'

const schema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  role_title: z.string().min(1, 'Role title is required'),
  app_type: z.enum(['Internship', 'FullTime', 'CoOp'] as const),
  location: z.string().optional(),
  remote_type: z.enum(['Remote', 'Hybrid', 'Onsite', ''] as const).optional(),
  posting_url: z.string().url('Enter a valid URL (https://…)').optional().or(z.literal('')),
  source: z.string().optional(),
  stage: z.enum(PIPELINE_STAGES as [PipelineStage, ...PipelineStage[]]),
  priority: z.enum(['High', 'Medium', 'Low'] as const),
  salary_info: z.string().optional(),
  notes: z.string().optional(),
  date_discovered: z.string().optional(),
  date_applied: z.string().optional(),
  deadline: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ApplicationFormProps {
  defaultValues?: Partial<Application>
  onSubmit: (values: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  submitLabel?: string
  loading?: boolean
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1 border-b mb-1">
      {children}
    </p>
  )
}

export function ApplicationForm({ defaultValues, onSubmit, submitLabel = 'Save', loading }: ApplicationFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: defaultValues?.company_name ?? '',
      role_title: defaultValues?.role_title ?? '',
      app_type: defaultValues?.app_type ?? 'Internship',
      location: defaultValues?.location ?? '',
      remote_type: (defaultValues?.remote_type ?? '') as FormValues['remote_type'],
      posting_url: defaultValues?.posting_url ?? '',
      source: defaultValues?.source ?? '',
      stage: defaultValues?.stage ?? 'Researching',
      priority: defaultValues?.priority ?? 'Medium',
      salary_info: defaultValues?.salary_info ?? '',
      notes: defaultValues?.notes ?? '',
      date_discovered: defaultValues?.date_discovered ?? new Date().toISOString().split('T')[0],
      date_applied: defaultValues?.date_applied ?? '',
      deadline: defaultValues?.deadline ?? '',
    },
  })

  async function submitHandler(values: FormValues) {
    await onSubmit({
      company_name: values.company_name,
      role_title: values.role_title,
      app_type: values.app_type,
      location: values.location || null,
      remote_type: (values.remote_type || null) as Application['remote_type'],
      posting_url: values.posting_url || null,
      source: values.source || null,
      stage: values.stage,
      priority: values.priority,
      salary_info: values.salary_info || null,
      notes: values.notes || null,
      date_discovered: values.date_discovered || null,
      date_applied: values.date_applied || null,
      deadline: values.deadline || null,
    })
  }

  function sel(name: keyof FormValues) {
    return {
      value: (watch(name) ?? '') as string,
      onValueChange: (v: string) => setValue(name, v as FormValues[typeof name]),
    }
  }

  return (
    <form onSubmit={handleSubmit(submitHandler as Parameters<typeof handleSubmit>[0])} className="space-y-6">

      {/* ── Core info ── */}
      <div className="space-y-4">
        <SectionLabel>The basics</SectionLabel>

        {/* Company */}
        <div className="space-y-1.5">
          <Label htmlFor="company_name">
            Company <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company_name"
            placeholder="Google, Meta, Stripe…"
            autoFocus
            {...register('company_name')}
          />
          {errors.company_name && <p className="text-xs text-destructive">{errors.company_name.message}</p>}
        </div>

        {/* Role */}
        <div className="space-y-1.5">
          <Label htmlFor="role_title">
            Role title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role_title"
            placeholder="Software Engineer Intern, Product Manager…"
            {...register('role_title')}
          />
          {errors.role_title && <p className="text-xs text-destructive">{errors.role_title.message}</p>}
        </div>

        {/* Type + Priority side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Application type</Label>
            <Select {...sel('app_type')}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Internship">🎓 Internship</SelectItem>
                <SelectItem value="FullTime">💼 Full-Time</SelectItem>
                <SelectItem value="CoOp">🔄 Co-op</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>My priority</Label>
            <Select {...sel('priority')}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">🔴 High — dream role</SelectItem>
                <SelectItem value="Medium">🟡 Medium — interested</SelectItem>
                <SelectItem value="Low">⚪ Low — just trying</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stage */}
        <div className="space-y-1.5">
          <Label>Current stage</Label>
          <Select {...sel('stage')}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map(s => (
                <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Location ── */}
      <div className="space-y-4">
        <SectionLabel>Location</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="location">City / state</Label>
            <Input
              id="location"
              placeholder="San Francisco, CA"
              {...register('location')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Work mode</Label>
            <Select {...sel('remote_type')}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Remote / Hybrid / Onsite?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Remote">🌐 Remote</SelectItem>
                <SelectItem value="Hybrid">🏠 Hybrid</SelectItem>
                <SelectItem value="Onsite">🏢 Onsite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── How you found it ── */}
      <div className="space-y-4">
        <SectionLabel>Where you found it</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select {...sel('source')}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="LinkedIn, Referral…" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="posting_url">Job posting URL</Label>
            <Input
              id="posting_url"
              type="url"
              placeholder="https://careers.company.com/…"
              {...register('posting_url')}
            />
            {errors.posting_url && <p className="text-xs text-destructive">{errors.posting_url.message}</p>}
          </div>
        </div>
      </div>

      {/* ── Dates ── */}
      <div className="space-y-4">
        <SectionLabel>Dates</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date_discovered">Discovered</Label>
            <Input id="date_discovered" type="date" className="h-10" {...register('date_discovered')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline">
              Deadline{' '}
              <span className="text-xs font-normal text-amber-600">(important!)</span>
            </Label>
            <Input id="deadline" type="date" className="h-10 border-amber-300 focus-visible:ring-amber-400" {...register('deadline')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date_applied">Applied on</Label>
            <Input id="date_applied" type="date" className="h-10" {...register('date_applied')} />
          </div>
        </div>
      </div>

      {/* ── Extra info ── */}
      <div className="space-y-4">
        <SectionLabel>Extra info</SectionLabel>
        <div className="space-y-1.5">
          <Label htmlFor="salary_info">Salary / stipend</Label>
          <Input
            id="salary_info"
            placeholder="e.g. $7,000/month · $120K base · $50/hr"
            {...register('salary_info')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">
            Notes{' '}
            <span className="text-xs font-normal text-muted-foreground">— anything worth remembering</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Team impressions, recruiter name, referral info, next steps…"
            rows={4}
            className="resize-none"
            {...register('notes')}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} size="lg" className="w-full">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  )
}
