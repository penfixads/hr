'use client'

interface StarRatingProps {
  value: number
  onChange?: (val: number) => void
  readonly?: boolean
  size?: 'sm' | 'md'
}

const LABELS = ['', 'No knowledge', 'Basic', 'Intermediate', 'Advanced', 'Expert']

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const starSize = size === 'sm' ? 'text-lg' : 'text-2xl'

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${starSize} transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          title={LABELS[star]}
          aria-label={`Rate ${star} - ${LABELS[star]}`}
        >
          <span style={{ color: star <= value ? '#C9A84C' : '#D1D5DB' }}>★</span>
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-gray-500 ml-1">{LABELS[value]}</span>
      )}
    </div>
  )
}
