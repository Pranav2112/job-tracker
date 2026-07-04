// Maps raw Supabase error strings to human-readable messages
export function parseAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials'))   return 'Email or password is incorrect.'
  if (m.includes('email not confirmed'))          return 'Please verify your email address before signing in.'
  if (m.includes('user already registered'))      return 'An account with this email already exists. Try signing in instead.'
  if (m.includes('password should be at least'))  return 'Password must be at least 8 characters long.'
  if (m.includes('weak password'))                return 'Password is too weak. Add uppercase letters, numbers, or symbols.'
  if (m.includes('rate limit') || m.includes('too many requests')) return 'Too many attempts. Please wait a moment and try again.'
  if (m.includes('email rate limit'))             return "We've sent too many emails to this address. Please wait before trying again."
  if (m.includes('signup is disabled'))           return 'Sign-ups are temporarily disabled. Please try again later.'
  if (m.includes('network') || m.includes('fetch')) return 'Connection error. Please check your internet and try again.'
  if (m.includes('token has expired'))            return 'This reset link has expired. Please request a new one.'
  if (m.includes('same password'))                return 'New password must be different from your current password.'
  return 'Something went wrong. Please try again.'
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
  width: string
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: '', width: '0%' }

  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const capped = Math.min(4, score) as PasswordStrength['score']
  return {
    score: capped,
    label:  ['', 'Weak', 'Fair', 'Good', 'Strong'][capped],
    color:  ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'][capped],
    width:  ['0%', '25%', '50%', '75%', '100%'][capped],
  }
}
