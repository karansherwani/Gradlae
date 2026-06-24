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

interface ResearchOpportunity {
    id: string;
    name: string;
    profile_url: string;
    department: string;
    department_url: string;
    offering_opportunity: string;
    opportunity_types: string[];
    prerequisites: string;
    research_location: string;
    end_date: string;
    title?: string;
    email?: string;
    description?: string;
    start_date?: string;
    college?: string;
    majors_considered?: string;
    research_locations?: string[];
}

interface ResearchOpportunitiesPayload {
    source: string;
    scraped_at: string;
    count: number;
    opportunities: ResearchOpportunity[];
}

const CATEGORY_PREVIEW_COUNT = 12;

export default function ClubsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
    const [activeTab, setActiveTab] = useState<'clubs' | 'events' | 'research'>('clubs');
    const [clubs, setClubs] = useState<Club[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [researchOpportunities, setResearchOpportunities] = useState<ResearchOpportunity[]>([]);
    const [clubCategories, setClubCategories] = useState<string[]>(['All']);
    const [eventCategories, setEventCategories] = useState<string[]>(['All']);
    const [researchCategories, setResearchCategories] = useState<string[]>(['All']);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoriesExpanded, setCategoriesExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [researchLoading, setResearchLoading] = useState(true);

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

        // Load research opportunities from the scraped data
        fetch('/data/uofa_research_opportunities.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load research opportunities data');
                }
                return response.json();
            })
            .then((data: ResearchOpportunitiesPayload) => {
                const opportunities = data.opportunities || [];
                setResearchOpportunities(opportunities);

                const uniqueResearchCategories = new Set<string>();
                opportunities.forEach(opportunity => {
                    opportunity.opportunity_types?.forEach(type => {
                        if (type) uniqueResearchCategories.add(type);
                    });
                    if (opportunity.research_location) {
                        opportunity.research_location.split(',').forEach(location => {
                            const trimmed = location.trim();
                            if (trimmed) uniqueResearchCategories.add(trimmed);
                        });
                    }
                    if (opportunity.department) {
                        uniqueResearchCategories.add(opportunity.department);
                    }
                });

                setResearchCategories(['All', ...Array.from(uniqueResearchCategories).sort()]);
                setResearchLoading(false);
            })
            .catch(error => {
                console.error('Error loading research opportunities:', error);
                setResearchLoading(false);
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
            const cleaned = dateStr.replace(/\d{1,2}:\d{2}\s*(AM|PM)?\s*[–\-]?\s*$/i, '').trim();

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

    const filteredResearchOpportunities = researchOpportunities.filter(opportunity => {
        const locationTags = opportunity.research_location?.split(',').map(location => location.trim()) || [];
        const researchTags = [
            opportunity.department,
            ...locationTags,
            ...(opportunity.opportunity_types || []),
        ].filter(Boolean);
        const categoryMatch = selectedCategories.includes('All') ||
            selectedCategories.some(category => researchTags.includes(category));

        const searchableValues = [
            opportunity.name,
            opportunity.title,
            opportunity.department,
            opportunity.college,
            opportunity.research_location,
            opportunity.prerequisites,
            opportunity.majors_considered,
            opportunity.description,
            ...(opportunity.opportunity_types || []),
        ].filter(Boolean).join(' ').toLowerCase();

        const searchMatch = searchQuery === '' ||
            searchableValues.includes(searchQuery.toLowerCase());

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
    const currentCategories = activeTab === 'clubs'
        ? clubCategories
        : activeTab === 'events'
            ? eventCategories
            : researchCategories;
    const hasMoreCategories = currentCategories.length > CATEGORY_PREVIEW_COUNT;
    const visibleCategories = categoriesExpanded
        ? currentCategories
        : currentCategories.filter((category, index) => index < CATEGORY_PREVIEW_COUNT || selectedCategories.includes(category));

    // Helper function to format date for display
    const formatEventDate = (dateStr: string) => {
        try {
            const eventDate = parseEventDate(dateStr);
            if (eventDate) {
                const day = eventDate.getDate();
                const month = eventDate.toLocaleDateString('en-US', { month: 'short' });
                return { day: day.toString(), month };
            }
        } catch {
            console.error('Error formatting date:', dateStr);
        }
        return { day: '--', month: '---' };
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
                    <a href="/progress">Calculate Grades</a>
                </nav>
                <button className={styles.headerCta} onClick={() => router.push('/dashboard')}>
                    ← Back
                </button>
            </header>

            {/* HERO SECTION */}
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1>University of Arizona Campus Opportunities</h1>
                    <p className={styles.heroSubtext}>
                        Discover {clubs.length} student organizations, {sortedEvents.length} upcoming events, and {researchOpportunities.length} research positions that match your interests.
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
                            setCategoriesExpanded(false);
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
                            setCategoriesExpanded(false);
                        }}
                    >
                        Upcoming Events ({sortedEvents.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'research' ? styles.activeTab : ''}`}
                        onClick={() => {
                            setActiveTab('research');
                            setSelectedCategories(['All']);
                            setSearchQuery('');
                            setCategoriesExpanded(false);
                        }}
                    >
                        Research ({filteredResearchOpportunities.length})
                    </button>
                </div>

                {/* Category Filter */}
                <section className={styles.filterSection}>
                    <h2>Filter by Category</h2>
                    <div className={styles.interestTags}>
                        {visibleCategories.map(category => (
                            <button
                                key={category}
                                className={`${styles.interestTag} ${selectedCategories.includes(category) ? styles.selected : ''}`}
                                onClick={() => toggleCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                    {hasMoreCategories && (
                        <div className={styles.filterActions}>
                            <button
                                type="button"
                                className={styles.readMoreBtn}
                                onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                            >
                                {categoriesExpanded ? 'Show less' : `Read more (${currentCategories.length - CATEGORY_PREVIEW_COUNT} more)`}
                            </button>
                        </div>
                    )}
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

                {researchLoading && activeTab === 'research' && (
                    <div className={styles.loadingState}>
                        <p>Loading research positions...</p>
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
                                            <span>Membership: {club.membership_type || 'Lifetime membership'}</span>
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
                                                    <span>Time: {event.time}</span>
                                                    <span>Location: {event.location || 'Location TBA'}</span>
                                                    {event.attendees > 0 && (
                                                        <span>{event.attendees} attending</span>
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

                {/* Research List */}
                {activeTab === 'research' && !researchLoading && (
                    <section className={styles.listSection}>
                        {filteredResearchOpportunities.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>No research positions found matching your criteria.</p>
                            </div>
                        ) : (
                            <div className={styles.researchGrid}>
                                {filteredResearchOpportunities.map(opportunity => (
                                    <div key={opportunity.id} className={styles.researchCard}>
                                        <div className={styles.clubHeader}>
                                            <span className={styles.categoryBadge}>Research Position</span>
                                        </div>
                                        <h3>{opportunity.name}</h3>
                                        {opportunity.title && (
                                            <p className={styles.organization}>{opportunity.title}</p>
                                        )}
                                        <p className={styles.subcategories}>
                                            {opportunity.department || 'University of Arizona'}
                                        </p>
                                        {opportunity.description && opportunity.description !== 'No description given' && (
                                            <p className={styles.description}>{opportunity.description}</p>
                                        )}
                                        <div className={styles.researchMeta}>
                                            {(opportunity.opportunity_types?.length || 0) > 0 && (
                                                <span>Type: {opportunity.opportunity_types.join(', ')}</span>
                                            )}
                                            {opportunity.research_location && (
                                                <span>Location: {opportunity.research_location}</span>
                                            )}
                                            {opportunity.prerequisites && (
                                                <span>Prereqs: {opportunity.prerequisites}</span>
                                            )}
                                            {opportunity.end_date && (
                                                <span>End Date: {opportunity.end_date}</span>
                                            )}
                                        </div>
                                        {(opportunity.opportunity_types?.length || 0) > 0 && (
                                            <div className={styles.eventTags}>
                                                {opportunity.opportunity_types.map((type, idx) => (
                                                    <span key={idx} className={styles.tag}>{type}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className={styles.clubActions}>
                                            {opportunity.profile_url && (
                                                <a
                                                    href={opportunity.profile_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.joinBtn}
                                                >
                                                    View Research Position
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
