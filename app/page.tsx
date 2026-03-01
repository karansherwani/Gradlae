'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles/landing.module.css';

/* ─── SVG Icons ─── */
const GradCapIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
  </svg>
);

export default function LandingPage() {
  const router = useRouter();
  const [showUniSelect, setShowUniSelect] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [uniSearch, setUniSearch] = useState('');

  const universities = [
    { id: 'uofa', name: 'University of Arizona', domain: 'arizona.edu' },
    { id: 'asu', name: 'Arizona State University', domain: 'asu.edu' },
    { id: 'nau', name: 'Northern Arizona University', domain: 'nau.edu' },
    { id: 'uofc', name: 'University of Colorado Boulder', domain: 'colorado.edu' },
    { id: 'ucsd', name: 'UC San Diego', domain: 'ucsd.edu' },
    { id: 'stanford', name: 'Stanford University', domain: 'stanford.edu' },
    { id: 'mit', name: 'MIT', domain: 'mit.edu' },
    { id: 'berkeley', name: 'UC Berkeley', domain: 'berkeley.edu' },
  ];

  const filteredUniversities = universities.filter(uni =>
    uni.name.toLowerCase().includes(uniSearch.toLowerCase()) ||
    uni.domain.toLowerCase().includes(uniSearch.toLowerCase())
  );

  const steps = [
    {
      number: '01',
      title: 'Upload Transcript',
      description: 'Upload your academic transcript. Our system analyzes your grades and academic history automatically.'
    },
    {
      number: '02',
      title: 'Get Batch Recommendation',
      description: 'Based on your prerequisite grades, we recommend the optimal batch placement for your success.'
    },
    {
      number: '03',
      title: 'Optional Assessment',
      description: 'If placed in Batch B, take an optional quiz to qualify for the accelerated Batch A track.'
    },
    {
      number: '04',
      title: 'Start Learning',
      description: 'Enroll in your matched batch and begin your coursework at the pace designed for you.'
    }
  ];

  const features = [
    {
      title: 'AI Academic Advisor',
      desc: 'Get personalized graduation plans powered by AI that adapts to your pace',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      title: 'Smart Batch Matching',
      desc: 'Upload your transcript and get instantly placed in Batch A (7 weeks) or Batch B (14 weeks)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      )
    },
    {
      title: 'Readiness Quiz',
      desc: 'Take the optional assessment to upgrade from standard to accelerated placement',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5,12 12,5 19,12" />
        </svg>
      )
    },
    {
      title: 'Grade Calculator',
      desc: 'Plan your semester and calculate final exam scores needed for your target grade',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    }
  ];

  const testimonials = [
    {
      type: 'student',
      name: 'Sarah Martinez',
      role: 'Computer Science, Stanford',
      text: 'PaceMatch placed me in the accelerated track based on my strong calculus background. I completed the course in 7 weeks.',
    },
    {
      type: 'faculty',
      name: 'Dr. Robert Chen',
      role: 'Associate Professor, MIT',
      text: 'The batch matching system has significantly improved student success rates by placing them at the right pace.',
    },
    {
      type: 'student',
      name: 'Marcus Johnson',
      role: 'Engineering, UC Berkeley',
      text: 'I started in Batch B but took the quiz to prove my readiness. Now I am in the fast track and thriving.',
    }
  ];

  const handleUniversitySelect = (uniId: string) => {
    localStorage.setItem('selectedUniversity', uniId);
    router.push('/auth');
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your feedback!');
    setShowFeedback(false);
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
          <a href="#features">Products</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#testimonials">Testimonials</a>
        </nav>
        <button className={styles.headerCta} onClick={() => setShowUniSelect(true)}>
          Get Started
        </button>
      </header>

      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>YOUR PACE<br />YOUR STORY</h1>
          <p className={styles.heroSubtext}>
            Data-driven batch placement based on your prerequisite grades. Get matched to the right course pace for academic success.
          </p>
          <button
            className={styles.ctaButton}
            onClick={() => setShowUniSelect(true)}
          >
            Get Started
          </button>
          <p className={styles.freeText}>Free for students · Trusted by 2,600+ universities</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionLabel}>How It Works</div>
        <h2>Get Matched in <span className={styles.accentText}>Four Steps</span></h2>
        <p className={styles.sectionSubtext}>
          From transcript analysis to batch placement—our streamlined process ensures you are in the right track.
        </p>

        <div className={styles.stepsContainer}>
          {steps.map((step, index) => (
            <div key={index} className={styles.stepItem}>
              <div className={styles.stepNumber}>{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className={styles.featuresSection}>
        <h2>Everything You Need</h2>
        <div className={styles.featuresGrid}>
          {features.map((feature, idx) => (
            <div key={idx} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STATISTICS */}
      <section className={styles.stats}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>700M+</div>
            <div className={styles.statLabel}>Courses Analyzed</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>2,600+</div>
            <div className={styles.statLabel}>Universities</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>140K+</div>
            <div className={styles.statLabel}>Instructors</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>3.2M+</div>
            <div className={styles.statLabel}>Students</div>
          </div>
        </div>
      </section>

      {/* ══ AI ADVISOR — Two-column with glassmorphism preview ══ */}
      <section className={styles.aiAdvisorSection}>
        <div className={styles.aiAdvisorWrapper}>
          <div className={styles.aiAdvisorLabel}>✦ New Feature</div>

          <div className={styles.aiAdvisorInner}>
            {/* Left: Copy */}
            <div className={styles.aiAdvisorCopy}>
              <h2>AI Academic Advisor</h2>
              <p className={styles.aiAdvisorDesc}>
                Our AI analyzes your transcript, learning style, and goals to build a personalized graduation plan. Graduate at your own pace with confidence.
              </p>
              <div className={styles.aiAdvisorFeatures}>
                <div className={styles.aiAdvisorFeature}>
                  <span className={styles.aiCheckmark}>✓</span>
                  Personalized course recommendations
                </div>
                <div className={styles.aiAdvisorFeature}>
                  <span className={styles.aiCheckmark}>✓</span>
                  Smart graduation timeline
                </div>
                <div className={styles.aiAdvisorFeature}>
                  <span className={styles.aiCheckmark}>✓</span>
                  Prerequisite analysis
                </div>
                <div className={styles.aiAdvisorFeature}>
                  <span className={styles.aiCheckmark}>✓</span>
                  Adaptive pace matching
                </div>
              </div>
              <button className={styles.aiCtaButton} onClick={() => setShowUniSelect(true)}>
                Try AI Advisor Free →
              </button>
            </div>

            {/* Right: Glassmorphism graduation plan mockup */}
            <div className={styles.aiAdvisorPreview}>
              <div className={styles.previewHeader}>
                <div className={styles.previewIconWrap}>
                  <GradCapIcon size={18} />
                </div>
                <div>
                  <p className={styles.previewTitle}>My Graduation Plan</p>
                  <p className={styles.previewSubtitle}>Fall 2026 — Recommended</p>
                </div>
              </div>

              {/* Accent pills / tags */}
              <div className={styles.previewTags}>
                <span className={`${styles.previewTag} ${styles.previewTagNavy}`}>⚡ Recommended Pace</span>
                <span className={`${styles.previewTag} ${styles.previewTagRed}`}>🎯 Target GPA: 3.5</span>
                <span className={`${styles.previewTag} ${styles.previewTagGreen}`}>📋 Next 3 Courses</span>
              </div>

              {/* Mock course rows */}
              <div className={styles.previewCourses}>
                <div className={styles.previewCourseRow}>
                  <div className={styles.courseInfo}>
                    <span className={styles.courseName}>Data Structures</span>
                    <span className={styles.courseCode}>CSC 210 · Fall 2026</span>
                  </div>
                  <span className={styles.courseCredits}>3 cr</span>
                </div>
                <div className={styles.previewCourseRow}>
                  <div className={styles.courseInfo}>
                    <span className={styles.courseName}>Discrete Mathematics</span>
                    <span className={styles.courseCode}>MATH 243 · Fall 2026</span>
                  </div>
                  <span className={styles.courseCredits}>3 cr</span>
                </div>
                <div className={styles.previewCourseRow}>
                  <div className={styles.courseInfo}>
                    <span className={styles.courseName}>Technical Writing</span>
                    <span className={styles.courseCode}>ENGL 308 · Fall 2026</span>
                  </div>
                  <span className={styles.courseCredits}>3 cr</span>
                </div>
              </div>

              {/* Stats footer */}
              <div className={styles.previewFooter}>
                <div className={styles.previewStat}>
                  <span className={styles.previewStatValue}>15</span>
                  <span className={styles.previewStatLabel}>Credits</span>
                </div>
                <div className={styles.previewStat}>
                  <span className={styles.previewStatValue}>3.52</span>
                  <span className={styles.previewStatLabel}>Projected GPA</span>
                </div>
                <div className={styles.previewStat}>
                  <span className={styles.previewStatValue}>Spring &apos;28</span>
                  <span className={styles.previewStatLabel}>Grad Date</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className={styles.testimonials}>
        <h2>What People Say</h2>
        <div className={styles.testimonialsGrid}>
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className={styles.testimonialCard}>
              <p className={styles.testimonialText}>&ldquo;{testimonial.text}&rdquo;</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.authorName}>{testimonial.name}</div>
                <div className={styles.authorRole}>{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SUPPORT */}
      <section className={styles.support}>
        <div className={styles.supportGrid}>
          <div className={styles.supportCard}>
            <h3>Help Center</h3>
            <p>Get help with our comprehensive knowledge base.</p>
            <button className={styles.supportBtn} onClick={() => alert('Help center coming soon')}>
              Visit Help Center
            </button>
          </div>
          <div className={styles.supportCard}>
            <h3>Contact Us</h3>
            <p>Have questions? Our team is here to help.</p>
            <a href="mailto:support@pacematch.edu" className={styles.supportBtn}>
              Email Support
            </a>
          </div>
          <div className={styles.supportCard}>
            <h3>Feedback</h3>
            <p>Help us improve with your suggestions.</p>
            <button className={styles.supportBtn} onClick={() => setShowFeedback(true)}>
              Give Feedback
            </button>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCTA}>
        <h2>Ready to Find Your Batch?</h2>
        <p>Join thousands of students in the right course pace.</p>
        <button className={styles.ctaButton} onClick={() => setShowUniSelect(true)}>
          Get Started
        </button>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>PaceMatch</h4>
            <p>Matching students to the right course pace.</p>
          </div>
          <div className={styles.footerSection}>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/placements">My Grades</a>
          </div>
          <div className={styles.footerSection}>
            <h4>Resources</h4>
            <a href="/help">Help Center</a>
            <a href="/feedback">Feedback</a>
            <a href="/privacy">Privacy</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          © 2026 PaceMatch. All rights reserved.
        </div>
      </footer>

      {/* UNIVERSITY MODAL */}
      {showUniSelect && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <button
              className={styles.closeBtn}
              onClick={() => { setShowUniSelect(false); setUniSearch(''); }}
            >
              ×
            </button>

            <div className={styles.modalHeader}>
              <div className={styles.modalLogo}>PM</div>
              <h2>PaceMatch</h2>
              <p className={styles.modalTagline}>Your academic success partner</p>
            </div>

            <h3 className={styles.findUniTitle}>Find Your University</h3>
            <p className={styles.findUniDesc}>Search and select your institution</p>

            <div className={styles.searchWrapper}>
              <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search universities..."
                value={uniSearch}
                onChange={(e) => setUniSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.universityList}>
              {filteredUniversities.map((uni) => (
                <button
                  key={uni.id}
                  className={styles.universityItem}
                  onClick={() => handleUniversitySelect(uni.id)}
                >
                  <div className={styles.uniIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 21h18" />
                      <path d="M9 8h1" />
                      <path d="M14 8h1" />
                      <path d="M9 12h1" />
                      <path d="M14 12h1" />
                      <path d="M9 16h1" />
                      <path d="M14 16h1" />
                      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                    </svg>
                  </div>
                  <div className={styles.uniInfo}>
                    <div className={styles.uniName}>{uni.name}</div>
                    <div className={styles.uniDomain}>{uni.domain}</div>
                  </div>
                </button>
              ))}
              {filteredUniversities.length === 0 && (
                <p className={styles.noResults}>No universities found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {showFeedback && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <button className={styles.closeBtn} onClick={() => setShowFeedback(false)}>×</button>
            <h2>Share Your Feedback</h2>
            <p>We value your input.</p>
            <form onSubmit={handleFeedbackSubmit} className={styles.feedbackForm}>
              <input type="email" placeholder="Your email" required className={styles.feedbackInput} />
              <textarea placeholder="Your feedback..." required rows={5} className={styles.feedbackTextarea}></textarea>
              <button type="submit" className={styles.submitBtn}>Submit</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}