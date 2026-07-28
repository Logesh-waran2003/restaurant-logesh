import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'

export function KDSLayout() {
  const [time, setTime] = useState(new Date())
  const [department, setDepartment] = useState<string>('ALL')

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const departments = ['ALL', 'MAIN', 'STARTERS', 'BEVERAGES', 'DESSERTS']

  return (
    <div className="h-screen bg-navy text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-lg">🔥 Kitchen Display</h1>
          <div className="flex gap-1">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDepartment(d)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  department === d ? 'bg-accent text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <time className="text-xl font-mono tabular-nums">
          {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </time>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet context={{ department }} />
      </main>
    </div>
  )
}
