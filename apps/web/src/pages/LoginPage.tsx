import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Lock, LogIn, Eye, EyeOff, AlertCircle, Check } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

export function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(phone, password)
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Login failed')

      switch (user.role) {
        case 'ADMIN':
        case 'OWNER':
          navigate('/admin')
          break
        case 'CHEF':
          navigate('/kds')
          break
        case 'CASHIER':
        case 'MANAGER':
          navigate('/pos')
          break
        default:
          navigate('/login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Real-time order tracking',
    'Smart kitchen display',
    'Revenue analytics',
  ]

  return (
    <div className="min-h-screen flex bg-[#09090B] relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF8A00] opacity-[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#FF8A00] opacity-[0.05] blur-[150px] pointer-events-none" />
      <div className="absolute top-[50%] left-[60%] w-[300px] h-[300px] rounded-full bg-[#FF8A00] opacity-[0.02] blur-[100px] pointer-events-none" />

      {/* LEFT SIDE — Visual/Marketing (hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #E85D04 100%)' }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        {/* Top — Brand on left panel */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white/80 text-sm font-medium tracking-wider uppercase">Logesh Kitchen</span>
          </div>
        </div>

        {/* Center — Hero text + features */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-8">
            Manage your restaurant like never before
          </h2>
          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white/90 text-lg font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Tagline */}
        <div className="relative z-10">
          <p className="text-white/60 text-sm">
            Trusted by restaurants across the country. Built for speed, designed for scale.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Brand */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-white">Logesh Kitchen</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#FF8A00]/15 text-[#FF8A00] border border-[#FF8A00]/30">
                ERP
              </span>
            </div>
            <p className="text-gray-400 text-sm">Welcome back. Sign in to your account.</p>
          </div>

          {/* Form Card */}
          <form
            onSubmit={handleSubmit}
            className="bg-[#1A1F2E] rounded-[20px] border border-white/5 p-8 space-y-5"
          >
            {/* Phone Input */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  required
                  autoComplete="tel"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 outline-none transition-all focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 outline-none transition-all focus:border-[#FF8A00] focus:ring-2 focus:ring-[#FF8A00]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-[#FF8A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(255,138,0,0.3)] hover:brightness-110"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-6">
            Restaurant Management System
          </p>
        </motion.div>
      </div>
    </div>
  )
}
