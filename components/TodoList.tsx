'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { TodoItem } from '@/lib/types'

const STALE_MS = 7 * 24 * 60 * 60 * 1000

interface Props {
  todos: TodoItem[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClose: () => void
}

export function TodoList({ todos, onToggle, onRemove, onClose }: Props) {
  const staleCount = todos.filter(
    (t) => !t.done && Date.now() - t.addedAt > STALE_MS
  ).length

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pt-6 pb-4 border-b border-slate-800">
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1"
        >
          ←
        </button>
        <h2 className="text-white font-semibold text-xl flex-1">To-do</h2>
        {staleCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {staleCount} overdue
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-slate-400">No to-dos yet.</p>
            <p className="text-slate-600 text-sm mt-1">Swipe up on an email to add one.</p>
          </div>
        ) : (
          <ul className="px-5 py-4 space-y-2">
            <AnimatePresence initial={false}>
              {todos.map((todo) => {
                const isStale = !todo.done && Date.now() - todo.addedAt > STALE_MS
                return (
                  <motion.li
                    key={todo.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className={`flex items-start gap-3 bg-slate-800 rounded-xl p-4 ${
                        isStale ? 'ring-1 ring-red-500/40' : ''
                      }`}
                    >
                      <button
                        onClick={() => onToggle(todo.id)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                          todo.done
                            ? 'bg-emerald-500 border-emerald-500'
                            : isStale
                            ? 'border-red-400'
                            : 'border-slate-500'
                        }`}
                      >
                        {todo.done && (
                          <span className="flex items-center justify-center text-white text-xs">
                            ✓
                          </span>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            todo.done ? 'text-slate-500 line-through' : 'text-white'
                          }`}
                        >
                          {todo.subject}
                        </p>
                        <p className="text-slate-500 text-xs truncate mt-0.5">
                          {todo.from}
                        </p>
                        {isStale && (
                          <p className="text-red-400 text-xs mt-1">⚠ Added over 7 days ago</p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(todo.id)}
                        className="text-slate-600 hover:text-slate-400 transition-colors text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </motion.div>
  )
}
