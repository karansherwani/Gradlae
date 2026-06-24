'use client';

import React, { useCallback, useEffect, useState } from 'react';
import styles from '../../../styles/staff-dashboard.module.css';

interface TimeSlot {
  id: string;
  staffId: string;
  day: string;
  date: string;
  time: string;
  duration: number; 
  isBooked: boolean;
  studentName?: string;
  studentEmail?: string;
}

export default function ScheduleCalendar({ staffId, staffName, accessToken }: { staffId: string; staffName: string; accessToken: string | null }) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    let isMounted = true;

    fetch(`/api/staff/timeslots?staffId=${staffId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (isMounted && data) {
          setTimeSlots(data.slots || []);
        }
      })
      .catch(error => {
        console.error('Error loading time slots:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [staffId, accessToken]);

  const loadTimeSlots = useCallback(async () => {
    try {
      const response = await fetch(`/api/staff/timeslots?staffId=${staffId}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.slots || []);
      }
    } catch (error) {
      console.error('Error loading time slots:', error);
    }
  }, [staffId, accessToken]);

  const createTimeSlot = async () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select both date and time');
      return;
    }

    const selectedDateObj = new Date(selectedDate);
    const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const dateFormatted = selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    try {
      const response = await fetch('/api/staff/timeslots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          staffId,
          staffName,
          day: dayName,
          date: dateFormatted,
          time: formatTime(selectedTime),
          duration: 60,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        await loadTimeSlots(); // Reload to show new slot
        setSelectedDate('');
        setSelectedTime('09:00');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create time slot');
      }
    } catch (error) {
      console.error('Error creating time slot:', error);
      alert('Failed to create time slot');
    }
  };

  const deleteTimeSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;

    try {
      const response = await fetch(`/api/staff/timeslots?slotId=${slotId}`, {
        method: 'DELETE',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (response.ok) {
        loadTimeSlots();
      }
    } catch (error) {
      console.error('Error deleting time slot:', error);
    }
  };

  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getWeekDays = () => {
    const days = [];
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  return (
    <div className={styles.scheduleContainer}>
      <div className={styles.scheduleHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Schedule</h1>
          <p className={styles.pageSubtitle}>Create and manage your tutoring availability</p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Time Slot
        </button>
      </div>

      {/* Week Navigation */}
      <div className={styles.weekNav}>
        <button
          className={styles.weekNavBtn}
          onClick={() => {
            const newWeek = new Date(currentWeek);
            newWeek.setDate(newWeek.getDate() - 7);
            setCurrentWeek(newWeek);
          }}
        >
          ← Previous Week
        </button>
        <span className={styles.weekLabel}>
          {weekDays[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -{' '}
          {weekDays[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
        <button
          className={styles.weekNavBtn}
          onClick={() => {
            const newWeek = new Date(currentWeek);
            newWeek.setDate(newWeek.getDate() + 7);
            setCurrentWeek(newWeek);
          }}
        >
          Next Week →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className={styles.calendarGrid}>
        {weekDays.map((date, index) => {
          const daySlots = timeSlots.filter(slot => {
            // Compare using the formatted date string that matches what we save
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            // Also check if the slot's date matches this format
            return slot.date === formattedDate || slot.date.includes(formattedDate);
          });

          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={index} className={styles.dayColumn}>
              <div className={`${styles.dayHeader} ${isToday ? styles.dayHeaderToday : ''}`}>
                <div className={styles.dayName}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={styles.dayNumber}>{date.getDate()}</div>
              </div>
              <div className={styles.daySlots}>
                {daySlots.length === 0 ? (
                  <div className={styles.noSlots}>No slots</div>
                ) : (
                  daySlots.map(slot => (
                    <div
                      key={slot.id}
                      className={`${styles.slotCard} ${slot.isBooked ? styles.slotBooked : styles.slotAvailable}`}
                    >
                      <div className={styles.slotTime}>{slot.time}</div>
                      {slot.isBooked ? (
                        <div className={styles.slotStudent}>
                          <div className={styles.slotStudentName}>{slot.studentName}</div>
                          <div className={styles.slotStatus}>Booked</div>
                        </div>
                      ) : (
                        <div className={styles.slotActions}>
                          <div className={styles.slotStatus}>Available</div>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => deleteTimeSlot(slot.id)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(12, 35, 75, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0C234B" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div className={styles.statValue}>{timeSlots.filter(s => !s.isBooked).length}</div>
            <div className={styles.statLabel}>Available Slots</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(171, 5, 32, 0.1)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AB0520" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div className={styles.statValue}>{timeSlots.filter(s => s.isBooked).length}</div>
            <div className={styles.statLabel}>Booked Sessions</div>
          </div>
        </div>
        
        </div>
      

      {/* Create Slot Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Create Time Slot</h2>
            <p className={styles.modalSubtitle}>Add a new 1-hour tutoring slot to your schedule</p>

            <div className={styles.formGroup}>
              <label className={styles.label}>Date</label>
              <input
                type="date"
                className={styles.input}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Time</label>
              <select
                className={styles.input}
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              >
                {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
                  <React.Fragment key={hour}>
                    <option value={`${hour.toString().padStart(2, '0')}:00`}>
                      {formatTime(`${hour.toString().padStart(2, '0')}:00`)}
                    </option>
                    <option value={`${hour.toString().padStart(2, '0')}:30`}>
                      {formatTime(`${hour.toString().padStart(2, '0')}:30`)}
                    </option>
                  </React.Fragment>
                ))}
              </select>
            </div>

            <div className={styles.modalInfo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              All slots are 1 hour long and will appear on the Book a Session page for students to book.
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className={styles.confirmBtn} onClick={createTimeSlot}>
                Create Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
