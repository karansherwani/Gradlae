'use client';

import { useState, useEffect } from 'react';
import styles from '../../../styles/staff-dashboard.module.css';

interface Appointment {
  id: string;
  studentName: string;
  studentEmail: string;
  course: string;
  day: string;
  date: string;
  time: string;
  meetingType: 'Online' | 'In-Person';
  status: 'upcoming' | 'completed' | 'cancelled';
  zoomLink?: string;
  location?: string;
  notes?: string;
  createdAt: string;
}

export default function AppointmentsSidebar({ 
  staffId, 
  accessToken,
  onCountUpdate 
}: { 
  staffId: string; 
  accessToken: string | null;
  onCountUpdate: (count: number) => void;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [staffId]);

  const loadAppointments = async () => {
    try {
      const response = await fetch(`/api/staff/appointments?staffId=${staffId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
        
        // Update upcoming count
        const upcomingCount = (data.appointments || []).filter(
          (apt: Appointment) => apt.status === 'upcoming'
        ).length;
        onCountUpdate(upcomingCount);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'upcoming') return apt.status === 'upcoming';
    if (filter === 'past') return apt.status === 'completed' || apt.status === 'cancelled';
    return true;
  });

  const upcomingAppointments = appointments.filter(apt => apt.status === 'upcoming');
  const pastAppointments = appointments.filter(apt => apt.status === 'completed' || apt.status === 'cancelled');

  return (
    <div className={styles.appointmentsContainer}>
      <div className={styles.appointmentsHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Appointments</h1>
          <p className={styles.pageSubtitle}>View and manage your tutoring sessions</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'upcoming' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming ({upcomingAppointments.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'past' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('past')}
        >
          Past ({pastAppointments.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({appointments.length})
        </button>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h3>No {filter === 'all' ? '' : filter} appointments</h3>
          <p>
            {filter === 'upcoming' 
              ? "You don't have any upcoming sessions scheduled." 
              : filter === 'past'
                ? "No past appointments to display."
                : "No appointments yet. Create time slots so students can book!"}
          </p>
        </div>
      ) : (
        <div className={styles.appointmentsList}>
          {filteredAppointments.map(apt => (
            <div key={apt.id} className={styles.appointmentCard}>
              <div className={styles.appointmentCardHeader}>
                <div className={styles.studentInfo}>
                  <div className={styles.studentAvatar}>
                    {apt.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.studentName}>{apt.studentName}</div>
                    <div className={styles.studentEmail}>{apt.studentEmail}</div>
                  </div>
                </div>
                <div className={`${styles.statusBadge} ${styles[`status${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}`]}`}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </div>
              </div>

              <div className={styles.appointmentDetails}>
                <div className={styles.detailRow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{apt.day}, {apt.date} at {apt.time}</span>
                </div>

                <div className={styles.detailRow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>{apt.meetingType}</span>
                </div>

                {apt.course && (
                  <div className={styles.detailRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <span>{apt.course}</span>
                  </div>
                )}
              </div>

              {apt.status === 'upcoming' && (
                <div className={styles.appointmentActions}>
                  {apt.meetingType === 'Online' && apt.zoomLink && (
                    <a 
                      href={apt.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.joinBtn}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Join Zoom
                    </a>
                  )}
                  {apt.meetingType === 'In-Person' && apt.location && (
                    <div className={styles.locationInfo}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {apt.location}
                    </div>
                  )}
                </div>
              )}

              {apt.notes && (
                <div className={styles.appointmentNotes}>
                  <strong>Notes:</strong> {apt.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className={styles.appointmentsSummary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Sessions</div>
          <div className={styles.summaryValue}>{appointments.length}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>This Month</div>
          <div className={styles.summaryValue}>
            {appointments.filter(apt => {
              const createdDate = new Date(apt.createdAt);
              const now = new Date();
              return createdDate.getMonth() === now.getMonth() && 
                     createdDate.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Completed</div>
          <div className={styles.summaryValue}>
            {appointments.filter(apt => apt.status === 'completed').length}
          </div>
        </div>
      </div>
    </div>
  );
}
