import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseAuthError } from '@/lib/authErrors'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleIcon } from '@/components/common/GoogleIcon'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    // Set storage preference before sign-in so the storage adapter picks it up
    localStorage.setItem('app_remember_me', rememberMe ? 'true' : 'false')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError(parseAuthError(error.message)); setLoading(false); return }
    navigate('/dashboard')
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) { setError(parseAuthError(error.message)); setGoogleLoading(false) }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-sm text-muted-foreground">Sign in to your AppTracker account</p>
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-3 font-medium"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground font-medium tracking-widest">or</span>
          </div>
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3">
              <span className="text-destructive text-xs leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none group">
            <div
              className={`relative h-4 w-4 rounded flex items-center justify-center border transition-all ${
                rememberMe
                  ? 'bg-primary border-primary'
                  : 'border-input bg-background group-hover:border-primary/60'
              }`}
              onClick={() => setRememberMe(v => !v)}
            >
              {rememberMe && (
                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              <input
                type="checkbox"
                className="sr-only"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Remember me
            </span>
            <span className="ml-auto text-xs text-muted-foreground/60">Stay signed in</span>
          </label>

          <Button type="submit" className="w-full h-11 gradient-primary border-0 text-white font-semibold" disabled={loading || googleLoading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline font-semibold">Create one free</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
