'use client'

interface NumberRatingProps {
  value: number
  onChange?: (val: number) => void
  readonly?: boolean
}

// Same visual language as StarRating, but 1-10 — matches the manual "15-Point Evaluation"
// sheet's scoring scale, which doesn't map cleanly onto a 5-star widget.
export default function NumberRating({ value, onChange, readonly = false }: NumberRatingProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`w-6 h-6 rounded-full text-xs font-semibold transition-colors flex items-center justify-center ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          style={{
            backgroundColor: n <= value ? '#C9A84C' : '#F3F4F6',
            color: n <= value ? '#fff' : '#9CA3AF',
            border: n <= value ? 'none' : '1px solid #E5E7EB',
          }}
          aria-label={`Rate ${n} out of 10`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
