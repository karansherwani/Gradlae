'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/auth.module.css';

type Mode = 'signin' | 'signup' | 'reset';

const universities = [
  { id: 'uofa', name: 'University of Arizona', domain: 'arizona.edu' },
  { id: 'asu', name: 'Arizona State University', domain: 'asu.edu' },
  { id: 'nau', name: 'Northern Arizona University', domain: 'nau.edu' },
  { id: 'uofc', name: 'University of Colorado Boulder', domain: 'colorado.edu' },
  { id: 'ucsd', name: 'UC San Diego', domain: 'ucsd.edu' },
  { id: 'stanford', name: 'Stanford University', domain: 'stanford.edu' },
  { id: 'mit', name: 'MIT', domain: 'mit.edu' },
  { id: 'berkeley', name: 'UC Berkeley', domain: 'berkeley.edu' },
];

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  // Flow step: university to student credentials
  const [flowStep, setFlowStep] = useState<'university' | 'credentials'>('university');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [uniSearch, setUniSearch] = useState('');

  const [mode, setMode] = useState<Mode>('signin');
  const [netId, setNetId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset Password State
  const [resetMessage, setResetMessage] = useState('');

  const handleLogoClick = async () => {
    const { data } = await supabase.auth.getSession();
    router.push(data.session ? '/dashboard' : '/');
  };

  // Password generator function
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let newPassword = '';
    for (let i = 0; i < 16; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  // Check if user was already directed from landing page with a university pre-selected
  useEffect(() => {
    const uni = localStorage.getItem('selectedUniversity');
    if (uni) {
      setSelectedUniversity(uni);
      setFlowStep('credentials');
    }
  }, []);

  const filteredUniversities = universities.filter(uni =>
    uni.name.toLowerCase().includes(uniSearch.toLowerCase()) ||
    uni.domain.toLowerCase().includes(uniSearch.toLowerCase())
  );

  const getUniversityInfo = (id: string) => {
    const unis: Record<string, { name: string; primaryColor: string; secondaryColor: string }> = {
      uofa: { name: 'University of Arizona', primaryColor: '#C41E3A', secondaryColor: '#003366' },
      asu: { name: 'Arizona State University', primaryColor: '#8B0000', secondaryColor: '#FFB81C' },
      nau: { name: 'Northern Arizona University', primaryColor: '#003466', secondaryColor: '#FFD200' },
      uofc: { name: 'University of Colorado Boulder', primaryColor: '#CFB53B', secondaryColor: '#1E3932' },
      ucsd: { name: 'UC San Diego', primaryColor: '#0066CC', secondaryColor: '#00629B' },
      stanford: { name: 'Stanford University', primaryColor: '#B1040E', secondaryColor: '#8C1515' },
      mit: { name: 'MIT', primaryColor: '#A6192E', secondaryColor: '#8B0000' },
      harvard: { name: 'Harvard University', primaryColor: '#CE1126', secondaryColor: '#165E83' },
      berkeley: { name: 'UC Berkeley', primaryColor: '#003262', secondaryColor: '#FDB827' },
    };
    return unis[id] || { name: 'Your University', primaryColor: '#003366', secondaryColor: '#C41E3A' };
  };

  const getUniversityDomain = (id: string) =>
    universities.find((university) => university.id === id)?.domain || 'arizona.edu';

  const handleUniversitySelect = (uniId: string) => {
    setSelectedUniversity(uniId);
    localStorage.setItem('selectedUniversity', uniId);
    setFlowStep('credentials');
    setError('');
  };

  const handleBack = () => {
    setError('');
    if (flowStep === 'credentials') {
      setFlowStep('university');
      setSelectedUniversity('');
      localStorage.removeItem('selectedUniversity');
      setNetId('');
      setPassword('');
      setConfirmPassword('');
      setMode('signin');
      setResetMessage('');
    } else {
      router.push('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must be at least 8 characters and include uppercase, lowercase, and a number');
        setLoading(false);
        return;
      }
    }

    // Build the email address for Supabase using NetID
    const userEmail = `${netId.toLowerCase().trim()}@${getUniversityDomain(selectedUniversity || 'uofa')}`;
    const fullName = netId.charAt(0).toUpperCase() + netId.slice(1);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          password,
          name: fullName,
          school: selectedUniversity || 'UArizona',
          role: 'student',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Set the Supabase session on the client — AuthProvider picks this up automatically
        if (data.accessToken && data.refreshToken) {
          await supabase.auth.setSession({
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
          });
        }

        console.log('Login successful via Supabase Auth');

        // Navigate to the redirect target or the appropriate dashboard
        setTimeout(() => {
          const defaultRoute = data.role === 'instructor' || data.role === 'staff' ? '/staff/dashboard' : '/dashboard';
          window.location.href = redirectTo || defaultRoute;
        }, 100);
      } else {
        setError(data.message || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('Connection failed. Please try again or contact IT support.');
      console.error('Auth Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetMessage('');

    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: netId ? `${netId.toLowerCase().trim()}@${getUniversityDomain(selectedUniversity || 'uofa')}` : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage(data.message || 'If that account exists, a password reset email has been sent.');
      } else {
        setError(data.message || 'Error processing request');
      }
    } catch {
      setError('An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const uni = selectedUniversity ? getUniversityInfo(selectedUniversity) : null;
  const cssVars = uni ? {
    '--primary-color': uni.primaryColor,
    '--secondary-color': uni.secondaryColor,
  } as React.CSSProperties : {};

  // ─── Step 1: Select University ───
  if (flowStep === 'university') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.push('/')}>
            Back
          </button>
          <div>
            <img src="/gradlae-logo.png" alt="Gradlae" className={styles.authLogo} onClick={handleLogoClick} />
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.authCard}>
            <h1>Select Your University</h1>
            <p>Search and choose your institution to get started</p>

            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Search universities..."
                value={uniSearch}
                onChange={(e) => setUniSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.methodsGrid}>
              {filteredUniversities.map((u) => (
                <button
                  key={u.id}
                  className={styles.methodCard}
                  onClick={() => handleUniversitySelect(u.id)}
                >
                  <div className={styles.methodIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M3 21h18" />
                      <path d="M5 21V8l7-5 7 5v13" />
                      <path d="M9 21v-6h6v6" />
                      <path d="M9 10h.01M12 10h.01M15 10h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3>{u.name}</h3>
                    <p>{u.domain}</p>
                  </div>
                  <span className={styles.arrow} aria-hidden="true"></span>
                </button>
              ))}
              {filteredUniversities.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                  No universities found. Try a different search.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── Step 2: NetID Login (Credentials) ───
  return (
    <div className={styles.container} style={cssVars}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack}>
          Back
        </button>
        <div>
          <img src="/gradlae-logo.png" alt="Gradlae" className={styles.authLogo} onClick={handleLogoClick} />
          {uni && <p className={styles.uniName}>{uni.name}</p>}
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.authCard}>
          <h2>
            {mode === 'signin'
              ? 'Student Sign In'
              : mode === 'signup'
                ? 'Create Student Account'
                : 'Reset Password'}
          </h2>
          <p>
            {mode === 'signin'
              ? 'Enter your NetID credentials to continue'
              : mode === 'signup'
                ? 'Create your account with your NetID'
                : 'Follow the steps to recover access'}
          </p>

          <div className={styles.securityNote}>
            <strong>Secure Login</strong> - Sign in with your university NetID
          </div>

          {mode === 'reset' ? (
            <form onSubmit={handleReset}>
              <div className={styles.formGroup}>
                <label>NetID</label>
                <input
                  type="text"
                  value={netId}
                  onChange={(e) => setNetId(e.target.value)}
                  placeholder="e.g., jsmith"
                  required
                  disabled={loading}
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {resetMessage && (
                <p
                  className={styles.success}
                  style={{ color: 'green', fontSize: '0.9rem', marginBottom: '15px' }}
                >
                  {resetMessage}
                </p>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Processing...' : 'Send Reset Email'}
              </button>

              <button
                type="button"
                className={styles.toggleBtn}
                style={{ marginTop: '15px', width: '100%' }}
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} name="login-form" autoComplete="on">
              <div className={styles.formGroup}>
                <label htmlFor="netId">NetID</label>
                <input
                  id="netId"
                  name="username"
                  type="text"
                  value={netId}
                  onChange={(e) => setNetId(e.target.value)}
                  placeholder="e.g., jsmith"
                  required
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                />
                <p className={styles.fieldHint}>Your unique identifier at {uni?.name}</p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className={styles.togglePassword}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {mode === 'signup' && (
                  <button
                    type="button"
                    className={styles.generateBtn}
                    onClick={generatePassword}
                  >
                    Generate Strong Password
                  </button>
                )}
              </div>

              {mode === 'signup' && (
                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className={styles.togglePassword}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={
                  loading ||
                  !password ||
                  !netId ||
                  (mode === 'signup' && !confirmPassword)
                }
              >
                {loading
                  ? 'Processing...'
                  : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
              </button>

              {mode === 'signin' && (
                <p className={styles.helpText}>
                  Forgot your password?{' '}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                  setMode('reset');
                  setError('');
                  setResetMessage('');
                    }}
                  >
                    Reset it here
                  </a>
                </p>
              )}
            </form>
            
          </>
          )}

          {mode !== 'reset' && (
            <div className={styles.toggleMode}>
              <p>
                {mode === 'signin' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => {
                        setMode('signup');
                        setError('');
                      }}
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => {
                        setMode('signin');
                        setError('');
                        setConfirmPassword('');
                      }}
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        fontFamily: "'Inter', sans-serif",
        color: '#0f172a',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#003366', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
          <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem' }}>Loading authorization portal...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
