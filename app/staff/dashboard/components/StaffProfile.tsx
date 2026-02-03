'use client';

import { useState, useEffect } from 'react';
import styles from '../../../styles/staff-dashboard.module.css';

interface StaffProfileData {
  staffId: string;
  name: string;
  avatar: string;
  major: string;
  bio: string;
  courses: string[];
  price: number;
  supportsInPerson: boolean;
  supportsOnline: boolean;
  email: string;
  phone?: string;
  officeHours?: string;
  specializations?: string[];
}

export default function StaffProfile({ staffId, staffName }: { staffId: string; staffName: string }) {
  const [profile, setProfile] = useState<StaffProfileData>({
    staffId,
    name: staffName,
    avatar: staffName.split(' ').map(n => n[0]).join('').toUpperCase(),
    major: '',
    bio: '',
    courses: [],
    price: 20,
    supportsInPerson: true,
    supportsOnline: true,
    email: '',
    phone: '',
    officeHours: '',
    specializations: []
  });

  const [isEditing, setIsEditing] = useState(false);
  const [newCourse, setNewCourse] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadProfile();
  }, [staffId]);

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/staff/profile?staffId=${staffId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile({ ...profile, ...data.profile });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/staff/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setSaveStatus('saved');
        setIsEditing(false);
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
    }
  };

  const addCourse = () => {
    if (newCourse.trim() && !profile.courses.includes(newCourse.trim().toUpperCase())) {
      setProfile({
        ...profile,
        courses: [...profile.courses, newCourse.trim().toUpperCase()]
      });
      setNewCourse('');
    }
  };

  const removeCourse = (course: string) => {
    setProfile({
      ...profile,
      courses: profile.courses.filter(c => c !== course)
    });
  };

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileHeader}>
        <div>
          <h1 className={styles.pageTitle}>My Profile</h1>
          <p className={styles.pageSubtitle}>Manage your tutor profile visible to students</p>
        </div>
        <div className={styles.profileActions}>
          {isEditing ? (
            <>
              <button 
                className={styles.cancelBtn} 
                onClick={() => {
                  setIsEditing(false);
                  loadProfile();
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.saveBtn} 
                onClick={saveProfile}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {saveStatus === 'saved' && (
        <div className={styles.successAlert}>
          ✓ Profile updated successfully!
        </div>
      )}

      {saveStatus === 'error' && (
        <div className={styles.errorAlert}>
          × Failed to save profile. Please try again.
        </div>
      )}

      <div className={styles.profileGrid}>
        {/* Basic Info Card */}
        <div className={styles.profileCard}>
          <h3 className={styles.cardTitle}>Basic Information</h3>
          
          <div className={styles.avatarSection}>
            <div className={styles.profileAvatar}>
              {profile.avatar}
            </div>
            <div>
              <div className={styles.label}>Display Name</div>
              <input
                type="text"
                className={styles.input}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Title / Major</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Senior @ UofA, Computer Science"
              value={profile.major}
              onChange={(e) => setProfile({ ...profile, major: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              placeholder="your.email@arizona.edu"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Phone (Optional)</label>
            <input
              type="tel"
              className={styles.input}
              placeholder="(520) 123-4567"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* Bio Card */}
        <div className={styles.profileCard}>
          <h3 className={styles.cardTitle}>About Me</h3>
          <div className={styles.formGroup}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              placeholder="Tell students about your experience, teaching style, and what makes you a great tutor..."
              rows={6}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              disabled={!isEditing}
            />
            <div className={styles.charCount}>
              {profile.bio.length} / 500 characters
            </div>
          </div>
        </div>

        {/* Courses Card */}
        <div className={styles.profileCard}>
          <h3 className={styles.cardTitle}>Courses I Teach</h3>
          
          <div className={styles.coursesTagContainer}>
            {profile.courses.map(course => (
              <div key={course} className={styles.courseTagEdit}>
                {course}
                {isEditing && (
                  <button
                    className={styles.removeTagBtn}
                    onClick={() => removeCourse(course)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {isEditing && (
            <div className={styles.addCourseForm}>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g., CSC 337"
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && addCourse()}
              />
              <button className={styles.addBtn} onClick={addCourse}>
                + Add
              </button>
            </div>
          )}

          {profile.courses.length === 0 && (
            <div className={styles.emptyMessage}>
              No courses added yet. Add courses that you can tutor!
            </div>
          )}
        </div>

        {/* Availability Settings Card */}
        <div className={styles.profileCard}>
          <h3 className={styles.cardTitle}>Availability Settings</h3>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Hourly Rate</label>
            <div className={styles.priceInput}>
              <span className={styles.priceDollar}>$</span>
              <input
                type="number"
                className={styles.input}
                value={profile.price}
                onChange={(e) => setProfile({ ...profile, price: parseInt(e.target.value) || 20 })}
                disabled={!isEditing}
                min="10"
                max="100"
              />
              <span className={styles.priceLabel}>per hour</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Meeting Types</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={profile.supportsOnline}
                  onChange={(e) => setProfile({ ...profile, supportsOnline: e.target.checked })}
                  disabled={!isEditing}
                />
                <span>Online (Zoom)</span>
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={profile.supportsInPerson}
                  onChange={(e) => setProfile({ ...profile, supportsInPerson: e.target.checked })}
                  disabled={!isEditing}
                />
                <span>In-Person (Campus)</span>
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Office Hours (Optional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Mon/Wed 2-4 PM, Gould-Simpson 930"
              value={profile.officeHours}
              onChange={(e) => setProfile({ ...profile, officeHours: e.target.value })}
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      {/* Preview Card */}
      <div className={styles.previewCard}>
        <h3 className={styles.cardTitle}>Student View Preview</h3>
        <p className={styles.previewSubtitle}>This is how students will see your profile on the Book a Session page</p>
        
        <div className={styles.mentorPreview}>
          <div className={styles.previewHeader}>
            <div className={styles.previewAvatar}>{profile.avatar}</div>
            <div className={styles.previewInfo}>
              <h4 className={styles.previewName}>{profile.name}</h4>
              <div className={styles.previewRating}>
                <span className={styles.starIcon}>★</span>
                <span>5.0</span>
                <span className={styles.reviews}>(0 reviews)</span>
              </div>
            </div>
            <div className={styles.previewPrice}>
              <span className={styles.previewPriceAmount}>${profile.price}</span>
              <span className={styles.previewPricePeriod}>/session</span>
            </div>
          </div>
          <p className={styles.previewBio}>{profile.major}. {profile.bio || 'No bio added yet.'}</p>
          <div className={styles.previewCourses}>
            {profile.courses.length > 0 ? (
              profile.courses.map(course => (
                <span key={course} className={styles.previewCourseTag}>{course}</span>
              ))
            ) : (
              <span className={styles.emptyMessage}>No courses added</span>
            )}
          </div>
          <div className={styles.previewFooter}>
            <div className={styles.previewFooterItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              {profile.supportsInPerson && profile.supportsOnline
                ? "In-Person / Online"
                : profile.supportsOnline
                  ? "Online Only"
                  : "In-Person Only"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}