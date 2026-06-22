'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import styles from '../styles/chat-widget.module.css';

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-5 4v-4.5A2.5 2.5 0 0 1 4 13.5v-8Z" />
    <path d="M8 8h8M8 11.5h5" />
  </svg>
);

export default function PaceMatchChatWidget() {
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();
  const isSignedIn = !!user;
  const signInHref = isSignedIn ? '/dashboard' : '/auth';
  const advisorHref = isSignedIn ? '/advisor' : '/auth?redirect=/advisor';
  const signInLabel = isSignedIn
    ? 'I am signed in and need account help'
    : 'I am a student trying to sign in';

  return (
    <div className={styles.widget}>
      {open && (
        <section className={styles.panel} aria-label="Gradlae chat options">
          <div className={styles.badge}>
            <img src="/gradlae-logo.png" alt="Gradlae" width={32} height={32} />
          </div>
          <button className={styles.closeButton} onClick={() => setOpen(false)} aria-label="Close chat">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <h2>Hi there.</h2>
          <p className={styles.prompt}>What best describes what you need today?</p>

          <div className={styles.options}>
            <a href={loading ? '/help' : signInHref}>{signInLabel}</a>
            <a href={loading ? '/help' : advisorHref}>I need academic planning support</a>
            <a href="/help">I need product support</a>
          </div>

          <div className={styles.notice}>
            <p>
              By using this chat service, you agree to chat monitoring and data processing in accordance with the Gradlae privacy policy.
            </p>
            <strong>Spam protection enabled</strong>
          </div>
        </section>
      )}

      <button
        className={styles.launcher}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close Gradlae chat' : 'Open Gradlae chat'}
      >
        <ChatIcon />
      </button>
    </div>
  );
}
