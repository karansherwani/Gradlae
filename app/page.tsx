'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './components/AuthProvider';
import styles from './styles/landing.module.css';

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFeatureTab, setActiveFeatureTab] = useState<'progress' | 'care' | 'explore'>('progress');

  const steps = [
    {
      number: '01',
      title: 'Connect the student record',
      description: 'Students upload a transcript or connect verified academic data so Gradlae can understand completed courses, credits, and progress.',
    },
    {
      number: '02',
      title: 'Map the degree path',
      description: 'Gradlae compares the student record against real university requirements, prerequisites, and course availability.',
    },
    {
      number: '03',
      title: 'Create the next action plan',
      description: 'Students see what to take next, what is missing, where they are at risk, and which decisions need advisor review.',
    },
    {
      number: '04',
      title: 'Match campus opportunities',
      description: 'Gradlae recommends tutoring, research, clubs, events, and support resources that fit the student path and goals.',
    },
  ];

  const whyCards = [
    {
      tag: 'Students',
      title: 'One place to know what to do next',
      desc: 'Course planning, credit tracking, graduation requirements, advising answers, and campus opportunities come together in one academic dashboard.',
    },
    {
      tag: 'Advisors',
      title: 'Better context before every meeting',
      desc: 'Gradlae surfaces transcript history, requirement gaps, common questions, and advisor-review moments before appointments happen.',
    },
    {
      tag: 'Universities',
      title: 'Student success that becomes measurable',
      desc: 'Track advising demand, planning friction, resource discovery, and academic risk without forcing students through another disconnected portal.',
    },
  ];

  const featureTabs = [
    { id: 'progress', label: 'Progress' },
    { id: 'care', label: 'Care' },
    { id: 'explore', label: 'Explore' },
  ] as const;

  const featureSets = {
    progress: [
      { title: 'Transcript Intelligence', desc: 'Turn completed courses, grades, credits, and transfer history into a clear academic picture.' },
      { title: 'Degree Requirement Tracking', desc: 'Show what is complete, what is missing, and what can block graduation.' },
      { title: 'Course Planning', desc: 'Recommend practical semester paths using prerequisites, availability, and student goals.' },
      { title: 'Credit Progress', desc: 'Help students understand credit totals, requirement categories, and graduation timelines.' },
      { title: 'Risk Signals', desc: 'Flag prerequisite gaps, overloaded terms, and courses that need human advisor review.' },
      { title: 'What-If Planning', desc: 'Let students explore switching majors, adding minors, summer courses, or faster graduation routes.' },
    ],
    care: [
      { title: 'AI Academic Guidance', desc: 'Answer student questions with university-specific policy and course context.' },
      { title: 'Advisor Escalation', desc: 'Route uncertain, high-stakes, or sensitive decisions to a human advisor.' },
      { title: 'Tutoring Match', desc: 'Connect students to tutoring and peer support tied to the exact courses they are taking.' },
      { title: 'Mentor Booking', desc: 'Route students to mentors who match their program, interests, and goals.' },
      { title: 'Support Check-ins', desc: 'Capture workload, confidence, and planning stress before students disappear.' },
      { title: 'Staff Dashboard', desc: 'Give academic teams a focused view of patterns, bottlenecks, and follow-up needs.' },
    ],
    explore: [
      { title: 'Campus Opportunities', desc: 'Recommend clubs, events, and research positions connected to interests, major, and goals.' },
      { title: 'Research Discovery', desc: 'Surface labs, faculty work, and research opportunities that fit the academic path.' },
      { title: 'Career-Relevant Experiences', desc: 'Connect coursework to resume-building activities and campus programs.' },
      { title: 'Resource Matching', desc: 'Point students to financial, academic, wellness, and community resources at the right time.' },
      { title: 'Campus Fit', desc: 'Help students find belonging beyond classes without searching across scattered websites.' },
      { title: 'Next Best Action', desc: 'Turn the university ecosystem into a personal weekly action plan.' },
    ],
  };

  const pilotSignals = [
    {
      title: 'Advisor load',
      metric: 'Target: -25%',
      text: 'Measure repetitive degree-planning and requirement questions deflected during registration periods.',
    },
    {
      title: 'Planning clarity',
      metric: 'Target: 80%',
      text: 'Track how many beta students can identify their next courses, missing credits, and graduation blockers.',
    },
    {
      title: 'Resource discovery',
      metric: 'Target: 3x',
      text: 'Measure whether students discover more relevant tutoring, clubs, research, and campus resources.',
    },
    {
      title: 'Pilot scope',
      metric: '90 days',
      text: 'Start with one department, one set of requirements, real student feedback, and advisor review.',
    },
  ];

  const handleGetStarted = () => {
    localStorage.removeItem('selectedUniversity');
    router.push('/auth');
  };

  const handleLogoClick = () => {
    router.push(user ? '/dashboard' : '/');
  };

  const scrollToSection = (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const start = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY - 82;
    const distance = targetY - start;
    const duration = 420;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start + distance * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className={styles.container}>
      <header className={styles.topHeader}>
        <button className={styles.headerLogo} onClick={handleLogoClick} type="button">
          <img src="/gradlae-logo.png" alt="Gradlae" className="brandLogo" />
        </button>
        <nav className={styles.headerNav}>
          <button type="button" onClick={() => scrollToSection('features')}>Product</button>
          <button type="button" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
          <button type="button" onClick={() => scrollToSection('pilot')}>Pilot</button>
        </nav>
        <div className={styles.headerActions}>
          <button className={styles.headerGhost} onClick={handleGetStarted}>
            Open Demo
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>AI academic ecosystem for universities</div>
          <h1>Every student gets a clear academic path.</h1>
          <p className={styles.heroSubtext}>
            Gradlae turns transcripts, degree requirements, course data, advising knowledge, and campus opportunities into one personalized action plan for university students.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.ctaButton} onClick={handleGetStarted}>
              View Student Demo
            </button>
            <button className={styles.secondaryHeroLink} onClick={() => scrollToSection('how-it-works')} type="button">
              See Pilot Model
            </button>
          </div>
          <div className={styles.heroProof}>
            <span>Transcript-aware planning</span>
            <span>Advisor review built in</span>
            <span>Campus resources matched to goals</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Gradlae product preview">
          <div className={styles.browserMockup}>
            <div className={styles.browserChrome}>
              <span></span><span></span><span></span>
            </div>
            <div className={styles.mockupBody}>
              <aside className={styles.mockSidebar}>
                <strong>Gradlae</strong>
                <span>Plan</span>
                <span>Credits</span>
                <span>Advisor</span>
                <span>Opportunities</span>
              </aside>
              <div className={styles.mockMain}>
                <div className={styles.mockHeader}>
                  <span>Academic Path</span>
                  <strong>Advisor Verified</strong>
                </div>
                <div className={styles.mockKpis}>
                  <div><span>Credits earned</span><strong>72</strong></div>
                  <div><span>Requirements left</span><strong>8</strong></div>
                  <div><span>Grad target</span><strong>2027</strong></div>
                </div>
                <div className={styles.mockPanel}>
                  <div className={styles.mockPanelTop}>
                    <span>Next semester plan</span>
                    <strong>12 credits</strong>
                  </div>
                  <div className={styles.progressTrack}><span style={{ width: '92%' }} /></div>
                  <div className={styles.progressTrack}><span style={{ width: '84%' }} /></div>
                  <div className={styles.progressTrack}><span style={{ width: '76%' }} /></div>
                </div>
                <div className={styles.mockCourses}>
                  <span>FIN 311 <strong>Major</strong></span>
                  <span>MIS 304 <strong>Prereq met</strong></span>
                  <span>Research Lab <strong>Match</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.stats}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>17k+</div>
            <div className={styles.statLabel}>Course records processed</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>1</div>
            <div className={styles.statLabel}>University dataset focus</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>90</div>
            <div className={styles.statLabel}>Day pilot design</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>4</div>
            <div className={styles.statLabel}>Student-success workflows</div>
          </div>
        </div>
      </section>

      <section className={styles.trustedStrip}>
        <span>Built around real academic workflows</span>
        <div>
          <strong>Transcript planning</strong>
          <strong>Degree requirements</strong>
          <strong>AI advising</strong>
          <strong>Campus opportunities</strong>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.sectionLabel}>Why Gradlae</div>
        <h2>An action layer for the student journey.</h2>
        <p className={styles.sectionSubtext}>
          Gradlae starts with academic planning, then expands into the resources and opportunities students need to build a stronger college life.
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

      <section id="how-it-works" className={styles.howItWorks}>
        <div className={styles.sectionLabel}>How It Works</div>
        <h2>From transcript to <em>next best action</em>.</h2>
        <p className={styles.sectionSubtext}>
          The first pilot stays narrow enough to measure, while the product shows the larger academic ecosystem vision.
        </p>
        <div className={styles.stepsContainer}>
          {steps.map((step) => (
            <div key={step.number} className={styles.stepItem}>
              <div className={styles.stepNumber}>{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pilot" className={styles.testimonials}>
        <div className={styles.sectionLabel}>Pilot Metrics</div>
        <h2>The first version should prove operational value.</h2>
        <div className={styles.testimonialsGrid}>
          {pilotSignals.map((signal) => (
            <div key={signal.title} className={styles.testimonialCard}>
              <div className={styles.signalMetric}>{signal.metric}</div>
              <p className={styles.testimonialText}>{signal.text}</p>
              <div className={styles.testimonialAuthor}>
                <div className={styles.authorName}>{signal.title}</div>
                <div className={styles.authorRole}>Measured during beta</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pressSection}>
        <div className={styles.sectionLabel}>Demo Story</div>
        <h2>What a university buyer should see in the demo.</h2>
        <div className={styles.pressGrid}>
          <article>
            <span>Student View</span>
            <blockquote>A student sees credits, requirements, course options, advisor warnings, and personalized campus opportunities in one dashboard.</blockquote>
          </article>
          <article>
            <span>Advisor View</span>
            <blockquote>An advisor sees the student&apos;s plan, unresolved questions, risk flags, and the source data behind each recommendation.</blockquote>
          </article>
          <article>
            <span>University View</span>
            <blockquote>Student questions become patterns: missing requirements, confusing policies, bottleneck courses, and resources students cannot find.</blockquote>
          </article>
        </div>
      </section>

      <section className={styles.finalCTA}>
        <h2>Start with one department. Prove the layer.</h2>
        <p>Gradlae is designed for a focused university pilot before expanding across the full student journey.</p>
        <button className={styles.ctaButton} onClick={handleGetStarted}>
          Open Demo
        </button>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>Gradlae</h4>
            <p>AI academic ecosystem for university students.</p>
          </div>
          <div className={styles.footerSection}>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/advisor">Advisor</a>
          </div>
          <div className={styles.footerSection}>
            <h4>Resources</h4>
            <a href="/help">Help Center</a>
            <a href="/feedback">Feedback</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          © 2026 Gradlae. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
