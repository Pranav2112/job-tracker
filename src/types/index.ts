export type AppType = 'Internship' | 'FullTime' | 'CoOp'
export type RemoteType = 'Remote' | 'Hybrid' | 'Onsite'
export type PipelineStage =
  | 'Researching' | 'Preparing' | 'Applied' | 'ReferralRequested'
  | 'RecruiterScreen' | 'Interviewing' | 'OfferReceived' | 'Negotiating'
  | 'Accepted' | 'Rejected' | 'Withdrawn' | 'Ghosted'
export type PriorityLevel = 'High' | 'Medium' | 'Low'
export type DocType = 'Resume' | 'CoverLetter' | 'Portfolio' | 'Transcript' | 'Other'
export type ContactRelationship = 'Recruiter' | 'Referral' | 'Alum' | 'HiringManager' | 'Other'
export type InterviewRoundType = 'PhoneScreen' | 'Technical' | 'Behavioral' | 'CaseStudy' | 'Onsite' | 'Final' | 'Other'
export type InterviewFormat = 'Phone' | 'Video' | 'Onsite'
export type InterviewOutcome = 'Pending' | 'Passed' | 'Failed' | 'Cancelled'
export type OfferOutcome = 'Accepted' | 'Declined' | 'Expired'

export interface Application {
  id: string
  user_id: string
  company_name: string
  role_title: string
  app_type: AppType
  location: string | null
  remote_type: RemoteType | null
  posting_url: string | null
  source: string | null
  stage: PipelineStage
  priority: PriorityLevel
  salary_info: string | null
  notes: string | null
  date_discovered: string | null
  date_applied: string | null
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  application_id: string
  doc_type: DocType
  file_name: string
  file_url: string | null
  storage_path: string | null
  version_label: string | null
  date_used: string | null
  created_at: string
}

export interface Contact {
  id: string
  user_id: string
  name: string
  role_title: string | null
  relationship: ContactRelationship
  linkedin_url: string | null
  email: string | null
  notes: string | null
  last_contacted: string | null
  created_at: string
  updated_at: string
  application_contacts?: { application_id: string }[]
}

export interface InterviewRound {
  id: string
  user_id: string
  application_id: string
  round_type: InterviewRoundType
  scheduled_at: string | null
  format: InterviewFormat
  prep_notes: string | null
  post_notes: string | null
  outcome: InterviewOutcome
  created_at: string
  updated_at: string
}

export interface ResearchNote {
  id: string
  user_id: string
  application_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface Offer {
  id: string
  user_id: string
  application_id: string
  base_salary: number | null
  signing_bonus: number | null
  stipend: number | null
  housing: number | null
  equity: string | null
  other_perks: string | null
  offer_deadline: string | null
  final_outcome: OfferOutcome | null
  created_at: string
  updated_at: string
  negotiation_log_entries?: NegotiationLogEntry[]
}

export interface NegotiationLogEntry {
  id: string
  user_id: string
  offer_id: string
  content: string
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  application_id: string
  event_type: string
  payload: Record<string, unknown>
  created_at: string
}
