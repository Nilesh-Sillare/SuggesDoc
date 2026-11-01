'use client'

export default function AuthCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-[#E6F5F2] bg-cover bg-center bg-no-repeat px-5 py-12 dark:bg-[#071A1D]"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <style>{`
        @keyframes ac-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        @keyframes ac-swap { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes ac-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
        .ac-rise { animation: ac-rise 0.55s cubic-bezier(0.2,0.8,0.2,1) backwards; }
        .ac-swap { animation: ac-swap 0.4s ease-out; }
        .ac-shake { animation: ac-shake 0.4s; }
        @media (prefers-reduced-motion: reduce) { .ac-rise, .ac-swap, .ac-shake { animation: none !important; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-br from-[#04151A]/95 via-[#07262B]/90 to-[#0A3338]/85 dark:block" />

      <div className="ac-rise relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-7 shadow-[0_20px_60px_rgba(13,59,62,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0C2226]/85 dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#2E8B9E] via-[#4FBE8E] to-[#3FA9D6]" />

        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#2E8B9E] to-[#4FBE8E] text-white shadow-lg">
            {icon}
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#0D3B3E] dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[#5C6B6F] dark:text-[#A9C6C4]">{subtitle}</p>}
        </div>

        {children}
      </div>
    </div>
  )
}