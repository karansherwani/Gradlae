'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import styles from '../styles/results.module.css';

const SECTIONS = {
  'Fast Track': {
    name: 'Fast Track ⚡',
    duration: '7 Weeks',
    meetings: 'MWF 8:00-9:30 AM',
    professor: 'Dr. Sarah Chen',
  },
  'Standard Track': {
    name: 'Standard Track 📚',
    duration: 'Full Semester',
    meetings: 'MWF 1:00-2:30 PM',
    professor: 'Prof. John Smith',
  },
  'Supported Track': {
    name: 'Supported Track 🎯',
    duration: 'Full Semester + Tutoring',
    meetings: 'MWF 3:00-4:30 PM + Tutoring',
    professor: 'Dr. Maria Garcia',
  },
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const score = searchParams.get('score') || '0';
  // Read 'batch' param from quiz, default to Standard Track
  const recommended = searchParams.get('batch') || 'Standard Track';

  // Ensure selected state matches a valid key, fallback if mismatch
  const initialSelection = SECTIONS[recommended as keyof typeof SECTIONS] ? recommended : 'Standard Track';
  const [selected, setSelected] = useState(initialSelection);

  const handleEnroll = () => {
    // @ts-ignore
    alert(`✅ Enrolled in ${SECTIONS[selected]?.name || selected}!`);
    router.push('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Quiz Complete! ✓</h2>
        <p>Your Score: <strong>{score}%</strong></p>
      </div>

      <h3 className={styles.selectTitle}>Choose Your Section:</h3>

      <div className={styles.sectionGrid}>
        {Object.entries(SECTIONS).map(([key, sec]) => (
          <div
            key={key}
            className={`${styles.sectionCard} ${selected === key ? styles.selected : ''
              } ${key === recommended ? styles.recommended : ''}`}
            onClick={() => setSelected(key)}
          >
            {key === recommended && <span className={styles.badge}>Recommended</span>}
            <h4>{sec.name}</h4>
            <div className={styles.detail}>
              <strong>Duration:</strong> {sec.duration}
            </div>
            <div className={styles.detail}>
              <strong>Times:</strong> {sec.meetings}
            </div>
            <div className={styles.detail}>
              <strong>Professor:</strong> {sec.professor}
            </div>
          </div>
        ))}
      </div>

      <button
        className={styles.enrollBtn}
        onClick={handleEnroll}
      >
        Enroll in Selected Section
      </button>

      <button
        className={styles.backBtn}
        onClick={() => router.push('/dashboard')}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading results...</div>}>
      <ResultsContent />
    </Suspense>
  );
}