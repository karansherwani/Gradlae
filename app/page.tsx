'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles/landing.module.css';

export default function LandingPage() {
  const router = useRouter();
  const [showFeedback, setShowFeedback] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'progress' | 'care' | 'explore'>('progress');

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

  const whyCards = [
    { tag: 'Students', title: 'Know your pace before the course starts', desc: 'Upload your transcript, see the track that fits, and understand exactly why PaceMatch made the recommendation.' },
    { tag: 'Advisors', title: 'Spend less time sorting and more time guiding', desc: 'Surface readiness signals, prerequisite gaps, and next-best steps before advising appointments.' },
    { tag: 'Admins', title: 'Create course sections around real demand', desc: 'Use placement trends to balance Batch A, B, and supported sections with confidence.' },
  ];

  const featureTabs = [
    { id: 'progress', label: 'Progress' },
    { id: 'care', label: 'Care' },
    { id: 'explore', label: 'Explore' },
  ] as const;

  const featureSets = {
    progress: [
      { title: 'Transcript Intelligence', desc: 'Turn prerequisite grades into clear readiness scores and placement decisions.' },
      { title: 'Batch Matching', desc: 'Recommend accelerated, standard, or supported pacing with plain-language reasoning.' },
      { title: 'Grade Planning', desc: 'Calculate what students need on future work to stay on target.' },
      { title: 'Course Timeline', desc: 'Preview the next courses and milestones for each academic path.' },
      { title: 'Readiness Quiz', desc: 'Let motivated students show they are ready for the faster track.' },
      { title: 'Progress Signals', desc: 'Show where momentum is strong and where a student may need support.' },
    ],
    care: [
      { title: 'Mentor Booking', desc: 'Route students to tutors and mentors who fit their courses and needs.' },
      { title: 'Advisor Notes', desc: 'Keep academic context close to every recommendation and follow-up.' },
      { title: 'Journal Check-ins', desc: 'Help students reflect on workload, stress, and weekly goals.' },
      { title: 'Supportive Tracks', desc: 'Pair pacing decisions with extra help instead of simple pass/fail labels.' },
      { title: 'Faculty Reviews', desc: 'Give staff a focused view of student feedback and appointment history.' },
      { title: 'Risk Awareness', desc: 'Spot readiness gaps early enough to intervene constructively.' },
    ],
    explore: [
      { title: 'Clubs & Events', desc: 'Connect coursework with campus communities and study groups.' },
      { title: 'AI Academic Advisor', desc: 'Generate semester plans shaped by goals, prerequisites, and pace.' },
      { title: 'Course Search', desc: 'Find classes with requirement context and prerequisite visibility.' },
      { title: 'Degree Planning', desc: 'Map graduation timing with a practical, student-friendly interface.' },
      { title: 'Campus Fit', desc: 'Recommend resources that match interests beyond the classroom.' },
      { title: 'Next Best Action', desc: 'Guide each student toward the clearest next step.' },
    ],
  };

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
    },
    {
      type: 'faculty',
      name: 'Dr. Elena Ford',
      role: 'Academic Advisor, University of Arizona',
      text: 'The interface makes readiness conversations easier because students can see the reasoning, not just the result.',
    }
  ];

  const handleGetStarted = () => {
    localStorage.removeItem('selectedUniversity');
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
          <a href="#features">Product</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#testimonials">Testimonials</a>
        </nav>
        <div className={styles.headerActions}>
          <button className={styles.headerGhost} onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>Adaptive academic placement</div>
          <h1>Your pace, <em>matched</em> to your story.</h1>
          <p className={styles.heroSubtext}>
            Data-driven batch placement based on your prerequisite grades. Get matched to the right course pace for academic success.
          </p>
          <div className={styles.heroActions}>
            <button
              className={styles.ctaButton}
              onClick={handleGetStarted}
            >
              Get Started
            </button>
            <a className={styles.secondaryHeroLink} href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className={styles.heroProof}>
            <span>Free for students</span>
            <span>2,600+ universities</span>
            <span>Placement in minutes</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="PaceMatch product preview">
          <div className={styles.browserMockup}>
            <div className={styles.browserChrome}>
              <span></span><span></span><span></span>
            </div>
            <div className={styles.mockupBody}>
              <aside className={styles.mockSidebar}>
                <strong>PaceMatch</strong>
                <span>Dashboard</span>
                <span>Transcript</span>
                <span>Advisor</span>
                <span>Support</span>
              </aside>
              <div className={styles.mockMain}>
                <div className={styles.mockHeader}>
                  <span>Placement Review</span>
                  <strong>Batch A Ready</strong>
                </div>
                <div className={styles.mockKpis}>
                  <div><span>Readiness</span><strong>92%</strong></div>
                  <div><span>Credits</span><strong>15</strong></div>
                  <div><span>Timeline</span><strong>7 wks</strong></div>
                </div>
                <div className={styles.mockPanel}>
                  <div className={styles.mockPanelTop}>
                    <span>Prerequisite strength</span>
                    <strong>Excellent</strong>
                  </div>
                  <div className={styles.progressTrack}><span style={{ width: '92%' }} /></div>
                  <div className={styles.progressTrack}><span style={{ width: '84%' }} /></div>
                  <div className={styles.progressTrack}><span style={{ width: '76%' }} /></div>
                </div>
                <div className={styles.mockCourses}>
                  <span>Calculus I <strong>A</strong></span>
                  <span>Programming I <strong>A-</strong></span>
                  <span>Discrete Math <strong>B+</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <section className={styles.trustedStrip}>
        <span>Trusted by teams inspired by</span>
        <div>
          <strong>University of Arizona</strong>
          <strong>Stanford</strong>
          <strong>MIT</strong>
          <strong>UC Berkeley</strong>
          <strong>ASU</strong>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.sectionLabel}>Why PaceMatch</div>
        <h2>Academic planning that feels clear from the first click.</h2>
        <p className={styles.sectionSubtext}>
          Stellic-inspired structure, adapted for UofA: calm surfaces, sharp academic context, and guidance that meets each user where they are.
        </p>
        <div className={styles.whyGrid}>
          {whyCards.map((card) => (
            <div className={styles.whyCard} key={card.title}>
              <span>{card.tag}</span>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionLabel}>Features</div>
        <h2>One platform for progress, care, and discovery.</h2>
        <div className={styles.tabSwitcher}>
          {featureTabs.map((tab) => (
            <button
              key={tab.id}
              className={activeFeatureTab === tab.id ? styles.activeTab : ''}
              onClick={() => setActiveFeatureTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.featuresGrid}>
          {featureSets[activeFeatureTab].map((feature, idx) => (
            <div key={`${activeFeatureTab}-${idx}`} className={styles.featureCard}>
              <div className={styles.featureIcon}>{idx + 1}</div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionLabel}>How It Works</div>
        <h2>Get matched in <em>four steps</em>.</h2>
        <p className={styles.sectionSubtext}>
          From transcript analysis to batch placement, the process stays transparent and student-friendly.
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

      {/* TESTIMONIALS */}
      <section id="testimonials" className={styles.testimonials}>
        <div className={styles.sectionLabel}>Testimonials</div>
        <h2>Trusted by students and academic teams.</h2>
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

      <section className={styles.pressSection}>
        <div className={styles.sectionLabel}>Press & News</div>
        <h2>Built for the conversations happening across campus.</h2>
        <div className={styles.pressGrid}>
          <article>
            <span>Campus Technology</span>
            <blockquote>Adaptive planning tools are moving from optional dashboards to daily advising infrastructure.</blockquote>
          </article>
          <article>
            <span>Student Success Journal</span>
            <blockquote>Transparent recommendations help students understand the route, not just the requirement.</blockquote>
          </article>
          <article>
            <span>Academic Operations</span>
            <blockquote>Course pacing is easier to manage when readiness data is visible before enrollment pressure peaks.</blockquote>
          </article>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={styles.finalCTA}>
        <h2>Ready to Find Your Batch?</h2>
        <p>Join thousands of students in the right course pace.</p>
        <button className={styles.ctaButton} onClick={handleGetStarted}>
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
