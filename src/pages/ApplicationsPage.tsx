import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ExternalLink, Download, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StageBadge } from '@/components/common/StageBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { AttentionFlag } from '@/components/common/AttentionFlag'
import { useApplications } from '@/hooks/useApplications'
import { formatDate, exportToCSV } from '@/lib/utils'
import { PIPELINE_STAGES, STAGE_LABELS, APP_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Application, PipelineStage, AppType, PriorityLevel } from '@/types'

export function ApplicationsPage() {
  const navigate = useNavigate()
  const { data: applications = [], isLoading } = useApplications()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AppType | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | 'all'>('all')

  const filtered = useMemo(() => applications.filter(a => {
    if (stageFilter !== 'all' && a.stage !== stageFilter) return false
    if (typeFilter !== 'all' && a.app_type !== typeFilter) return false
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false
    return true
  }), [applications, stageFilter, typeFilter, priorityFilter])

  const columns = useMemo<ColumnDef<Application>[]>(() => [
    {
      id: 'attention',
      cell: ({ row }) => <AttentionFlag app={row.original} />,
      size: 32,
    },
    {
      accessorKey: 'company_name',
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => column.toggleSorting()}>
          Company
          {column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.company_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.role_title}</p>
        </div>
      ),
    },
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ getValue }) => <StageBadge stage={getValue<PipelineStage>()} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => <PriorityBadge priority={getValue<PriorityLevel>()} />,
    },
    {
      accessorKey: 'app_type',
      header: 'Type',
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{APP_TYPE_LABELS[getValue<AppType>()]}</span>,
    },
    {
      accessorKey: 'deadline',
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => column.toggleSorting()}>
          Deadline
          {column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatDate(getValue<string | null>())}</span>,
    },
    {
      accessorKey: 'updated_at',
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-foreground" onClick={() => column.toggleSorting()}>
          Updated
          {column.getIsSorted() === 'asc' ? <ChevronUp className="h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatDate(getValue<string>())}</span>,
    },
    {
      id: 'link',
      cell: ({ row }) => row.original.posting_url ? (
        <a href={row.original.posting_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null,
      size: 40,
    },
  ], [])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search company or role…"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="h-9 w-52"
          />
          <Select value={stageFilter} onValueChange={v => setStageFilter(v as PipelineStage | 'all')}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as AppType | 'all')}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
              <SelectItem value="FullTime">Full-Time</SelectItem>
              <SelectItem value="CoOp">Co-op</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as PriorityLevel | 'all')}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered)}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b bg-muted/40">
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="text-center text-muted-foreground py-12 text-sm">No applications found.</td></tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={cn('border-b cursor-pointer hover:bg-muted/40 transition-colors')}
                  onClick={() => navigate(`/applications/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{table.getRowModel().rows.length} of {applications.length} applications</p>
    </div>
  )
}
