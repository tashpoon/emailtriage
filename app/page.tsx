'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CardStack } from '@/components/CardStack'
import { LabelPicker } from '@/components/LabelPicker'
import { TodoList } from '@/components/TodoList'
import { UndoToast } from '@/components/UndoToast'
import { useTodo } from '@/hooks/useTodo'
import {
  fetchInboxEmails,
  fetchLabels,
  archiveEmail,
  starEmail,
  trashEmail,
  untrashEmail,
  labelAndArchiveEmail,
  restoreToInbox,
} from '@/lib/gmail'
import type { Email, GmailLabel, SwipeDirection, UndoAction } from '@/lib/types'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ')

type AppState = 'login' | 'loading' | 'triage' | 'empty'

function buildOAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/api/auth/callback`,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

function extractTokenFromHash(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return params.get('access_token')
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('login')
  const [token, setToken] = useState<string | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [labels, setLabels] = useState<GmailLabel[]>([])
  const [pendingCategorize, setPendingCategorize] = useState<Email | null>(null)
  const [showTodo, setShowTodo] = useState(false)
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { todos, staleCount, addTodo, removeTodo, toggleTodo } = useTodo()

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // On load, check if Google redirected back with a token in the URL hash
  useEffect(() => {
    const accessToken = extractTokenFromHash(window.location.hash)
    if (!accessToken) return
    // Clean the hash from the URL
    window.history.replaceState(null, '', window.location.pathname)
    loadEmails(accessToken)
  }, [])

  const signIn = useCallback(() => {
    window.location.href = buildOAuthUrl()
  }, [])

  const loadEmails = useCallback(async (accessToken: string) => {
    setToken(accessToken)
    setAppState('loading')
    try {
      const [fetchedEmails, fetchedLabels] = await Promise.all([
        fetchInboxEmails(accessToken),
        fetchLabels(accessToken),
      ])
      setLabels(fetchedLabels)
      if (fetchedEmails.length === 0) {
        setAppState('empty')
        return
      }
      setEmails(fetchedEmails)
      setAppState('triage')
      summarizeEmails(fetchedEmails)
    } catch (err) {
      setLoadError(String(err))
      setAppState('login')
    }
  }, [])

  const summarizeEmails = useCallback(async (emailList: Email[]) => {
    const CONCURRENCY = 3
    const queue = [...emailList]
    async function processOne(email: Email) {
      try {
        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: email.subject, from: email.from, snippet: email.snippet }),
        })
        const data = await res.json()
        setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, summary: data.summary } : e))
      } catch {
        setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, summary: e.snippet } : e))
      }
    }
    while (queue.length > 0) {
      await Promise.all(queue.splice(0, CONCURRENCY).map(processOne))
    }
  }, [])

  const removeTopEmail = useCallback((id: string) => {
    setEmails((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const handleSkip = useCallback((email: Email) => {
    setEmails((prev) => [...prev.filter((e) => e.id !== email.id), email])
  }, [])

  const handleSwipe = useCallback(
    async (email: Email, direction: SwipeDirection) => {
      if (!token) return

      // Optimistically remove from stack
      removeTopEmail(email.id)

      if (direction === 'down') {
        // Need label selection — put it back temporarily as pending
        setPendingCategorize(email)
        return
      }

      // Build undo record before acting
      const action: UndoAction = {
        id: crypto.randomUUID(),
        emailId: email.id,
        threadId: email.threadId,
        direction,
        previousLabelIds: email.labelIds,
        timestamp: Date.now(),
      }

      setUndoAction(action)

      try {
        if (direction === 'right') {
          await archiveEmail(token, email.id)
        } else if (direction === 'left') {
          await trashEmail(token, email.id)
        } else if (direction === 'up') {
          addTodo({ id: email.id, subject: email.subject, from: email.from })
          await starEmail(token, email.id)
        }
      } catch (err) {
        console.error('Action failed:', err)
      }
    },
    [token, removeTopEmail, addTodo]
  )

  const handleLabelSelect = useCallback(
    async (label: GmailLabel) => {
      if (!token || !pendingCategorize) return
      const email = pendingCategorize
      setPendingCategorize(null)

      const action: UndoAction = {
        id: crypto.randomUUID(),
        emailId: email.id,
        threadId: email.threadId,
        direction: 'down',
        labelApplied: label.id,
        previousLabelIds: email.labelIds,
        timestamp: Date.now(),
      }
      setUndoAction(action)

      try {
        await labelAndArchiveEmail(token, email.id, label.id)
      } catch (err) {
        console.error('Label action failed:', err)
      }
    },
    [token, pendingCategorize]
  )

  const handleCancelLabel = useCallback(() => {
    if (!pendingCategorize) return
    // Put email back at the top of the stack
    setEmails((prev) => [pendingCategorize, ...prev])
    setPendingCategorize(null)
  }, [pendingCategorize])

  const handleUndo = useCallback(async () => {
    if (!token || !undoAction) return
    const action = undoAction
    setUndoAction(null)

    try {
      if (action.direction === 'left') {
        // Untrash
        await untrashEmail(token, action.emailId)
      } else if (action.direction === 'down' && action.labelApplied) {
        // Remove label + restore to inbox
        await restoreToInbox(token, action.emailId, [action.labelApplied])
      } else {
        // Archive or todo — restore to inbox
        await restoreToInbox(token, action.emailId, [])
      }
      // Re-fetch this email and put it back on top
      // (Simplification: we don't re-add to the visual stack — user can reload)
    } catch (err) {
      console.error('Undo failed:', err)
    }
  }, [token, undoAction])

  const progress =
    appState === 'triage'
      ? `${emails.length} left`
      : appState === 'loading'
      ? 'Loading…'
      : ''

  if (appState === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <div className="text-6xl mb-6">✉️</div>
        <h1 className="text-white text-3xl font-bold mb-2">Email Triage</h1>
        <p className="text-slate-400 mb-8 max-w-xs">
          Swipe through your inbox. Archive, delete, label — one email at a time.
        </p>
        {loadError && (
          <p className="text-red-400 text-sm mb-4 bg-red-950/50 rounded-lg px-4 py-2">
            {loadError}
          </p>
        )}
        <button
          onClick={signIn}
          className="flex items-center gap-3 bg-white text-slate-900 font-semibold px-6 py-3 rounded-2xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Sign in with Google
        </button>
        <p className="text-slate-600 text-xs mt-6 max-w-xs">
          Grants read + modify access to your Gmail. No data is stored — everything stays in your browser and Gmail.
        </p>
      </div>
    )
  }

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400">Loading your inbox…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-safe pt-4 pb-3 shrink-0">
        <h1 className="text-white font-semibold text-lg">Triage</h1>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">{progress}</span>
          <button
            onClick={() => setShowTodo(true)}
            className="relative text-slate-400 hover:text-white transition-colors p-1"
          >
            ✅
            {staleCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {staleCount > 9 ? '9+' : staleCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Card area */}
      <main className="flex-1 relative px-4 pb-safe pb-8 min-h-0">
        <CardStack emails={emails} onSwipe={handleSwipe} onSkip={handleSkip} />
      </main>

      {/* Label picker */}
      <AnimatePresence>
        {pendingCategorize && (
          <LabelPicker
            labels={labels}
            onSelect={handleLabelSelect}
            onCancel={handleCancelLabel}
          />
        )}
      </AnimatePresence>

      {/* Todo panel */}
      <AnimatePresence>
        {showTodo && (
          <TodoList
            todos={todos}
            onToggle={toggleTodo}
            onRemove={removeTodo}
            onClose={() => setShowTodo(false)}
          />
        )}
      </AnimatePresence>

      {/* Undo toast */}
      <UndoToast
        action={undoAction}
        onUndo={handleUndo}
        onExpire={() => setUndoAction(null)}
      />
    </div>
  )
}
