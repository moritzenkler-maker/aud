export interface User {
  id: string
  email: string
  full_name: string
  company: string | null
  role: string
  is_active: boolean
  created_at: string
}

export interface ChecklistItem {
  id: string
  text: string
  category: string | null
  status: 'open' | 'ok' | 'nok' | 'na'
  comment: string | null
  photo_url: string | null
  order: number
}

export interface Audit {
  id: string
  title: string
  description: string | null
  location: string | null
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  category: string
  created_by: User
  assigned_to: User | null
  scheduled_date: string | null
  completed_date: string | null
  created_at: string
  updated_at: string
  ai_summary: string | null
  checklist_items: ChecklistItem[]
}

export interface AuditListItem {
  id: string
  title: string
  location: string | null
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  category: string
  created_by: User
  assigned_to: User | null
  scheduled_date: string | null
  completed_date: string | null
  created_at: string
  checklist_items_count: number
  open_actions_count: number
}

export interface ActionItem {
  id: string
  audit_id: string
  checklist_item_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  assigned_to: User | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface AuditTemplate {
  id: string
  name: string
  category: string
  description: string | null
  items: { id: string; text: string; category: string | null; order: number }[]
}

export interface DashboardStats {
  total_audits: number
  audits_by_status: Record<string, number>
  total_actions: number
  actions_by_status: Record<string, number>
  critical_actions: number
  recent_audits: { id: string; title: string; status: string; category: string; created_at: string }[]
}
