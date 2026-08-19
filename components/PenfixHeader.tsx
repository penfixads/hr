'use client'

// Same wordmark treatment (Cormorant Garamond + uppercase tracking) and chrome color
// as Penfix OS's sidebar (jobs.penfixads.com) — one shared visual identity across the
// *.penfixads.com apps. The "HR" tag is the only thing that tells staff which app of
// the suite they're in, since the SSO session carries across all of them.
export default function PenfixHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header style={{ backgroundColor: '#4A0000' }} className="text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/noback.png" alt="Penfix Logo" className="h-12 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-semibold uppercase"
                style={{ fontFamily: 'var(--font-cormorant), "Cormorant Garamond", serif', color: '#C9A84C', letterSpacing: '0.18em' }}
              >
                Penfix
              </h1>
              <span
                className="text-[0.65rem] font-semibold uppercase rounded border px-1.5 py-0.5"
                style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', color: '#C9A84C', borderColor: 'rgba(201,168,76,0.4)', letterSpacing: '0.18em' }}
              >
                HR
              </span>
            </div>
          </div>
        </div>
        {subtitle && (
          <p className="text-sm mt-1 text-white/90">{subtitle}</p>
        )}
      </div>
    </header>
  )
}
