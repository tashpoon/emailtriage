'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TodoItem } from '@/lib/types'

const STORAGE_KEY = 'email-triage-todos'
const STALE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function useTodo() {
  const [todos, setTodos] = useState<TodoItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setTodos(JSON.parse(raw))
    } catch {}
  }, [])

  const persist = useCallback((items: TodoItem[]) => {
    setTodos(items)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [])

  const addTodo = useCallback(
    (email: { id: string; subject: string; from: string }) => {
      const item: TodoItem = {
        id: crypto.randomUUID(),
        emailId: email.id,
        subject: email.subject,
        from: email.from,
        addedAt: Date.now(),
        done: false,
      }
      setTodos((prev) => {
        const next = [item, ...prev]
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    []
  )

  const removeTodo = useCallback(
    (id: string) => {
      setTodos((prev) => {
        const next = prev.filter((t) => t.id !== id)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    []
  )

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const staleCount = todos.filter(
    (t) => !t.done && Date.now() - t.addedAt > STALE_MS
  ).length

  // Sort: stale undone first, then undone, then done
  const sortedTodos = [...todos].sort((a, b) => {
    const aStale = !a.done && Date.now() - a.addedAt > STALE_MS
    const bStale = !b.done && Date.now() - b.addedAt > STALE_MS
    if (aStale && !bStale) return -1
    if (!aStale && bStale) return 1
    if (!a.done && b.done) return -1
    if (a.done && !b.done) return 1
    return b.addedAt - a.addedAt
  })

  return { todos: sortedTodos, staleCount, addTodo, removeTodo, toggleTodo }
}
