'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/profile.module.css';

interface UserProfile {
    fullName: string;
    dateOfBirth: string;
    studentId: string;
    address: string;
    profilePicture: string;
    major: string;
    degreePlanId: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const { user, dbUser, accessToken, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile>({
        fullName: '',
        dateOfBirth: '',
        studentId: '',
        address: '',
        profilePicture: '',
        major: 'Computer Science and Engineering',
        degreePlanId: 'bs-cse-2025-26',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/auth');
            return;
        }
        loadProfile();
    }, [authLoading, user, accessToken]);

    const loadProfile = async () => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/user/profile', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setProfile({
                    fullName: data.fullName || dbUser?.name || '',
                    dateOfBirth: data.dateOfBirth || '',
                    studentId: data.studentId || '',
                    address: data.address || '',
                    profilePicture: data.profilePicture || '',
                    major: data.major || 'Computer Science and Engineering',
                    degreePlanId: data.degreePlanId || 'bs-cse-2025-26',
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            if (!accessToken) {
                throw new Error('Not authenticated');
            }

            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update profile');
            }
        } catch (error) {
            setMessage({ type: 'error', text: (error as Error).message });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* HEADER */}
            <header className={styles.topHeader}>
                <div className={styles.headerLogo} onClick={() => router.push('/dashboard')} style={{ cursor: 'pointer' }}>
                    <img src="/gradlae-logo.png" alt="Gradlae" className="brandLogo" />
                </div>
                <nav className={styles.headerNav}>
                    <a href="/dashboard">Dashboard</a>
                    <a href="/placements">My Courses</a>
                    <a href="/progress">Calculate Grades</a>
                </nav>
                <Link href="/dashboard" className={styles.headerCta}>
                    Back
                </Link>
            </header>

            {/* HERO SECTION */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>Your Profile</h1>
                    <p className={styles.heroSubtext}>
                        Manage your personal information to match with your academic records.
                    </p>
                </div>
            </section>

            <main className={styles.main}>
                <div className={styles.profileCard}>
                    <div className={styles.avatarSection}>
                        <div
                            className={styles.avatar}
                            onClick={() => fileInputRef.current?.click()}
                            style={{ cursor: 'pointer', position: 'relative' }}
                        >
                            {profile.profilePicture ? (
                                <img
                                    src={profile.profilePicture}
                                    alt="Profile"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                />
                            ) : (
                                profile.fullName
                                    ? profile.fullName.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2)
                                    : 'PR'
                            )}
                            <div className={styles.avatarOverlay}>Edit</div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setProfile({ ...profile, profilePicture: reader.result as string });
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        <p className={styles.avatarHint}>Click to upload profile picture</p>
                    </div>

                    <form onSubmit={handleSave} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label htmlFor="fullName">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                value={profile.fullName}
                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                placeholder="Enter your full name"
                                required
                            />
                            <p className={styles.fieldHint}>As it appears on your transcript</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="dateOfBirth">Date of Birth</label>
                            <input
                                type="date"
                                id="dateOfBirth"
                                value={profile.dateOfBirth}
                                onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                            />
                            <p className={styles.fieldHint}>Used for verification purposes</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="studentId">Student ID</label>
                            <input
                                type="text"
                                id="studentId"
                                value={profile.studentId}
                                onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                                placeholder="e.g., 12345678"
                            />
                            <p className={styles.fieldHint}>Your university student ID number</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="major">Major</label>
                            <input
                                type="text"
                                id="major"
                                value={profile.major}
                                onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                                placeholder="e.g., Computer Science and Engineering"
                            />
                            <p className={styles.fieldHint}>Used to select your degree plan template</p>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="degreePlanId">Degree Plan</label>
                            <select
                                id="degreePlanId"
                                value={profile.degreePlanId}
                                onChange={(e) => setProfile({ ...profile, degreePlanId: e.target.value })}
                            >
                                <option value="bs-cse-2025-26">B.S. Computer Science and Engineering (2025-26)</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="address">Address</label>
                            <textarea
                                id="address"
                                value={profile.address}
                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                placeholder="Enter your address"
                                rows={3}
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                            <p className={styles.fieldHint}>Your current mailing address</p>
                        </div>

                        {message && (
                            <div className={`${styles.message} ${message.type === 'success' ? styles.success : styles.error}`}>
                                {message.type === 'success' ? 'Success:' : 'Notice:'} {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.saveBtn}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>

                <div className={styles.infoCard}>
                    <h3>Privacy Note</h3>
                    <p>
                        Your profile information is securely stored and only used to match your
                        identity with uploaded transcripts. We never share your personal data with
                        third parties.
                    </p>
                </div>
            </main>
        </div>
    );
}
