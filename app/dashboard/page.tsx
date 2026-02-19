'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = localStorage.getItem('studentName');
    if (!name) {
      router.push('/');
      return;
    }
    // Clean up name if it starts with "Student " (legacy format)
    const cleanName = name.startsWith('Student ') ? name.replace('Student ', '') : name;
    setStudentName(cleanName);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    // Remove auth-related keys only — preserve user data like journal entries
    const authKeys = [
      'studentName', 'userEmail', 'userId', 'studentEmail',
      'loginMethod', 'authToken', 'userType', 'staffRole',
      'studentClasses', 'studentGrades', 'selectedUniversity',
      'studentProfile', 'transcriptData'
    ];
    authKeys.forEach(key => localStorage.removeItem(key));
    router.push('/');
  };

  const features = [
    {
      category: 'PLANNING',
      title: 'Calculate Grades',
      description: 'Track progress and calculate final exam targets',
      icon: '📊',
      path: '/progress'
    },
    {
      category: 'COMMUNITY',
      title: 'Clubs & Events',
      description: 'Explore interest-based clubs and campus events',
      icon: '🎪',
      path: '/clubs'
    },
    {
      category: 'SUPPORT',
      title: 'Book a Session',
      description: 'Schedule tutoring and mentoring appointments',
      icon: '🤝',
      path: '/mentoring'
    }
  ];

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      {/* HEADER */}
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
              {studentName ? studentName.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2) : '?'}
            </div>
            <span className={styles.userName}>{studentName || 'User'}</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* WELCOME SECTION */}
        <section className={styles.welcomeSection}>
          <div className={styles.welcomeContent}>
            <p className={styles.welcomeLabel}>Student Dashboard</p>
            <h1>Welcome back, {studentName}! 👋</h1>
            <p className={styles.welcomeDesc}>
              Your academic success partner. Let's find the optimal course pace for your next semester.
            </p>
          </div>
        </section>

        {/* QUICK ACCESS: Appointments & Journal */}
        <section className={styles.quickAccessGrid}>
          {/* Upcoming Appointments Card */}
          <div className={styles.quickAccessCard}>
            <div className={styles.quickAccessHeader}>
              <div className={styles.quickAccessTitleRow}>
                <svg className={styles.quickAccessIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h3>Upcoming Appointments</h3>
              </div>
              <button className={styles.quickAccessLink} onClick={() => router.push('/mentoring')}>
                Book Session <span>›</span>
              </button>
            </div>
            <div className={styles.quickAccessBody}>
              <div className={styles.quickAccessEmptyIcon}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className={styles.quickAccessEmptyTitle}>No upcoming appointments</p>
              <p className={styles.quickAccessEmptyDesc}>Book a tutoring session to get started</p>
              <button className={styles.quickAccessCta} onClick={() => router.push('/mentoring')}>
                Find a Tutor
              </button>
            </div>
          </div>

          {/* Journal Card */}
          <div className={styles.quickAccessCard}>
            <div className={styles.quickAccessHeader}>
              <div className={styles.quickAccessTitleRow}>
                <svg className={styles.quickAccessIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <h3>Journal</h3>
              </div>
              <button className={styles.quickAccessLink} onClick={() => router.push('/journal')}>
                View All <span>›</span>
              </button>
            </div>
            <div className={styles.quickAccessBody}>
              <div className={styles.quickAccessEmptyIcon}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <p className={styles.quickAccessEmptyTitle}>Plan your path forward</p>
              <p className={styles.quickAccessEmptyDesc}>Reflect, set goals, and track progress</p>
              <button className={styles.quickAccessCtaAlt} onClick={() => router.push('/journal')}>
                Open Journal
              </button>
            </div>
          </div>
        </section>

        {/* AI ADVISOR HERO SECTION - MVP */}
        <section className={styles.aiAdvisorHero}>
          <span className={styles.aiAdvisorBadge}>New Feature</span>
          <div className={styles.aiAdvisorContent}>
            <div className={styles.aiAdvisorText}>
              <h2>AI Academic Advisor</h2>
              <p>
                Get personalized guidance for your graduation journey. Our AI-powered advisor analyzes your
                transcript, learning pace, and goals to create the perfect academic plan.
              </p>
              <div className={styles.aiAdvisorFeatures}>
                <div className={styles.aiAdvisorFeature}>Personalized course recommendations</div>
                <div className={styles.aiAdvisorFeature}>Smart graduation timeline</div>
                <div className={styles.aiAdvisorFeature}>Prerequisite analysis</div>
                <div className={styles.aiAdvisorFeature}>Pace matching for your style</div>
              </div>
              <button className={styles.aiAdvisorCta} onClick={() => router.push('/advisor')}>
                Start Planning with AI
              </button>
            </div>
          </div>
        </section>

        {/* FEATURES/OPTIONS GRID */}
        <div className={styles.sectionHeader}>
          <h2>Academic Tools</h2>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard} onClick={() => router.push('/placements')}>
            <div className={styles.featureIcon}>📋</div>
            <div className={styles.featureBody}>
              <span className={styles.featureCategory}>Placement</span>
              <h3>My Courses</h3>
              <p>Upload transcript to find your optimal course pace</p>
            </div>
            <div className={styles.featureArrow}>→</div>
          </div>

          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard} onClick={() => router.push(feature.path)}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <div className={styles.featureBody}>
                <span className={styles.featureCategory}>{feature.category}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
              <div className={styles.featureArrow}>→</div>
            </div>
          ))}
        </div>

        {/* BATCH INFO GRID */}
        <section className={styles.batchInfoSection}>
          <h2>Our Batch Types</h2>
          <div className={styles.batchGrid}>
            <div className={styles.batchInfoCard}>
              <span className={styles.batchBadge} style={{ background: '#0C234B' }}>Fast Track</span>
              <h3>Batch A</h3>
              <span className={styles.batchDuration}>⏱️ 7 Weeks</span>
              <p className={styles.batchDesc}>Intensive pace for students with strong prerequisite mastery.</p>
            </div>
            <div className={styles.batchInfoCard}>
              <span className={styles.batchBadge} style={{ background: '#0C234B' }}>Standard Track</span>
              <h3>Batch B</h3>
              <span className={styles.batchDuration}>⏱️ Full semester</span>
              <p className={styles.batchDesc}>Balanced pace covering all material thoroughly.</p>
            </div>
            <div className={styles.batchInfoCard}>
              <span className={styles.batchBadge} style={{ background: '#0C234B' }}>Supported Track</span>
              <h3>Batch C</h3>
              <span className={styles.batchDuration}>⏱️ Full semester + tutoring</span>
              <p className={styles.batchDesc}>Extended timeline with additional mentoring and support.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerBottom}>
          © 2026 PaceMatch. University of Arizona Student Portal.
        </div>
      </footer>
    </div>
  );
}