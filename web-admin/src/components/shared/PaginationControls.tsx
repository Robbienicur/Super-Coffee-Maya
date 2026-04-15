'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  page: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function PaginationControls({
  page,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex items-center justify-between text-sm text-coffee-500 pt-4">
      <span>
        {totalCount} resultado{totalCount !== 1 ? 's' : ''} — Página {page} de{' '}
        {totalPages || 1}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Siguiente
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
