'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import type { Email, SwipeDirection } from '@/lib/types'

interface Props {
  email: Email
  onSwipe: (direction: SwipeDirection) => void
  isTop: boolean
}

const SWIPE_THRESHOLD = 80 // px to trigger swipe
const SWIPE_VELOCITY = 400 // px/s alternative trigger


const CATEGORY_STYLES: Record<string, string> = {
  Primary:    'bg-blue-500/20 text-blue-300',
  Social:     'bg-green-500/20 text-green-300',
  Promotions: 'bg-orange-500/20 text-orange-300',
  Updates:    'bg-purple-500/20 text-purple-300',
  Forums:     'bg-yellow-500/20 text-yellow-300',
  Other:      'bg-slate-500/20 text-slate-400',
}

export function SwipeCard({ email, onSwipe, isTop }: Props) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Rotate slightly on horizontal drag
  const rotate = useTransform(x, [-200, 200], [-12, 12])

  // Direction badge opacity
  const rightOpacity = useTransform(x, [20, 80], [0, 1])
  const leftOpacity = useTransform(x, [-20, -80], [0, 1])
  const upOpacity = useTransform(y, [-20, -80], [0, 1])
  const downOpacity = useTransform(y, [20, 80], [0, 1])

  const activeDir = useRef<SwipeDirection | null>(null)

  function handleDrag(_: unknown, info: PanInfo) {
    const ax = Math.abs(info.offset.x)
    const ay = Math.abs(info.offset.y)

    if (ax > ay) {
      activeDir.current = info.offset.x > 0 ? 'right' : 'left'
    } else {
      activeDir.current = info.offset.y < 0 ? 'up' : 'down'
    }
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const ax = Math.abs(info.offset.x)
    const ay = Math.abs(info.offset.y)
    const vx = Math.abs(info.velocity.x)
    const vy = Math.abs(info.velocity.y)

    let dir: SwipeDirection | null = null

    if (ax > ay) {
      if (ax > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY) {
        dir = info.offset.x > 0 ? 'right' : 'left'
      }
    } else {
      if (ay > SWIPE_THRESHOLD || vy > SWIPE_VELOCITY) {
        dir = info.offset.y < 0 ? 'up' : 'down'
      }
    }

    if (dir) {
      onSwipe(dir)
    } else {
      // Snap back
      x.set(0)
      y.set(0)
    }
    activeDir.current = null
  }

  const formattedDate = email.date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <motion.div
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      style={{ x, y, rotate }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className={`absolute inset-0 cursor-grab active:cursor-grabbing select-none ${
        isTop ? 'z-10' : 'z-0'
      }`}
      animate={isTop ? {} : { scale: 0.95, y: 8 }}
    >
      {/* Direction badges */}
      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute top-6 left-6 z-20 bg-emerald-500 text-white font-bold text-lg px-4 py-2 rounded-full rotate-[-20deg]"
      >
        Archive ✓
      </motion.div>
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute top-6 right-6 z-20 bg-red-500 text-white font-bold text-lg px-4 py-2 rounded-full rotate-[20deg]"
      >
        Delete ✕
      </motion.div>
      <motion.div
        style={{ opacity: upOpacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-blue-500 text-white font-bold text-lg px-4 py-2 rounded-full"
      >
        To-do ✅
      </motion.div>
      <motion.div
        style={{ opacity: downOpacity }}
        className="absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-purple-500 text-white font-bold text-lg px-4 py-2 rounded-full"
      >
        Categorize 🏷️
      </motion.div>

      {/* Card */}
      <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
        {/* Sender */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {(email.from[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{email.from}</p>
              <p className="text-slate-400 text-sm truncate">{email.fromEmail}</p>
            </div>
          </div>
          <span className="text-slate-500 text-sm shrink-0 pt-1">{formattedDate}</span>
        </div>

        {/* Category badge */}
        <div className="mb-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_STYLES[email.category]}`}>
            {email.category}
          </span>
        </div>

        {/* Subject */}
        <h2 className="text-white font-semibold text-lg leading-snug mb-4 line-clamp-3">
          {email.subject}
        </h2>

        {/* Summary / snippet */}
        <div className="mt-auto">
          {email.summary ? (
            <p className="text-slate-300 text-sm leading-relaxed">{email.summary}</p>
          ) : email.snippet ? (
            <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{email.snippet}</p>
          ) : (
            <p className="text-slate-500 text-sm italic animate-pulse">Loading…</p>
          )}
        </div>

        {/* Swipe hint (only on top card) */}
        {isTop && (
          <div className="mt-6 flex justify-center gap-6 text-xs text-slate-600">
            <span>← Delete</span>
            <span>↑ Todo</span>
            <span>↓ Label</span>
            <span>Archive →</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
