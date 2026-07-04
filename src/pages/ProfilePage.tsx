import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  ArrowLeft, Camera, Loader2, CheckCircle2, Eye, EyeOff,
  Mail, Globe, MapPin, Phone, User, AlertTriangle, Shield,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile, useUpdateProfile, useUploadAvatar, useChangePassword, useDeleteAccount } from '@/hooks/useProfile'
import { getPasswordStrength } from '@/lib/authErrors'

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="profile-section rounded-2xl border bg-card/50 overflow-hidden">
      <div className="px-6 py-5 border-b bg-muted/20">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  )
}

// ─── Field row (label left, input right on desktop) ─────────────────────────
function FieldRow({ label, icon: Icon, children }: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground w-32 shrink-0 pt-2.5">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar  = useUploadAvatar()
  const changePassword = useChangePassword()
  const deleteAccount  = useDeleteAccount()

  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  // ── Profile form state ────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState('')
  const [displayName,  setDisplayName]  = useState('')
  const [bio,          setBio]          = useState('')
  const [location,     setLocation]     = useState('')
  const [websiteUrl,   setWebsiteUrl]   = useState('')
  const [phone,        setPhone]        = useState('')
  const [profileDirty, setProfileDirty] = useState(false)

  // ── Password form state ───────────────────────────────────────────────────
  const [currentPw,    setCurrentPw]    = useState('')
  const [newPw,        setNewPw]        = useState('')
  const [confirmPw,    setConfirmPw]    = useState('')
  const [showCurrent,  setShowCurrent]  = useState(false)
  const [showNew,      setShowNew]      = useState(false)
  const [pwError,      setPwError]      = useState<string | null>(null)

  // ── Avatar preview ────────────────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // ── Danger zone ───────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteZone, setShowDeleteZone] = useState(false)

  const pwStrength       = getPasswordStrength(newPw)
  const passwordsMatch   = confirmPw.length === 0 || newPw === confirmPw
  const isEmailProvider  = profile?.provider === 'email' || (!profile?.provider?.includes('google'))

  // Sync profile data into form on load
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name    ?? '')
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio               ?? '')
      setLocation(profile.location     ?? '')
      setWebsiteUrl(profile.website_url ?? '')
      setPhone(profile.phone           ?? '')
    }
  }, [profile])

  // GSAP stagger entrance
  useEffect(() => {
    if (!profileLoading && containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.profile-section'),
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', clearProps: 'all' }
      )
    }
  }, [profileLoading])

  // ── Profile save ──────────────────────────────────────────────────────────
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    await updateProfile.mutateAsync({
      full_name:    fullName    || null,
      display_name: displayName || null,
      bio:          bio         || null,
      location:     location    || null,
      website_url:  websiteUrl  || null,
      phone:        phone       || null,
    })
    setProfileDirty(false)
    toast.success('Profile updated')
  }

  // ── Avatar upload ─────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return }

    setAvatarPreview(URL.createObjectURL(file))
    await uploadAvatar.mutateAsync(file)
    toast.success('Avatar updated')
  }

  // ── Password change ───────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return }
    if (pwStrength.score < 2) { setPwError('Please choose a stronger password.'); return }
    setPwError(null)
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      toast.success('Password updated successfully')
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to update password.')
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    if (deleteConfirm !== user?.email) return
    try {
      await deleteAccount.mutateAsync()
      await signOut()
      navigate('/login')
      toast.success('Your account has been deleted.')
    } catch {
      toast.error('Failed to delete account. Please try again.')
    }
  }

  // ── Avatar src (preview → profile → initials fallback) ────────────────────
  const avatarSrc = avatarPreview ?? profile?.avatar_url
  const initials  = (profile?.full_name ?? user?.email ?? '??').slice(0, 2).toUpperCase()

  if (profileLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6" ref={containerRef}>
      {/* Back header */}
      <div className="profile-section flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      {/* ── Avatar + Profile Info ─────────────────────────────────────────── */}
      <Section title="Profile" description="How you appear to yourself and in exports.">
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Avatar row */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-border"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center text-white text-xl font-bold border-2 border-border/40">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending
                  ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                  : <Camera className="h-5 w-5 text-white" />
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Profile photo</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, GIF · Max 2 MB</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary hover:underline font-medium mt-1"
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? 'Uploading…' : 'Change photo'}
              </button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <FieldRow label="Full name" icon={User}>
              <Input
                value={fullName}
                onChange={e => { setFullName(e.target.value); setProfileDirty(true) }}
                placeholder="Jane Smith"
                className="h-10"
              />
            </FieldRow>
            <FieldRow label="Display name" icon={User}>
              <Input
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setProfileDirty(true) }}
                placeholder="Jane (shown in app)"
                className="h-10"
              />
            </FieldRow>
            <FieldRow label="Bio" icon={User}>
              <textarea
                value={bio}
                onChange={e => { setBio(e.target.value); setProfileDirty(true) }}
                placeholder="CS senior, seeking SWE internships for Summer 2027…"
                rows={3}
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground text-right mt-1">{bio.length}/160</p>
            </FieldRow>
            <FieldRow label="Location" icon={MapPin}>
              <Input
                value={location}
                onChange={e => { setLocation(e.target.value); setProfileDirty(true) }}
                placeholder="San Francisco, CA"
                className="h-10"
              />
            </FieldRow>
            <FieldRow label="Website" icon={Globe}>
              <Input
                type="url"
                value={websiteUrl}
                onChange={e => { setWebsiteUrl(e.target.value); setProfileDirty(true) }}
                placeholder="https://yoursite.com"
                className="h-10"
              />
            </FieldRow>
            <FieldRow label="Phone" icon={Phone}>
              <Input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setProfileDirty(true) }}
                placeholder="+1 (555) 000-0000"
                className="h-10"
              />
            </FieldRow>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              className="gradient-primary border-0 text-white font-semibold h-10 px-6"
              disabled={!profileDirty || updateProfile.isPending}
            >
              {updateProfile.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </Section>

      {/* ── Account Info ──────────────────────────────────────────────────── */}
      <Section title="Account" description="Your login credentials and sign-in method.">
        <div className="space-y-4">
          <FieldRow label="Email" icon={Mail}>
            <div className="flex items-center gap-2">
              <Input
                value={user?.email ?? ''}
                readOnly
                className="h-10 bg-muted/50 cursor-default select-all"
              />
              <span
                className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border"
                style={
                  profile?.provider?.includes('google')
                    ? { background: 'rgba(66,133,244,0.1)', borderColor: 'rgba(66,133,244,0.3)', color: '#4285F4' }
                    : { background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: 'hsl(var(--primary))' }
                }
              >
                {profile?.provider?.includes('google') ? (
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                ) : (
                  <Mail className="h-3 w-3" />
                )}
                {profile?.provider?.includes('google') ? 'Google' : 'Email'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Email changes require verification — contact support if needed.
            </p>
          </FieldRow>
        </div>
      </Section>

      {/* ── Change Password (email users only) ────────────────────────────── */}
      {isEmailProvider && (
        <Section title="Change Password" description="Use a strong password you haven't used before.">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3">
                <p className="text-destructive text-xs leading-relaxed">{pwError}</p>
              </div>
            )}

            {/* Current password */}
            <FieldRow label="Current" icon={Shield}>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Your current password"
                  autoComplete="current-password"
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showCurrent ? 'Hide' : 'Show'}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FieldRow>

            {/* New password */}
            <FieldRow label="New" icon={Shield}>
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    required
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showNew ? 'Hide' : 'Show'}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPw.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ backgroundColor: i <= pwStrength.score ? pwStrength.color : 'hsl(var(--muted))' }}
                        />
                      ))}
                    </div>
                    <p className="text-[11px]" style={{ color: pwStrength.color }}>{pwStrength.label}</p>
                  </div>
                )}
              </div>
            </FieldRow>

            {/* Confirm new password */}
            <FieldRow label="Confirm" icon={Shield}>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                  className="h-10 pr-10"
                />
                {confirmPw.length > 0 && passwordsMatch && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              {!passwordsMatch && (
                <p className="text-[11px] text-destructive mt-1">Passwords don't match</p>
              )}
            </FieldRow>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="outline"
                className="h-10 px-6 font-semibold"
                disabled={
                  !currentPw || !newPw || !confirmPw ||
                  !passwordsMatch || pwStrength.score < 2 ||
                  changePassword.isPending
                }
              >
                {changePassword.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Update password
              </Button>
            </div>
          </form>
        </Section>
      )}

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      <Section
        title="Danger Zone"
        description="Irreversible actions that permanently affect your account."
      >
        <div className="space-y-4">
          {!showDeleteZone ? (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Delete account</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Permanently delete your account and all associated data — applications,
                  contacts, documents, and settings. This cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive h-9 px-4 text-sm font-medium"
                onClick={() => setShowDeleteZone(true)}
              >
                Delete account
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-destructive">This is permanent and irreversible</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All your applications, contacts, documents, achievements, and account data will be
                    permanently deleted. Type your email address below to confirm.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Type <span className="font-semibold text-foreground">{user?.email}</span> to confirm
                </Label>
                <Input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={user?.email ?? 'your@email.com'}
                  className="h-10 border-destructive/30 focus-visible:ring-destructive/40"
                  autoComplete="off"
                />
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowDeleteZone(false); setDeleteConfirm('') }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <Button
                  variant="destructive"
                  className="h-9 px-5 text-sm font-semibold"
                  disabled={deleteConfirm !== user?.email || deleteAccount.isPending}
                  onClick={handleDeleteAccount}
                >
                  {deleteAccount.isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Permanently delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* bottom padding so last section clears footer */}
      <div className="h-4" />
    </div>
  )
}
