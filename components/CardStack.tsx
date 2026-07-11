'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Email, SwipeDirection } from '@/lib/types'
import { SwipeCard } from './SwipeCard'

interface Props {
  emails: Email[]
  onSwipe: (email: Email, direction: SwipeDirection) => void
  onSkip: (email: Email) => void
}

export function CardStack({ emails, onSwipe, onSkip }: Props) {
  const top = emails[0]
  const next = emails[1]

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-white text-2xl font-semibold mb-2">Inbox zero!</h2>
        <p className="text-slate-400">All caught up. Come back later.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Background card (next) */}
      {next && (
        <div className="absolute inset-0 z-0">
          <SwipeCard
            key={next.id}
            email={next}
            onSwipe={() => {}}
            onSkip={() => {}}
            isTop={false}
          />
        </div>
      )}

      {/* Top card */}
      <AnimatePresence>
        {top && (
          <motion.div
            key={top.id}
            className="absolute inset-0 z-10"
            initial={{ scale: 1, opacity: 1 }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2 },
            }}
          >
            <SwipeCard
              email={top}
              onSwipe={(dir) => onSwipe(top, dir)}
              onSkip={() => onSkip(top)}
              isTop={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
