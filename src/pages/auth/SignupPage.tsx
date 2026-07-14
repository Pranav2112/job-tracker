import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { parseAuthError, getPasswordStrength } from '@/lib/authErrors'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { GoogleIcon } from '@/components/common/GoogleIcon'

export function SignupPage() {
  const [fullName, setFullName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)

  const strength = getPasswordStrength(password)
  const passwordsMatch = confirm.length === 0 || password === confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (strength.score < 2)   { setError('Please choose a stronger password.'); return }

    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), display_name: fullName.trim().split(' ')[0] },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) { setError(parseAuthError(error.message)); setLoading(false); return }
    setDone(true)
    setLoading(false)
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

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Mail className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Check your inbox</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-foreground">{email}</span>.
              <br />Click it to activate your account, then sign in.
            </p>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Didn't get it? Check your spam folder.</p>
          </div>
          <Link
            to="/login"
            className="inline-block text-sm font-semibold text-primary hover:underline"
          >
            Back to sign in →
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
          <p className="text-sm text-muted-foreground">Free forever. No credit card needed.</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3">
              <p className="text-destructive text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Alex Johnson"
              autoComplete="name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="h-11"
            />
          </div>

          {/* Email */}
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

          {/* Password with strength meter */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                placeholder="Min 8 characters"
                autoComplete="new-password"
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
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ backgroundColor: i <= strength.score ? strength.color : 'hsl(var(--muted))' }}
                    />
                  ))}
                </div>
                <p className="text-xs" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={showPw ? 'text' : 'password'}
                placeholder="Re-enter password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className={cn('h-11 pr-10', !passwordsMatch && 'border-destructive focus-visible:ring-destructive')}
              />
              {confirm.length > 0 && passwordsMatch && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {!passwordsMatch && (
              <p className="text-xs text-destructive">Passwords don't match</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11 gradient-primary border-0 text-white font-semibold mt-2"
            disabled={loading || googleLoading || !passwordsMatch}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
        </p>

        <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </AuthLayout>
  )
}
