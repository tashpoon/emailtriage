'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GmailLabel } from '@/lib/types'

interface Props {
  labels: GmailLabel[]
  onSelect: (label: GmailLabel) => void
  onCancel: () => void
}

export function LabelPicker({ labels, onSelect, onCancel }: Props) {
  const [search, setSearch] = useState('')

  const filtered = labels.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  )

  // Group: user labels first, then system
  const userLabels = filtered.filter((l) => l.type === 'user')
  const systemLabels = filtered.filter((l) => l.type === 'system')

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-lg bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[70vh]"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          <div className="px-5 pb-3 pt-2">
            <h3 className="text-white font-semibold text-lg mb-3">Apply label & archive</h3>
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search labels…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Label list */}
          <div className="overflow-y-auto flex-1 px-5 pb-8">
            {userLabels.length > 0 && (
              <>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">
                  Your labels
                </p>
                {userLabels.map((label) => (
                  <LabelRow key={label.id} label={label} onSelect={onSelect} />
                ))}
              </>
            )}
            {systemLabels.length > 0 && (
              <>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2 mt-4">
                  System
                </p>
                {systemLabels.map((label) => (
                  <LabelRow key={label.id} label={label} onSelect={onSelect} />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No labels found</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function LabelRow({
  label,
  onSelect,
}: {
  label: GmailLabel
  onSelect: (l: GmailLabel) => void
}) {
  return (
    <button
      onClick={() => onSelect(label)}
      className="w-full text-left px-4 py-3 rounded-xl text-white hover:bg-slate-800 active:bg-slate-700 transition-colors flex items-center gap-3 mb-1"
    >
      <span className="text-slate-400">🏷️</span>
      <span className="truncate">{label.name}</span>
    </button>
  )
}
