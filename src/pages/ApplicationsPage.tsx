import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import {
  ArrowUpDown, ExternalLink, Download, Loader2, ChevronUp, ChevronDown,
  Trash2, RefreshCw, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StageBadge } from '@/components/common/StageBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { useApplications, useUpdateApplication, useDeleteApplication } from '@/hooks/useApplications'
import { formatDate, exportToCSV, needsAttention } from '@/lib/utils'
import { PIPELINE_STAGES, STAGE_LABELS, APP_TYPE_LABELS } from '@/lib/constants'
import { animateBarIn, animateListIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Application, PipelineStage, AppType, PriorityLevel } from '@/types'

function SortHeader({ label, column }: { label: string; column: { toggleSorting: () => void; getIsSorted: () => false | 'asc' | 'desc' } }) {
  const sorted = column.getIsSorted()
  return (
    <button
      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
      onClick={() => column.toggleSorting()}
    >
      {label}
      {sorted === 'asc' ? <ChevronUp className="h-3 w-3" /> : sorted === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  )
}

export function ApplicationsPage() {
  const navigate = useNavigate()
  const { data: applications = [], isLoading } = useApplications()
  const updateApp = useUpdateApplication()
  const deleteApp = useDeleteApplication()

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AppType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all')
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [bulkStage, setBulkStage] = useState<PipelineStage | ''>('')
  const [bulkPending, setBulkPending] = useState(false)
  const bulkBarRef = useRef<HTMLDivElement>(null)
  const tableBodyRef = useRef<HTMLTableSectionElement>(null)

  const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k])

  const filtered = useMemo(() => applications.filter(a => {
    if (stageFilter !== 'all' && a.stage !== stageFilter) return false
    if (typeFilter !== 'all' && a.app_type !== typeFilter) return false
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false
    return true
  }), [applications, stageFilter, typeFilter, priorityFilter])

  useEffect(() => {
    if (selectedIds.length > 0) animateBarIn(bulkBarRef.current)
  }, [selectedIds.length > 0])

  useEffect(() => {
    if (!isLoading && tableBodyRef.current) {
      animateListIn('tr.app-row', tableBodyRef.current)
    }
  }, [isLoading, stageFilter, typeFilter, priorityFilter, globalFilter])

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} application${selectedIds.length > 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkPending(true)
    try {
      await Promise.all(selectedIds.map(id => deleteApp.mutateAsync(id)))
      setRowSelection({})
      toast.success(`Deleted ${selectedIds.length} application${selectedIds.length > 1 ? 's' : ''}`)
    } catch { toast.error('Failed to delete some applications') }
    finally { setBulkPending(false) }
  }

  async function handleBulkStageChange() {
    if (!bulkStage) return
    setBulkPending(true)
    try {
      const appsToUpdate = applications.filter(a => selectedIds.includes(a.id))
      await Promise.all(appsToUpdate.map(a => updateApp.mutateAsync({ id: a.id, stage: bulkStage, prev: a })))
      setRowSelection({})
      setBulkStage('')
      toast.success(`Updated ${selectedIds.length} app${selectedIds.length > 1 ? 's' : ''} → ${STAGE_LABELS[bulkStage]}`)
    } catch { toast.error('Failed to update some applications') }
    finally { setBulkPending(false) }
  }

  const columns = useMemo<ColumnDef<Application>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-border accent-primary cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          ref={el => { if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-border accent-primary cursor-pointer"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={e => e.stopPropagation()}
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'company_name',
      header: ({ column }) => <SortHeader label="Company / Role" column={column} />,
      cell: ({ row }) => {
        const { flag, reason } = needsAttention(row.original)
        return (
          <div className="flex items-start gap-2 min-w-0">
            {flag && <span className="mt-0.5 shrink-0 text-amber-500" title={reason}>⚠</span>}
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-snug truncate">{row.original.company_name}</p>
              <p className="text-xs text-muted-foreground leading-snug truncate">{row.original.role_title}</p>
            </div>
          </div>
        )
      },
      minSize: 180,
    },
    {
      accessorKey: 'stage',
      header: () => <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stage</span>,
      cell: ({ getValue }) => <StageBadge stage={getValue<PipelineStage>()} />,
    },
    {
      accessorKey: 'priority',
      header: () => <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</span>,
      cell: ({ getValue }) => <PriorityBadge priority={getValue<PriorityLevel>()} />,
    },
    {
      accessorKey: 'app_type',
      header: () => <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</span>,
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{APP_TYPE_LABELS[getValue<AppType>()]}</span>,
    },
    {
      accessorKey: 'deadline',
      header: ({ column }) => <SortHeader label="Deadline" column={column} />,
      cell: ({ getValue }) => {
        const v = getValue<string | null>()
        const soon = v && Math.ceil((new Date(v).getTime() - Date.now()) / 86400000) <= 7
        return <span className={cn('text-xs whitespace-nowrap font-medium', soon ? 'text-amber-600' : 'text-muted-foreground')}>{formatDate(v)}</span>
      },
    },
    {
      accessorKey: 'updated_at',
      header: ({ column }) => <SortHeader label="Updated" column={column} />,
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{formatDate(getValue<string>())}</span>,
    },
    {
      id: 'link',
      header: () => null,
      cell: ({ row }) => row.original.posting_url ? (
        <a href={row.original.posting_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null,
      size: 40,
    },
  ], [])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _id, value) => {
      const s = value.toLowerCase()
      return row.original.company_name.toLowerCase().includes(s) || row.original.role_title.toLowerCase().includes(s)
    },
  })

  if (isLoading) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 sm:p-6 space-y-4 pb-24">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search company or role…" value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="h-9 w-full sm:w-56" />
          <Select value={stageFilter} onValueChange={v => setStageFilter(v as PipelineStage | 'all')}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as AppType | 'all')}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
              <SelectItem value="FullTime">Full-Time</SelectItem>
              <SelectItem value="CoOp">Co-op</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as PriorityLevel | 'all')}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="All priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={() => exportToCSV(filtered)}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* ── Mobile card list ───────────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {table.getRowModel().rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 text-sm">No applications found.</div>
        ) : (
          table.getRowModel().rows.map(row => {
            const app = row.original
            const { flag, reason } = needsAttention(app)
            return (
              <button
                key={app.id}
                onClick={() => navigate(`/applications/${app.id}`)}
                className="w-full text-left p-4 rounded-xl border bg-card card-shadow hover:card-shadow-hover transition-all duration-150 active:scale-[0.99] space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {flag && <span className="text-amber-500 shrink-0 text-xs" title={reason}>⚠</span>}
                      <p className="font-semibold text-sm truncate">{app.company_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{app.role_title}</p>
                  </div>
                  <StageBadge stage={app.stage} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={app.priority} />
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {APP_TYPE_LABELS[app.app_type]}
                  </span>
                  {app.deadline && (
                    <span className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full',
                      Math.ceil((new Date(app.deadline).getTime() - Date.now()) / 86400000) <= 7
                        ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                        : 'text-muted-foreground bg-muted'
                    )}>
                      Due {formatDate(app.deadline, 'MMM d')}
                    </span>
                  )}
                </div>
              </button>
            )
          })
        )}
        <p className="text-xs text-muted-foreground pt-1">
          {table.getRowModel().rows.length} of {applications.length} applications
        </p>
      </div>

      {/* ── Desktop table ──────────────────────────────────────────── */}
      <div className="hidden md:block rounded-xl border overflow-hidden card-shadow">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="bg-muted/40 border-b">
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 text-left align-middle" style={{ width: header.column.columnDef.size }}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody ref={tableBodyRef} className="divide-y divide-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center text-muted-foreground py-16 text-sm">No applications found.</td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={cn('app-row cursor-pointer hover:bg-muted/30 transition-colors', row.getIsSelected() && 'bg-primary/4')}
                  onClick={() => navigate(`/applications/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="hidden md:block text-xs text-muted-foreground">
        {table.getRowModel().rows.length} of {applications.length} application{applications.length !== 1 ? 's' : ''}
        {selectedIds.length > 0 && <span className="ml-2 text-primary font-medium">· {selectedIds.length} selected</span>}
      </p>

      {/* Floating bulk action bar */}
      {selectedIds.length > 0 && (
        <div
          ref={bulkBarRef}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 rounded-2xl bg-foreground text-background shadow-2xl"
        >
          <span className="text-sm font-semibold whitespace-nowrap">{selectedIds.length} selected</span>
          <div className="w-px h-5 bg-background/20" />
          <Select value={bulkStage} onValueChange={v => setBulkStage(v as PipelineStage)}>
            <SelectTrigger className="h-8 w-40 bg-background/10 border-background/20 text-background text-xs">
              <SelectValue placeholder="Move to stage…" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" className="h-8 text-xs" disabled={!bulkStage || bulkPending} onClick={handleBulkStageChange}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', bulkPending && 'animate-spin')} />
            Move
          </Button>
          <div className="w-px h-5 bg-background/20" />
          <Button size="sm" variant="ghost" className="h-8 text-xs text-background hover:bg-background/10 hover:text-background gap-1" onClick={() => exportToCSV(applications.filter(a => selectedIds.includes(a.id)))}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1" disabled={bulkPending} onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <div className="w-px h-5 bg-background/20" />
          <button className="text-background/60 hover:text-background transition-colors" onClick={() => setRowSelection({})}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
