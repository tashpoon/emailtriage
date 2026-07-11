export interface Email {
  id: string
  threadId: string
  subject: string
  from: string
  fromEmail: string
  snippet: string
  summary?: string
  unsubscribeUrl?: string
  category: 'Primary' | 'Social' | 'Promotions' | 'Updates' | 'Forums' | 'Other'
  date: Date
  labelIds: string[]
}

export interface GmailLabel {
  id: string
  name: string
  type: 'system' | 'user'
}

export type SwipeDirection = 'right' | 'left' | 'up' | 'down'

export interface UndoAction {
  id: string
  emailId: string
  threadId: string
  direction: SwipeDirection
  labelApplied?: string
  previousLabelIds: string[]
  timestamp: number
}

export interface TodoItem {
  id: string
  emailId: string
  subject: string
  from: string
  addedAt: number
  done: boolean
}
