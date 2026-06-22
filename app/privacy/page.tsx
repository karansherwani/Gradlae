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
                    <p className={styles.subtitle}>Last updated: June 22, 2026</p>

                    <div className={styles.privacyContent}>
                        <h2>1. Introduction</h2>
                        <p>
                            Welcome to Gradlae. Gradlae is a beta academic planning tool for students. We are committed to protecting your personal information and being clear about how uploaded academic data is used.
                        </p>

                        <h2>2. Information We Collect</h2>
                        <p>
                            We collect information you provide directly, such as your name, email address, student profile details, transcript data, uploaded files, feedback, and messages you send to the AI advisor or support tools.
                        </p>

                        <h2>3. How We Use Your Information</h2>
                        <p>
                            We use this information to create academic plans, analyze completed courses, estimate credits, provide AI advisor responses, improve Gradlae, troubleshoot beta issues, and respond to feedback or support requests.
                        </p>

                        <h2>4. AI Advisor and Transcript Data</h2>
                        <p>
                            When you use the AI advisor, relevant transcript and planning context may be sent to AI service providers so Gradlae can generate responses. Do not upload documents or enter information you do not want processed for academic planning.
                        </p>

                        <h2>5. Data Retention</h2>
                        <p>
                            We keep your information only as long as needed to provide and improve the beta product, unless a longer retention period is required or permitted by law. You may contact us to request deletion of beta account or transcript data.
                        </p>

                        <h2>6. Security of Information</h2>
                        <p>
                            We use appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
                        </p>

                        <h2>7. Contact Us</h2>
                        <p>
                            If you have questions or comments about this policy, email us at {CONTACT_EMAIL}.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
