'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/dashboard.module.css';

/* ─── SVG Icon Components ─── */
const CalendarIcon = ({ size = 18, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PenIcon = ({ size = 18, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HandshakeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function Dashboard() {
  const router = useRouter();
  const { user, dbUser, loading: authLoading, signOut } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
    }
  }, [authLoading, user, router]);

  const name = dbUser?.name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'User';
  const displayName = name.startsWith('Student ') ? name.replace('Student ', '') : name;

  const handleLogout = async () => {
    await signOut();
  };

  const tools = [
    {
      category: 'COURSES',
      title: 'My Courses',
      description: 'Upload your transcript to unlock personalized pace recommendations',
      icon: <FileTextIcon />,
      color: '#0C234B',
      path: '/placements',
    },
    {
      category: 'GRADES',
      title: 'Calculate Grades',
      description: 'See exactly what you need on finals to hit your target GPA',
      icon: <ChartIcon />,
      color: '#AB0520',
      path: '/progress',
    },
    {
      category: 'CAMPUS LIFE',
      title: 'Clubs & Events',
      description: 'Find student orgs, study groups, and events that match your interests',
      icon: <UsersIcon />,
      color: '#0C234B',
      path: '/clubs',
    },
    {
      category: 'SUPPORT',
      title: 'Book a Session',
      description: 'Connect with tutors and mentors who know your courses',
      icon: <HandshakeIcon />,
      color: '#AB0520',
      path: '/mentoring',
    },
  ];

  if (authLoading || !user) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.container}>
      {/* ── HEADER ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>PM</div>
            <span className={styles.logoText}>PaceMatch</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo} onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
            <div className={styles.userAvatar}>
              {displayName ? displayName.split(' ').map((n: string) => n.charAt(0).toUpperCase()).join('').slice(0, 2) : '?'}
            </div>
            <span className={styles.userName}>{displayName || 'User'}</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* ── WELCOME ── */}
        <section className={styles.welcomeSection}>
          <div className={styles.welcomeContent}>
            <p className={styles.welcomeLabel}>Student Dashboard</p>
            <h1>Welcome back, {displayName}</h1>
            <p className={styles.welcomeDesc}>
              Your academic success starts here. Plan your semester, track your grades, and find the pace that fits your life.
            </p>
          </div>
        </section>

        {/* ── QUICK ACCESS: Appointments & Journal ── */}
        <section className={styles.quickAccessGrid}>
          {/* Appointments Card */}
          <div className={styles.quickAccessCard}>
            <div className={styles.quickAccessHeader}>
              <div className={styles.quickAccessTitleRow}>
                <CalendarIcon size={16} />
                <h3>Upcoming Appointments</h3>
              </div>
              <button className={styles.quickAccessLink} onClick={() => router.push('/mentoring')}>
                View all <span>›</span>
              </button>
            </div>
            <div className={styles.quickAccessBody}>
              <div className={styles.quickAccessEmptyIcon}>
                <CalendarIcon size={20} strokeWidth={1.5} />
              </div>
              <p className={styles.quickAccessEmptyTitle}>No upcoming sessions</p>
              <p className={styles.quickAccessEmptyDesc}>Book a tutor to get one-on-one help with your toughest courses</p>
              <button className={styles.quickAccessCta} onClick={() => router.push('/mentoring')}>
                Find a Tutor
              </button>
            </div>
          </div>

          {/* Journal Card */}
          <div className={styles.quickAccessCard}>
            <div className={styles.quickAccessHeader}>
              <div className={styles.quickAccessTitleRow}>
                <PenIcon size={16} />
                <h3>Journal</h3>
              </div>
              <button className={styles.quickAccessLink} onClick={() => router.push('/journal')}>
                View all <span>›</span>
              </button>
            </div>
            <div className={styles.quickAccessBody}>
              <div className={styles.quickAccessEmptyIcon}>
                <PenIcon size={20} strokeWidth={1.5} />
              </div>
              <p className={styles.quickAccessEmptyTitle}>Start your journal</p>
              <p className={styles.quickAccessEmptyDesc}>Reflect on your week, set goals, and track what&apos;s working</p>
              <button className={styles.quickAccessCtaAlt} onClick={() => router.push('/journal')}>
                Journal
              </button>
            </div>
          </div>
        </section>

        {/* ── AI ADVISOR ── */}
        <section className={styles.aiAdvisorHero}>
          <span className={styles.aiAdvisorBadge}>New</span>
          <div className={styles.aiAdvisorContent}>
            <div className={styles.aiAdvisorText}>
              <h2>AI Academic Advisor</h2>
              <p>
                Get a personalized graduation plan built around your transcript, your pace, and your goals — in minutes, not meetings.
              </p>
              <div className={styles.aiAdvisorFeatures}>
                <div className={styles.aiAdvisorFeature}>Personalized course maps</div>
                <div className={styles.aiAdvisorFeature}>Smart graduation timeline</div>
                <div className={styles.aiAdvisorFeature}>Prerequisite analysis</div>
                <div className={styles.aiAdvisorFeature}>Pace matched to your life</div>
              </div>
              <button className={styles.aiAdvisorCta} onClick={() => router.push('/advisor')}>
                Plan My Semester
              </button>
            </div>
          </div>
        </section>

        {/* ── ACADEMIC TOOLS ── */}
        <div className={styles.sectionHeader}>
          <h2>Academic Tools</h2>
        </div>

        <div className={styles.featuresGrid}>
          {tools.map((tool, i) => (
            <div key={i} className={styles.featureCard} onClick={() => router.push(tool.path)}>
              <div
                className={styles.featureIconWrap}
                style={{ backgroundColor: tool.color }}
              >
                {tool.icon}
              </div>
              <div className={styles.featureBody}>
                <span className={styles.featureCategory}>{tool.category}</span>
                <h3>{tool.title}</h3>
                <p>{tool.description}</p>
              </div>
              <div className={styles.featureArrow}>
                <ArrowRightIcon />
              </div>
            </div>
          ))}
        </div>

        {/* ── BATCH TYPES ── */}
        <section className={styles.batchInfoSection}>
          <h2>Pace Options</h2>
          <div className={styles.batchGrid}>
            {/* Batch A */}
            <div className={styles.batchInfoCard}>
              <span className={styles.batchBadge}>Fast Track</span>
              <h3>Batch A</h3>
              <span className={styles.batchDuration}><ClockIcon /> 7 Weeks</span>
              <p className={styles.batchDesc}>
                Finish sooner. Built for students with strong prep who want to move ahead quickly.
              </p>
            </div>

            {/* Batch B */}
            <div className={styles.batchInfoCard}>
              <span className={styles.batchBadge}>Standard Track</span>
              <h3>Batch B</h3>
              <span className={styles.batchDuration}><ClockIcon /> Full Semester</span>
              <p className={styles.batchDesc}>
                Steady and thorough. The classic pace that balances depth with a manageable workload.
              </p>
            </div>

            {/* Batch C */}
            <div className={styles.batchInfoCard}>
              <span className={styles.batchBadge}>Supported Track</span>
              <h3>Batch C</h3>
              <span className={styles.batchDuration}><ClockIcon /> Full Semester + Tutoring</span>
              <p className={styles.batchDesc}>
                Extra time, extra support. Includes mentoring sessions to help you master every concept.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBottom}>
          © 2026 PaceMatch · University of Arizona Student Portal
        </div>
      </footer>
    </div>
  );
}
