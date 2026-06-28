'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UndoAction } from '@/lib/types'

const UNDO_DURATION = 4500 // ms

const ACTION_LABELS = {
  right: 'Archived',
  left: 'Deleted',
  up: 'Added to to-do',
  down: 'Labeled & archived',
}

interface Props {
  action: UndoAction | null
  onUndo: () => void
  onExpire: () => void
}

export function UndoToast({ action, onUndo, onExpire }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!action) return
    timerRef.current = setTimeout(onExpire, UNDO_DURATION)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [action, onExpire])

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          key={action.id}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-40"
        >
          <div className="bg-slate-700 rounded-2xl shadow-xl flex items-center gap-3 px-4 py-3 max-w-sm w-full">
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl bg-slate-600 overflow-hidden">
              <motion.div
                className="h-full bg-indigo-400"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: UNDO_DURATION / 1000, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
              />
            </div>

            <span className="text-white text-sm flex-1">
              {ACTION_LABELS[action.direction]}
            </span>
            <button
              onClick={onUndo}
              className="text-indigo-400 font-semibold text-sm hover:text-indigo-300 transition-colors"
            >
              Undo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
