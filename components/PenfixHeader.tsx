'use client'

export default function PenfixHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header style={{ backgroundColor: '#4A0000' }} className="text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/noback.png" alt="Penfix Logo" className="h-12 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <h1 className="text-2xl font-bold tracking-wide" style={{ color: '#C9A84C' }}>PENFIX</h1>
            <p className="text-xs text-white/70 tracking-widest uppercase">Advertising and Business Solutions</p>
          </div>
        </div>
        {subtitle && (
          <p className="text-sm mt-1 text-white/90">{subtitle}</p>
        )}
      </div>
    </header>
  )
}
