'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/support.module.css';

const CONTACT_EMAIL = 'gradlae@gmail.com';

export default function PrivacyPage() {
    const router = useRouter();
    const { user } = useAuth();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <img src="/gradlae-logo.png" alt="Gradlae" className="brandLogo" onClick={() => router.push(user ? '/dashboard' : '/')} style={{ cursor: 'pointer' }} />
                <button className={styles.backBtn} onClick={() => router.push('/')}>
                    Back to Home
                </button>
            </header>

            <main className={styles.main}>
                <div className={styles.contentCard}>
                    <h1>Privacy Policy</h1>
                    <p className={styles.subtitle}>Last updated: January 4, 2026</p>

                    <div className={styles.privacyContent}>
                        <h2>1. Introduction</h2>
                        <p>
                            Welcome to Gradlae. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.
                        </p>

                        <h2>2. Information We Collect</h2>
                        <p>
                            We collect personal information that you provide to us such as name, email address, student ID, and academic transcript data when you express an interest in obtaining information about us or our products and services.
                        </p>

                        <h2>3. How We Use Your Information</h2>
                        <p>
                            We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
                        </p>

                        <h2>4. Data Retention</h2>
                        <p>
                            We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy policy, unless a longer retention period is required or permitted by law (such as tax, accounting or other legal requirements).
                        </p>

                        <h2>5. Security of Information</h2>
                        <p>
                            We use appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
                        </p>

                        <h2>6. Contact Us</h2>
                        <p>
                            If you have questions or comments about this policy, you may email us at {CONTACT_EMAIL}.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
