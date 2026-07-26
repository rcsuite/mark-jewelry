'use client'

import { useState, type DragEvent, type ReactNode } from 'react'
import Link from 'next/link'

type SortableListProps<T extends { id: string }> = {
  items: T[]
  onReorder: (next: T[]) => void
  className?: string
  renderItem: (item: T, ctx: { isDragging: boolean; dragHandleProps: DragHandleProps }) => ReactNode
}

type DragHandleProps = {
  draggable: true
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
}

/** Lightweight HTML5 drag-and-drop list. Whole card is the handle. */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  className,
  renderItem,
}: SortableListProps<T>) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const move = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const from = items.findIndex((i) => i.id === fromId)
    const to = items.findIndex((i) => i.id === toId)
    if (from < 0 || to < 0) return
    const next = [...items]
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    onReorder(next)
  }

  return (
    <div className={className}>
      {items.map((item) => {
        const isDragging = draggingId === item.id
        const isOver = overId === item.id && draggingId !== item.id

        return (
          <div
            key={item.id}
            onDragOver={(e) => {
              e.preventDefault()
              if (draggingId && draggingId !== item.id) setOverId(item.id)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (draggingId) move(draggingId, item.id)
              setOverId(null)
              setDraggingId(null)
            }}
            className={isOver ? 'ring-2 ring-[#14B8A6] ring-offset-2 ring-offset-[#05070A]' : undefined}
          >
            {renderItem(item, {
              isDragging,
              dragHandleProps: {
                draggable: true,
                onDragStart: (e) => {
                  setDraggingId(item.id)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', item.id)
                },
                onDragEnd: () => {
                  setDraggingId(null)
                  setOverId(null)
                },
              },
            })}
          </div>
        )
      })}
    </div>
  )
}

export function PencilButton({
  href,
  onClick,
  label = 'Edit',
}: {
  href?: string
  onClick?: () => void
  label?: string
}) {
  const className =
    'absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center bg-[#05070A]/90 border border-[#14B8A6] text-[#14B8A6] hover:bg-[#14B8A6] hover:text-black transition-colors rounded-sm'

  if (href) {
    return (
      <Link
        href={href}
        className={className}
        title={label}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      >
        <PencilIcon />
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className} title={label} aria-label={label}>
      <PencilIcon />
    </button>
  )
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}
