'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import styles from '../../styles/staff-dashboard.module.css';
import ScheduleCalendar from './components/ScheduleCalendar';
import AppointmentsSidebar from './components/AppointmentsSidebar';
import StaffProfile from './components/StaffProfile';
import ReviewsPage from './components/ReviewsPage';

type TabType = 'schedule' | 'appointments' | 'profile' | 'reviews';

export default function StaffDashboard() {
  const router = useRouter();
  const { user, dbUser, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [upcomingCount, setUpcomingCount] = useState(0);

  const staffName = dbUser?.name || user?.user_metadata?.full_name || 'Staff Member';
  const staffId = dbUser?.id || '';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    // Check if user is staff (role check)
    if (dbUser && dbUser.role !== 'instructor' && dbUser.role !== 'staff') {
      router.push('/dashboard');
    }
  }, [authLoading, user, dbUser, router]);

  return (
    <div className={styles.container}>
      {/* TOP HEADER */}
      <header className={styles.topHeader}>
        <div className={styles.headerLogo}>
          <div className={styles.logoMark}>PM</div>
          <span className={styles.logoText}>PaceMatch Staff</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.staffName}>👋 {staffName}</span>
          <button
            className={styles.logoutBtn}
            onClick={() => signOut()}
          >
            Logout
          </button>
        </div>
      </header>

      <div className={styles.dashboardLayout}>
        {/* SIDEBAR NAVIGATION */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <button
              className={`${styles.navBtn} ${activeTab === 'schedule' ? styles.navBtnActive : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Schedule
            </button>

            <button
              className={`${styles.navBtn} ${activeTab === 'appointments' ? styles.navBtnActive : ''}`}
              onClick={() => setActiveTab('appointments')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Appointments
              {upcomingCount > 0 && (
                <span className={styles.badge}>{upcomingCount}</span>
              )}
            </button>

            <button
              className={`${styles.navBtn} ${activeTab === 'profile' ? styles.navBtnActive : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Profile
            </button>

            <button
              className={`${styles.navBtn} ${activeTab === 'reviews' ? styles.navBtnActive : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Reviews
            </button>
          </nav>

          <div className={styles.sidebarFooter}>
            <button className={styles.helpBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Help & Support
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className={styles.mainContent}>
          {activeTab === 'schedule' && (
            <ScheduleCalendar staffId={staffId} staffName={staffName} />
          )}
          {activeTab === 'appointments' && (
            <AppointmentsSidebar
              staffId={staffId}
              onCountUpdate={setUpcomingCount}
            />
          )}
          {activeTab === 'profile' && (
            <StaffProfile staffId={staffId} staffName={staffName} />
          )}
          {activeTab === 'reviews' && (
            <ReviewsPage staffId={staffId} />
          )}
        </main>
      </div>
    </div>
  );
}