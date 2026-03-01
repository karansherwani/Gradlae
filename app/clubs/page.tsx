'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import styles from '../styles/clubs.module.css';

interface Club {
    category_scraped_from: string;
    name: string;
    type: string;
    subcategories: string;
    url: string;
    image_url: string;
    mission: string;
    membership_benefits: string;
    membership_type: string;
    contact_info: string;
    website: string;
    registration_status: string;
}

interface Event {
    id: string;
    name: string;
    url: string;
    date: string;
    time: string;
    timezone: string;
    location: string;
    attendees: number;
    organization: string;
    category: string;
    categoryType: string;
    tags: string[];
    allTags: string[];
    badge: string;
    image: string;
    isFree: boolean;
    additionalInfo: string;
}

export default function ClubsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
    const [activeTab, setActiveTab] = useState<'clubs' | 'events'>('clubs');
    const [clubs, setClubs] = useState<Club[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [clubCategories, setClubCategories] = useState<string[]>(['All']);
    const [eventCategories, setEventCategories] = useState<string[]>(['All']);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/auth');
            return;
        }

        // Load clubs from public folder
        fetch('/data/uofa_clubs.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load clubs data');
                }
                return response.json();
            })
            .then((data: Club[]) => {
                setClubs(data);

                // Extract unique categories from subcategories
                const uniqueCategories = new Set<string>();
                data.forEach(club => {
                    if (club.subcategories) {
                        club.subcategories.split(',').forEach(cat => {
                            const trimmed = cat.trim();
                            if (trimmed) uniqueCategories.add(trimmed);
                        });
                    }
                });

                setClubCategories(['All', ...Array.from(uniqueCategories).sort()]);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error loading clubs:', error);
                setLoading(false);
            });

        // Load events from the scraped data
        fetch('/data/UOFA_Clubs_events.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load events data');
                }
                return response.json();
            })
            .then((data: Event[]) => {
                setEvents(data);

                // Extract unique event categories
                const uniqueEventCategories = new Set<string>();
                data.forEach(event => {
                    if (event.category) {
                        uniqueEventCategories.add(event.category);
                    }
                });

                setEventCategories(['All', ...Array.from(uniqueEventCategories).sort()]);
                setEventsLoading(false);
            })
            .catch(error => {
                console.error('Error loading events:', error);
                setEventsLoading(false);
            });
    }, [authLoading, user, router]);

    const toggleCategory = (category: string) => {
        if (category === 'All') {
            setSelectedCategories(['All']);
        } else {
            const newCategories = selectedCategories.includes(category)
                ? selectedCategories.filter(i => i !== category)
                : [...selectedCategories.filter(i => i !== 'All'), category];
            setSelectedCategories(newCategories.length === 0 ? ['All'] : newCategories);
        }
    };

    // Helper function to parse event date string into Date object
    const parseEventDate = (dateStr: string): Date | null => {
        try {
            // Handle multi-day events like "Fri, Jan 30, 2026 6:00 PM –"
            // Strip trailing time portions and dashes
            let cleaned = dateStr.replace(/\d{1,2}:\d{2}\s*(AM|PM)?\s*[–\-]?\s*$/i, '').trim();

            // Expected format after cleanup: "Tue, Jan 27, 2026"
            // Remove the day of week part
            const datePart = cleaned.split(',').slice(1).join(',').trim(); // "Jan 27, 2026"
            const date = new Date(datePart);
            if (!isNaN(date.getTime())) {
                return date;
            }
        } catch (e) {
            console.error('Error parsing date:', dateStr, e);
        }
        return null;
    };

    // Helper function to calculate relative date badge
    const getDateBadge = (dateStr: string): string => {
        const eventDate = parseEventDate(dateStr);
        if (!eventDate) return '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const eventDateOnly = new Date(eventDate);
        eventDateOnly.setHours(0, 0, 0, 0);

        const diffTime = eventDateOnly.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'TODAY';
        if (diffDays === 1) return 'TOMORROW';
        if (diffDays > 1 && diffDays <= 7) return `IN ${diffDays} DAYS`;

        return '';
    };

    const filteredClubs = clubs.filter(club => {
        const subcats = club.subcategories?.split(',').map(s => s.trim().toLowerCase()) || [];
        const categoryMatch = selectedCategories.includes('All') || selectedCategories.some(c => subcats.includes(c.toLowerCase()));

        const searchMatch = searchQuery === '' ||
            club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            club.mission?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            club.type?.toLowerCase().includes(searchQuery.toLowerCase());

        return categoryMatch && searchMatch;
    });

    const filteredEvents = events.filter(event => {
        // Parse event date and filter out past events
        const eventDate = parseEventDate(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Skip events with unparseable dates (likely old/non-standard entries)
        if (!eventDate) {
            return false;
        }

        // Only show future events (today and onwards)
        const eventDateOnly = new Date(eventDate);
        eventDateOnly.setHours(0, 0, 0, 0);
        if (eventDateOnly < today) {
            return false;
        }

        const categoryMatch = selectedCategories.includes('All') ||
            selectedCategories.includes(event.category) ||
            event.allTags?.some(tag => selectedCategories.includes(tag));

        const searchMatch = searchQuery === '' ||
            event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.location?.toLowerCase().includes(searchQuery.toLowerCase());

        return categoryMatch && searchMatch;
    });

    // Sort events by date (earliest first)
    const sortedEvents = [...filteredEvents].sort((a, b) => {
        const dateA = parseEventDate(a.date);
        const dateB = parseEventDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    });

    // Get the appropriate categories based on active tab
    const currentCategories = activeTab === 'clubs' ? clubCategories : eventCategories;

    // Helper function to format date for display
    const formatEventDate = (dateStr: string) => {
        try {
            const eventDate = parseEventDate(dateStr);
            if (eventDate) {
                const day = eventDate.getDate();
                const month = eventDate.toLocaleDateString('en-US', { month: 'short' });
                return { day: day.toString(), month };
            }
        } catch (e) {
            console.error('Error formatting date:', dateStr);
        }
        return { day: '--', month: '---' };
    };

    return (
        <div className={styles.container}>
            {/* HEADER */}
            <header className={styles.topHeader}>
                <div className={styles.headerLogo}>
                    <div className={styles.logoMark}>PM</div>
                    <span className={styles.logoText}>PaceMatch</span>
                </div>
                <nav className={styles.headerNav}>
                    <a href="/dashboard">Dashboard</a>
                    <a href="/placements">My Courses</a>
                    <a href="/progress">Calculate Grades</a>
                </nav>
                <button className={styles.headerCta} onClick={() => router.push('/dashboard')}>
                    ← Back
                </button>
            </header>

            {/* HERO SECTION */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>University of Arizona Clubs &amp; Events</h1>
                    <p className={styles.heroSubtext}>
                        Discover {clubs.length} student organizations and {sortedEvents.length} upcoming events that match your interests.
                    </p>
                </div>
            </section>

            <main className={styles.main}>
                {/* Search Bar */}
                <div className={styles.searchSection}>
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'clubs' ? styles.activeTab : ''}`}
                        onClick={() => {
                            setActiveTab('clubs');
                            setSelectedCategories(['All']);
                            setSearchQuery('');
                        }}
                    >
                        Clubs ({filteredClubs.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'events' ? styles.activeTab : ''}`}
                        onClick={() => {
                            setActiveTab('events');
                            setSelectedCategories(['All']);
                            setSearchQuery('');
                        }}
                    >
                        Upcoming Events ({sortedEvents.length})
                    </button>
                </div>

                {/* Category Filter */}
                <section className={styles.filterSection}>
                    <h2>Filter by Category</h2>
                    <div className={styles.interestTags}>
                        {currentCategories.map(category => (
                            <button
                                key={category}
                                className={`${styles.interestTag} ${selectedCategories.includes(category) ? styles.selected : ''}`}
                                onClick={() => toggleCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Loading State */}
                {loading && activeTab === 'clubs' && (
                    <div className={styles.loadingState}>
                        <p>Loading clubs...</p>
                    </div>
                )}

                {eventsLoading && activeTab === 'events' && (
                    <div className={styles.loadingState}>
                        <p>Loading events...</p>
                    </div>
                )}

                {/* Clubs List */}
                {activeTab === 'clubs' && !loading && (
                    <section className={styles.listSection}>
                        {filteredClubs.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>No clubs found matching your criteria.</p>
                            </div>
                        ) : (
                            <div className={styles.clubsGrid}>
                                {filteredClubs.map(club => (
                                    <div key={club.url} className={styles.clubCard}>
                                        {club.image_url && (
                                            <div className={styles.clubImage}>
                                                <img src={club.image_url} alt={`${club.name} logo`} loading="lazy" />
                                            </div>
                                        )}
                                        <div className={styles.clubHeader}>
                                            <span className={styles.categoryBadge}>{club.type || 'Student Organization'}</span>
                                        </div>
                                        <h3>{club.name}</h3>
                                        {club.subcategories && (
                                            <p className={styles.subcategories}>
                                                {club.subcategories}
                                            </p>
                                        )}
                                        <p className={styles.description}>
                                            {club.mission || 'Explore this organization to learn more about their activities and mission.'}
                                        </p>
                                        <div className={styles.clubMeta}>
                                            <span>📋 {club.membership_type || 'Lifetime membership'}</span>
                                        </div>
                                        <div className={styles.clubActions}>
                                            {club.url && (
                                                <a
                                                    href={club.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.joinBtn}
                                                >
                                                    View Details
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* Events List */}
                {activeTab === 'events' && !eventsLoading && (
                    <section className={styles.listSection}>
                        {sortedEvents.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>No upcoming events found matching your criteria.</p>
                            </div>
                        ) : (
                            <div className={styles.eventsGrid}>
                                {sortedEvents.map(event => {
                                    const { day, month } = formatEventDate(event.date);
                                    const badge = getDateBadge(event.date);
                                    return (
                                        <div key={event.id} className={styles.eventCard}>
                                            <div className={styles.eventDate}>
                                                <span className={styles.eventDay}>{day}</span>
                                                <span className={styles.eventMonth}>{month}</span>
                                                {badge && (
                                                    <span className={styles.eventBadge}>{badge}</span>
                                                )}
                                            </div>
                                            <div className={styles.eventInfo}>

                                                <h3>{event.name}</h3>
                                                <p className={styles.organization}>By {event.organization}</p>
                                                <div className={styles.eventMeta}>
                                                    <span>🕐 {event.time}</span>
                                                    <span>📍 {event.location || 'Location TBA'}</span>
                                                    {event.attendees > 0 && (
                                                        <span>👥 {event.attendees} going</span>
                                                    )}
                                                </div>
                                                {event.tags && event.tags.length > 0 && (
                                                    <div className={styles.eventTags}>
                                                        {event.tags.slice(0, 3).map((tag, idx) => (
                                                            <span key={idx} className={styles.tag}>{tag}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <a
                                                href={event.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.rsvpBtn}
                                            >
                                                View Event
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
