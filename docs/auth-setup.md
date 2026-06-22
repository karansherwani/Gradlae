# Gradlae Auth Setup Guide

## Environment Variables

Set these in **Vercel Dashboard → Settings → Environment Variables** (and in `.env.local` for local dev):

| Variable | Where Used | Description |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Supabase anon/public key (starts with `eyJ...` or `sb_publishable_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role key (secret — never expose to client) |
| `GEMINI_API_KEY` | Server only | Google Gemini API key for quiz generation and the AI advisor |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Server only | Optional alternate name for the same Gemini key |
| `GOOGLE_API_KEY` | Server only | Optional alternate Gemini key name supported by the AI advisor |
| `GEMINI_MODEL` | Server only | Optional preferred Gemini model. Defaults through several Flash model fallbacks |
| `OPENAI_API_KEY` | Server only | Optional AI advisor fallback key |
| `ROUTELLM_API_KEY` | Server only | Optional AI advisor fallback key |
| `STRIPE_SECRET_KEY` | Server only | Stripe secret key for mentoring payments. Must start with `sk_test_` or `sk_live_` |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | Client | Stripe publishable key. Must start with `pk_test_` or `pk_live_` |

### ⚠️ Keys that are NOT needed anymore

| Variable | Status |
|----------|--------|
| `NEXTAUTH_URL` | **Removed** — NextAuth is no longer used |
| `NEXTAUTH_SECRET` | **Removed** — NextAuth is no longer used |
| `MONGODB_URI` | **Removed** — MongoDB is no longer used |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | **Removed** — Google sign-in is no longer used |

## How Auth Works

### Signup Flow
1. User fills out the form on `/auth` (email + password)
2. Client POSTs to `/api/auth/signup`
3. Server calls `supabaseAdmin.auth.admin.createUser()` — **password is bcrypt-hashed by Supabase** (never stored by us)
4. Server inserts a row in `public.users` table (profile data only, no password)
5. Server calls `signInWithPassword()` to get access + refresh tokens
6. Client receives tokens → calls `supabase.auth.setSession()` to establish the browser session
7. `AuthProvider` picks up the session change and hydrates the UI

### Login Flow
1. Client POSTs to `/api/auth/signin`
2. Server calls `supabaseAdmin.auth.signInWithPassword()` — **Supabase verifies the bcrypt hash**
3. Server returns access + refresh tokens
4. Client sets session (same as signup step 6-7)

### Session Management
- `AuthProvider` is the single source of truth
- On mount, it calls `supabase.auth.getSession()` to check for existing sessions
- It listens for `onAuthStateChange` events (login, logout, token refresh)
- Protected pages use the `useAuth()` hook and redirect to `/auth` if no session

### Logout
- `signOut()` calls `supabase.auth.signOut()` and clears any localStorage remnants
- Redirects to `/`

## Password Security

### ✅ What we do
- **Passwords are only handled by Supabase Auth** — they use bcrypt with salt internally
- Passwords are sent over HTTPS to our API route, then forwarded to Supabase
- We **never** store passwords in our `public.users` table or any other table
- We **never** log passwords in console output
- We **never** write passwords to localStorage

### ❌ What was removed
- `app/data/users.json` — contained **plaintext passwords** (deleted and gitignored)
- `app/api/auth/login/route.ts` — compared passwords with `===` against JSON file (replaced with Supabase proxy)
- `app/api/auth/reset/route.ts` — custom OTP/password update flow removed; now uses Supabase recovery emails
- `app/lib/db.ts` → `updateUserPassword()` — stored passwords in plaintext (no longer called)

## Supabase Dashboard Config

### Required for Production
1. **Authentication → URL Configuration → Site URL**: Set to your Vercel production URL.
2. **Authentication → URL Configuration → Redirect URLs**: Add:
   - `https://your-vercel-domain.vercel.app/**`
   - `http://localhost:3000/**` (for local dev)
3. **Authentication → Providers → Email**: Ensure "Enable Email Signup" is ON
4. **Authentication → Providers → Email**: "Confirm email" can be OFF if you want instant signup (we use `email_confirm: true` in the admin API)

### Database
Run `supabase/migration_full.sql` in the SQL Editor to create all tables.

## Troubleshooting

### "Server error" on signup/login
- Check Vercel function logs for the actual error message
- Most common: env vars not set in Vercel (especially `SUPABASE_SERVICE_ROLE_KEY`)
- Verify the Supabase URL and keys match your project

### Session not persisting after login
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel
- These are used by the client-side `supabase` library to manage sessions

### Protected pages redirect to /auth even when logged in
- Check browser DevTools → Application → Local Storage for `sb-xxxx-auth-token`
- If missing, the Supabase client-side session isn't being established
