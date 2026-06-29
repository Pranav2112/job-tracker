import type { PipelineStage, PriorityLevel, AppType, RemoteType } from '@/types'

export const PIPELINE_STAGES: PipelineStage[] = [
  'Researching', 'Preparing', 'Applied', 'ReferralRequested',
  'RecruiterScreen', 'Interviewing', 'OfferReceived', 'Negotiating',
  'Accepted', 'Rejected', 'Withdrawn', 'Ghosted',
]

export const TERMINAL_STAGES: PipelineStage[] = ['Accepted', 'Rejected', 'Withdrawn', 'Ghosted']

export const STAGE_LABELS: Record<PipelineStage, string> = {
  Researching: 'Researching',
  Preparing: 'Preparing',
  Applied: 'Applied',
  ReferralRequested: 'Referral Requested',
  RecruiterScreen: 'Recruiter Screen',
  Interviewing: 'Interviewing',
  OfferReceived: 'Offer Received',
  Negotiating: 'Negotiating',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
  Withdrawn: 'Withdrawn',
  Ghosted: 'Ghosted',
}

export const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; border: string; dot: string }> = {
  Researching:      { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-200',  dot: 'bg-slate-400'   },
  Preparing:        { bg: 'bg-purple-50',   text: 'text-purple-700',  border: 'border-purple-200', dot: 'bg-purple-400'  },
  Applied:          { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-500'    },
  ReferralRequested:{ bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-200', dot: 'bg-indigo-500'  },
  RecruiterScreen:  { bg: 'bg-cyan-50',     text: 'text-cyan-700',    border: 'border-cyan-200',   dot: 'bg-cyan-500'    },
  Interviewing:     { bg: 'bg-sky-50',      text: 'text-sky-700',     border: 'border-sky-200',    dot: 'bg-sky-500'     },
  OfferReceived:    { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-500' },
  Negotiating:      { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-500'   },
  Accepted:         { bg: 'bg-green-50',    text: 'text-green-700',   border: 'border-green-200',  dot: 'bg-green-500'   },
  Rejected:         { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',    dot: 'bg-red-500'     },
  Withdrawn:        { bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-200',   dot: 'bg-gray-400'    },
  Ghosted:          { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200', dot: 'bg-orange-400'  },
}

export const PRIORITY_COLORS: Record<PriorityLevel, { bg: string; text: string }> = {
  High:   { bg: 'bg-red-100',    text: 'text-red-700'    },
  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Low:    { bg: 'bg-gray-100',   text: 'text-gray-600'   },
}

export const APP_TYPE_LABELS: Record<AppType, string> = {
  Internship: 'Internship',
  FullTime: 'Full-Time',
  CoOp: 'Co-op',
}

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
  Remote: 'Remote',
  Hybrid: 'Hybrid',
  Onsite: 'Onsite',
}

export const STALE_DAYS = 30
export const DEADLINE_WARNING_DAYS = 7

export const SOURCES = [
  'LinkedIn', 'Company Website', 'Referral', 'Career Fair',
  'Indeed', 'Handshake', 'Cold Outreach', 'Alumni Network', 'Other',
]
