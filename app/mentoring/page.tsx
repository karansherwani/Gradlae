'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/mentoring.module.css';

interface Review {
    id: number;
    user: string;
    text: string;
    rating: number;
    date: string;
}

interface TimeSlot {
    id: number;
    day: string;
    date: string;
    time: string;
}

interface Mentor {
    id: number;
    staffId?: string;
    name: string;
    avatar: string;
    avatarColor: 'blue' | 'red';
    rating: number;
    reviewCount: number;
    major: string;
    bio: string;
    courses: string[];
    slotsAvailable: number;
    supportsInPerson: boolean;
    supportsOnline: boolean;
    price: number;
    reviews: Review[];
    timeSlots: TimeSlot[];
}

async function readJsonResponse(response: Response) {
    const text = await response.text();
    const trimmed = text.trim();

    if (!trimmed) {
        if (response.ok) return {};
        throw new Error(`Payment request failed with status ${response.status}`);
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        const shortText = trimmed
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 180);

        throw new Error(shortText || `Payment request failed with status ${response.status}`);
    }
}

// Fallback mentors (shown when no dynamic mentors are available)
const DEFAULT_MENTORS: Mentor[] = [
    {
        id: 1,
        name: "Karan Kumar",
        avatar: "KK",
        avatarColor: 'blue',
        rating: 4.9,
        reviewCount: 134,
        major: "Senior @ UofA, Management Information Systems",
        bio: "Straight A's across all my business courses. I break down case studies and financial concepts into simple, real-world examples. Let's get you that A!",
        courses: ["BNAD 302", "MGMT 300", "MIS 331"],
        slotsAvailable: 4,
        supportsInPerson: true,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Priya M.", text: "Karan made operations management actually make sense. His case study walkthroughs are incredible.", rating: 5, date: "May 8, 2026" },
            { id: 2, user: "Tyler R.", text: "Best tutor I've had for BNAD 302. Super organized and always prepared.", rating: 4.9, date: "Apr 22, 2026" },
            { id: 3, user: "Emma S.", text: "He explains MIS concepts so clearly. Went from a C to an A- in one semester.", rating: 5, date: "Mar 15, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Monday", date: "Jun 2", time: "10:00 AM" },
            { id: 2, day: "Monday", date: "Jun 2", time: "2:00 PM" },
            { id: 3, day: "Wednesday", date: "Jun 4", time: "11:00 AM" },
            { id: 4, day: "Friday", date: "Jun 6", time: "9:00 AM" }
        ]
    },
    {
        id: 2,
        name: "Renato Garcia",
        avatar: "RG",
        avatarColor: 'blue',
        rating: 4.8,
        reviewCount: 97,
        major: "Junior @ UofA, Computer Science",
        bio: "Passionate about clean code and solid fundamentals. I've aced every CS course listed and love helping students debug and think algorithmically.",
        courses: ["CSC 210", "CSC 252", "CSC 337"],
        slotsAvailable: 3,
        supportsInPerson: false,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Jason L.", text: "Renato helped me understand recursion and dynamic programming. Couldn't have passed CSC 252 without him.", rating: 5, date: "May 12, 2026" },
            { id: 2, user: "Alicia K.", text: "Super patient with debugging sessions. He doesn't just fix your code—he teaches you why it broke.", rating: 4.8, date: "Apr 30, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Tuesday", date: "Jun 3", time: "9:00 AM" },
            { id: 2, day: "Tuesday", date: "Jun 3", time: "4:00 PM" },
            { id: 3, day: "Thursday", date: "Jun 5", time: "1:00 PM" }
        ]
    },
    {
        id: 3,
        name: "Alex Coose",
        avatar: "AC",
        avatarColor: 'blue',
        rating: 5.0,
        reviewCount: 62,
        major: "Senior @ UofA, Statistics & Data Science",
        bio: "Double major in Stats and Data Science with a 3.95 GPA. I make probability and regression feel intuitive. Tons of practice problems ready to go.",
        courses: ["DATA 363", "MATH 466", "DATA 375"],
        slotsAvailable: 3,
        supportsInPerson: true,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Nina P.", text: "Alex is hands-down the best stats tutor at UofA. He made hypothesis testing click for me in one session.", rating: 5, date: "May 5, 2026" },
            { id: 2, user: "David W.", text: "Really thorough with DATA 363 material. Brought his own practice exams which were super helpful.", rating: 5, date: "Apr 18, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Monday", date: "Jun 2", time: "3:00 PM" },
            { id: 2, day: "Wednesday", date: "Jun 4", time: "10:00 AM" },
            { id: 3, day: "Friday", date: "Jun 6", time: "1:00 PM" }
        ]
    },
    {
        id: 4,
        name: "Jack Thomas",
        avatar: "JT",
        avatarColor: 'blue',
        rating: 4.7,
        reviewCount: 108,
        major: "Junior @ UofA, Mathematics",
        bio: "Math is my thing—calculus, linear algebra, you name it. I've tutored 50+ students and have a knack for making tricky proofs feel manageable.",
        courses: ["MATH 125", "MATH 129", "MATH 313"],
        slotsAvailable: 5,
        supportsInPerson: true,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Sophie T.", text: "Jack saved my grade in MATH 129. He walks through every step so patiently.", rating: 5, date: "May 10, 2026" },
            { id: 2, user: "Marcus J.", text: "Really solid at linear algebra. Explains eigenvalues better than my professor honestly.", rating: 4.7, date: "Apr 25, 2026" },
            { id: 3, user: "Rachel B.", text: "Great energy and always has extra practice problems. Highly recommend for calc.", rating: 4.8, date: "Mar 28, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Monday", date: "Jun 2", time: "8:00 AM" },
            { id: 2, day: "Tuesday", date: "Jun 3", time: "11:00 AM" },
            { id: 3, day: "Wednesday", date: "Jun 4", time: "3:00 PM" },
            { id: 4, day: "Thursday", date: "Jun 5", time: "10:00 AM" },
            { id: 5, day: "Friday", date: "Jun 6", time: "2:00 PM" }
        ]
    },
    {
        id: 5,
        name: "Ava Rease",
        avatar: "AR",
        avatarColor: 'red',
        rating: 4.9,
        reviewCount: 81,
        major: "Senior @ UofA, Psychology",
        bio: "Graduating with honors in Psych. I've TA'd for intro and abnormal psych and know exactly what professors look for. I'll help you crush your essays and exams.",
        courses: ["PSY 101", "PSY 220", "PSY 345"],
        slotsAvailable: 3,
        supportsInPerson: true,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Mia C.", text: "Ava is so knowledgeable about research methods. She helped me redesign my entire study for PSY 345.", rating: 5, date: "May 14, 2026" },
            { id: 2, user: "Ethan G.", text: "Made abnormal psych concepts way easier to remember with her mnemonic tricks.", rating: 4.9, date: "Apr 20, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Tuesday", date: "Jun 3", time: "10:00 AM" },
            { id: 2, day: "Thursday", date: "Jun 5", time: "3:00 PM" },
            { id: 3, day: "Friday", date: "Jun 6", time: "11:00 AM" }
        ]
    },
    {
        id: 6,
        name: "Karly Philips",
        avatar: "KP",
        avatarColor: 'red',
        rating: 4.8,
        reviewCount: 73,
        major: "Senior @ UofA, Accounting",
        bio: "4.0 in all my accounting courses and passed the CPA ethics exam already. I specialize in financial and managerial accounting—let's make debits and credits second nature.",
        courses: ["ACCT 200", "ACCT 210", "ACCT 310"],
        slotsAvailable: 4,
        supportsInPerson: true,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Brandon H.", text: "Karly breaks down journal entries so well. I went from failing to a B+ in ACCT 200.", rating: 5, date: "May 6, 2026" },
            { id: 2, user: "Jessica N.", text: "She's incredibly organized and always has real-world examples for managerial accounting concepts.", rating: 4.8, date: "Apr 15, 2026" },
            { id: 3, user: "Omar F.", text: "Super helpful for exam prep. She knows exactly what topics to focus on.", rating: 4.9, date: "Mar 22, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Monday", date: "Jun 2", time: "12:00 PM" },
            { id: 2, day: "Wednesday", date: "Jun 4", time: "9:00 AM" },
            { id: 3, day: "Wednesday", date: "Jun 4", time: "2:00 PM" },
            { id: 4, day: "Friday", date: "Jun 6", time: "10:00 AM" }
        ]
    },
    {
        id: 7,
        name: "Sofia Mendez",
        avatar: "SM",
        avatarColor: 'red',
        rating: 4.9,
        reviewCount: 66,
        major: "Junior @ UofA, Marketing",
        bio: "Dean's List every semester with a focus on digital marketing and consumer behavior. I bring real campaign examples into our sessions so you actually remember the material.",
        courses: ["MKTG 361", "MKTG 371", "BNAD 302"],
        slotsAvailable: 3,
        supportsInPerson: false,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Liam D.", text: "Sofia's marketing frameworks are so clear. She helped me build an amazing final project for MKTG 361.", rating: 5, date: "May 11, 2026" },
            { id: 2, user: "Chloe A.", text: "Explains consumer behavior theories with real brand examples. Makes it so much easier to study.", rating: 4.9, date: "Apr 28, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Tuesday", date: "Jun 3", time: "1:00 PM" },
            { id: 2, day: "Thursday", date: "Jun 5", time: "11:00 AM" },
            { id: 3, day: "Friday", date: "Jun 6", time: "4:00 PM" }
        ]
    },
    {
        id: 8,
        name: "Marcus Chen",
        avatar: "MC",
        avatarColor: 'blue',
        rating: 4.8,
        reviewCount: 55,
        major: "Senior @ UofA, Public Health",
        bio: "Pre-med track with a public health major and a 3.9 GPA. I've interned at the Pima County Health Dept and love connecting textbook concepts to real public health challenges.",
        courses: ["CPH 200", "CPH 310", "EPID 309"],
        slotsAvailable: 3,
        supportsInPerson: true,
        supportsOnline: true,
        price: 25,
        reviews: [
            { id: 1, user: "Jasmine R.", text: "Marcus made epidemiology so much less intimidating. His study guides are top-notch.", rating: 5, date: "May 9, 2026" },
            { id: 2, user: "Derek M.", text: "Really passionate about public health and it shows in how he teaches. Great tutor.", rating: 4.8, date: "Apr 12, 2026" }
        ],
        timeSlots: [
            { id: 1, day: "Monday", date: "Jun 2", time: "11:00 AM" },
            { id: 2, day: "Wednesday", date: "Jun 4", time: "4:00 PM" },
            { id: 3, day: "Thursday", date: "Jun 5", time: "9:00 AM" }
        ]
    }
];

export default function MentoringPage() {
    const router = useRouter();
    const { user, accessToken } = useAuth();
    const [mentors, setMentors] = useState<Mentor[]>([]);
    const [isLoadingMentors, setIsLoadingMentors] = useState(true);
    const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [bookedSlot, setBookedSlot] = useState<TimeSlot | null>(null);
    const [meetingType, setMeetingType] = useState<'In-Person' | 'Online'>('Online');
    const [sessionType, setSessionType] = useState<'individual' | 'group' | 'pass'>('individual');
    const [groupEmails, setGroupEmails] = useState<string[]>(['', '', '']);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Fetch mentors from API on mount
    useEffect(() => {
        const fetchMentors = async () => {
            try {
                const response = await fetch('/api/mentors');
                if (response.ok) {
                    const dynamicMentors = await response.json();
                    // Combine dynamic mentors with default mentors
                    // Dynamic mentors (from staff profiles) come first
                    setMentors([...dynamicMentors, ...DEFAULT_MENTORS]);
                } else {
                    // Fallback to default mentors on error
                    setMentors(DEFAULT_MENTORS);
                }
            } catch (error) {
                console.error('Error fetching mentors:', error);
                setMentors(DEFAULT_MENTORS);
            } finally {
                setIsLoadingMentors(false);
            }
        };
        fetchMentors();
    }, []);

    // Check for Stripe redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
            setPaymentSuccess(true);
            setShowSuccessModal(true);
        }
        if (params.get('canceled') === 'true') {
            alert('Payment was canceled. Please try again.');
        }
        // Clean up URL
        if (params.get('success') || params.get('canceled')) {
            window.history.replaceState({}, '', '/mentoring');
        }
    }, []);

    // Session pricing
    const PRICING = {
        individual: { label: 'Individual Session', price: 20, description: 'One-on-one' },
        group: { label: 'Group Session', price: 60, description: 'Up to 3 students' },
        pass: { label: '5-Session Pass', price: 100, description: '5 sessions (Save $0!)' },
    };

    const filteredMentors = mentors.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.courses.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleSelectMentor = (mentor: Mentor) => {
        setSelectedMentor(mentor);
        // Default to Online if supported, else In-Person
        setMeetingType(mentor.supportsOnline ? 'Online' : 'In-Person');
    };

    const handleBookSlot = async (slot: TimeSlot) => {
        if (!selectedMentor) return;
        if (!accessToken) {
            alert('Please sign in again before booking a session.');
            router.push('/auth');
            return;
        }

        setIsProcessingPayment(true);
        try {
            const userEmail = user?.email || '';

            const response = await fetch('/api/payments/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                    sessionType,
                    mentorName: selectedMentor.name,
                    timeSlot: `${slot.day}, ${slot.date} at ${slot.time}`,
                    userEmail,
                }),
            });

            const data = await readJsonResponse(response);

            if (!response.ok) {
                throw new Error(data.error || `Payment request failed with status ${response.status}`);
            }

            if (data.url) {
                // Redirect to Stripe Checkout
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert(error instanceof Error ? error.message : 'Failed to process payment. Please try again.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        setBookedSlot(null);
        setSelectedMentor(null);
    };

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
                    <a href="/clubs">Campus Opportunities</a>
                </nav>
                <Link href="/dashboard" className={styles.headerCta}>
                    ← Back
                </Link>
            </header>

            {/* HERO SECTION */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>Book a Mentoring Session</h1>
                    <p className={styles.heroSubtext}>
                        Connect with UofA students who excelled in your courses. Fixed rate: $25 per session.
                    </p>
                </div>
            </section>

            <main className={styles.main}>
                {isLoadingMentors ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div className="spinner" style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid rgba(12, 35, 75, 0.2)',
                            borderTopColor: 'var(--uofa-blue)',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 16px'
                        }} />
                        <p style={{ color: '#6B7280' }}>Loading mentors...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : !selectedMentor ? (
                    <>
                        <div className={styles.searchWrapper}>
                            <div className={styles.searchInputContainer}>
                                <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by course code or mentor name..."
                                    className={styles.searchInput}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.mentorsGrid}>
                            {filteredMentors.map(mentor => (
                                <div key={mentor.id} className={styles.mentorCard} onClick={() => handleSelectMentor(mentor)}>
                                    <div className={styles.mentorCardHeader}>
                                        <div className={`${styles.mentorAvatar} ${mentor.avatarColor === 'red' ? styles.mentorAvatarAlt : ''}`}>
                                            {mentor.avatar}
                                        </div>
                                        <div className={styles.mentorInfo}>
                                            <h3 className={styles.mentorName}>{mentor.name}</h3>
                                            <div className={styles.rating}>
                                                <span>Rating {mentor.rating}</span>
                                                <span className={styles.reviews}>({mentor.reviewCount})</span>
                                            </div>
                                        </div>
                                        <div className={styles.price}>
                                            <span className={styles.priceAmount}>${mentor.price}</span>
                                            <span className={styles.pricePeriod}>/session</span>
                                        </div>
                                    </div>
                                    <p className={styles.bio}>{mentor.major}. {mentor.bio}</p>
                                    <div className={styles.coursesList}>
                                        {mentor.courses.map(course => (
                                            <span key={course} className={styles.courseTag}>{course}</span>
                                        ))}
                                    </div>
                                    <div className={styles.cardFooter}>
                                        <div className={styles.footerItem}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            {mentor.slotsAvailable} slots left
                                        </div>
                                        <div className={styles.footerItem}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                            </svg>
                                            {mentor.supportsInPerson && mentor.supportsOnline ? "In-Person / Online" : mentor.supportsOnline ? "Online Only" : "In-Person Only"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.bookingDetail}>
                        <div className={styles.backLink} onClick={() => setSelectedMentor(null)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Back to Mentors
                        </div>

                        <div className={styles.detailCard}>
                            <div style={{ display: 'flex', gap: '24px' }}>
                                <div className={`${styles.mentorAvatar} ${selectedMentor.avatarColor === 'red' ? styles.mentorAvatarAlt : ''}`} style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                                    {selectedMentor.avatar}
                                </div>
                                <div className={styles.mentorInfo}>
                                    <h3 className={styles.mentorName} style={{ fontSize: '1.75rem' }}>{selectedMentor.name}</h3>
                                    <div className={styles.rating} style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                                        <span>Rating {selectedMentor.rating}</span>
                                        <span className={styles.reviews}>({selectedMentor.reviewCount} reviews)</span>
                                    </div>
                                    <p className={styles.bio} style={{ fontSize: '1rem', color: '#111827' }}>{selectedMentor.major}</p>
                                    <div className={styles.coursesList} style={{ border: 'none', padding: 0 }}>
                                        {selectedMentor.courses.map(course => (
                                            <span key={course} className={styles.courseTag}>{course}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.price} style={{ textAlign: 'right' }}>
                                <span className={styles.priceAmount} style={{ fontSize: '2.5rem' }}>${selectedMentor.price}</span>
                                <span className={styles.pricePeriod} style={{ fontSize: '1rem' }}>per session</span>
                                <div style={{ marginTop: '8px' }}>
                                    <span style={{
                                        background: 'rgba(12, 35, 75, 0.1)',
                                        color: 'var(--uofa-blue)',
                                        padding: '4px 12px',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: '700'
                                    }}>Grade: A</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.bookingSection}>
                            <h2 className={styles.sectionTitle}>
                                <svg className={styles.calendarIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                Available Time Slots
                            </h2>

                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--uofa-blue)' }}>Select Meeting Type:</p>
                                <div className={styles.meetingTypeToggle}>
                                    {selectedMentor.supportsOnline && (
                                        <button
                                            className={`${styles.typeBtn} ${meetingType === 'Online' ? styles.typeBtnActive : ''}`}
                                            onClick={() => setMeetingType('Online')}
                                        >
                                            Online (Zoom)
                                        </button>
                                    )}
                                    {selectedMentor.supportsInPerson && (
                                        <button
                                            className={`${styles.typeBtn} ${meetingType === 'In-Person' ? styles.typeBtnActive : ''}`}
                                            onClick={() => setMeetingType('In-Person')}
                                        >
                                            In-Person (Campus)
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <p style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--uofa-blue)' }}>Select Session Type:</p>
                                <div className={styles.meetingTypeToggle} style={{ flexWrap: 'wrap', gap: '8px' }}>
                                    <button
                                        className={`${styles.typeBtn} ${sessionType === 'individual' ? styles.typeBtnActive : ''}`}
                                        onClick={() => setSessionType('individual')}
                                        style={{ flex: '1 1 150px' }}
                                    >
                                        <div style={{ fontWeight: '600' }}>Individual</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: sessionType === 'individual' ? 'white' : 'var(--uofa-blue)' }}>$25</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>One-on-one</div>
                                    </button>
                                    <button
                                        className={`${styles.typeBtn} ${sessionType === 'group' ? styles.typeBtnActive : ''}`}
                                        onClick={() => setSessionType('group')}
                                        style={{ flex: '1 1 150px' }}
                                    >
                                        <div style={{ fontWeight: '600' }}>Group Session</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: sessionType === 'group' ? 'white' : 'var(--uofa-blue)' }}>$60</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Up to 3 students</div>
                                    </button>
                                    <button
                                        className={`${styles.typeBtn} ${sessionType === 'pass' ? styles.typeBtnActive : ''}`}
                                        onClick={() => setSessionType('pass')}
                                        style={{ flex: '1 1 150px' }}
                                    >
                                        <div style={{ fontWeight: '600' }}>5-Session Pass</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: sessionType === 'pass' ? 'white' : 'var(--uofa-blue)' }}>$100</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Save $0!</div>
                                    </button>
                                </div>
                            </div>

                            <div className={styles.slotsGrid}>
                                {selectedMentor.timeSlots.map(slot => (
                                    <div key={slot.id} className={styles.slotCard} onClick={() => handleBookSlot(slot)}>
                                        <div>
                                            <div className={styles.slotDay} style={{ color: 'var(--uofa-blue)' }}>{slot.day}</div>
                                            <div className={styles.slotDate}>{slot.date}</div>
                                        </div>
                                        <div className={styles.slotTime} style={{ color: 'var(--uofa-red)' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            {slot.time}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className={styles.reviewsSection}>
                                <h2 className={styles.sectionTitle} style={{ fontSize: '1.25rem' }}>
                                    Student Reviews
                                </h2>
                                {selectedMentor.reviews.map(review => (
                                    <div key={review.id} className={styles.reviewCard}>
                                        <div className={styles.reviewHeader}>
                                            <span className={styles.reviewerName}>{review.user}</span>
                                            <div className={styles.reviewStars}>
                                                <span>{review.rating}/5</span>
                                            </div>
                                        </div>
                                        <p className={styles.reviewText}>{review.text}</p>
                                        <div className={styles.reviewDate}>{review.date}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {showSuccessModal && bookedSlot && selectedMentor && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.successIcon} style={{ background: 'rgba(12, 35, 75, 0.1)', color: 'var(--uofa-blue)' }}>OK</div>
                        <h2>Session Booked!</h2>
                        <p style={{ color: '#111827' }}>
                            You have successfully booked an <strong>{meetingType}</strong> session with <strong>{selectedMentor.name}</strong> on
                            <strong> {bookedSlot.day}, {bookedSlot.date}</strong> at <strong>{bookedSlot.time}</strong>.
                        </p>
                        <div className={styles.bursarBadge} style={{ background: 'rgba(171, 5, 32, 0.1)', color: 'var(--uofa-red)' }}>
                            $25.00 charged to Bursar Account
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#374151' }}>
                            A confirmation email with the {meetingType === 'Online' ? 'Zoom link' : 'meeting location'} has been sent to your university email.
                        </p>
                        <button className={styles.doneBtn} style={{ background: 'var(--uofa-blue)' }} onClick={handleCloseModal}>
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
