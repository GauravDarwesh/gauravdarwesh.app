import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { GitHubCalendar } from "react-github-calendar";
import NavigationToggle from "@/components/NavigationToggle";

const CATEGORIES = ["Languages", "Skills", "Platforms", "Certifications", "Extracurriculars"] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_DATA: Record<Category, string[]> = {
  Languages: ["English", "Marathi", "Hindi", "Japanese"],

  Skills: [
    "GenAI, Agents, AI Workflows",
    "Python, SQL",
    "Data Analytics & Visualization",
    "Product Management",
    "Business Strategy",
    "Strategic Planning",
    "Project Management",
    "Business Analysis",
    "Customer Success Operations",
    "AI Development Solutions",
    "Workflow Automation",
    "Technical Leadership",
  ],

  Platforms: [
    "Salesforce",
    "ServiceNOW",
    "JIRA",
    "Confluence",
    "Planhat",
    "Power BI",
    "Tableau",
    "Power Automate",
    "n8n",
    "Qualtrics",
    "Workday",
  ],

  Certifications: [
    "Model Context Protocol – Anthropic",
    "Forward Program – McKinsey and Company",
    "Power User Certification – Planhat",
    "Six Sigma White Belt – AIGPE",
    "Sustainable Software Engineering – Hasso Plattner Institute",
    "Project Management – Saylor Academy",
  ],

  Extracurriculars: [
    "Photography Lead – NASDAQ Mumbai",
    "President – Computer Society of India (2024 – 2025)",
    "Technical Lead – AIMSA (2024 – 2025)",
    "Media Head – AIMSA (2023 – 2024)",
  ],
};

// Auto-rotation dwell time per category (ms)
const DURATIONS: Record<Category, number> = {
  Languages: 7000,
  Skills: 9000,
  Platforms: 8000,
  Certifications: 11000,
  Extracurriculars: 11000,
};

// Uniform squircle chip
const chipClass =
  "rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/90 hover:bg-white/20 transition-colors duration-300 ease-out px-4 py-2 text-sm";

const SpotlightContent = ({ category, animKey }: { category: Category; animKey: number }) => {
  const items = CATEGORY_DATA[category];

  const stagger = (i: number) => ({
    animationDelay: `${i * 90}ms`,
  });

  return (
    <div key={animKey} className="flex flex-wrap gap-2.5 sm:gap-3">
      {items.map((item, i) => (
        <div key={item} style={stagger(i)} className={`spotlight-item ${chipClass}`}>
          {item}
        </div>
      ))}
    </div>
  );
};

const CategorySpotlight = () => {
  const [active, setActive] = useState<Category>("Languages");
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const advance = useCallback(() => {
    setActive((prev) => {
      const idx = CATEGORIES.indexOf(prev);
      return CATEGORIES[(idx + 1) % CATEGORIES.length];
    });

    setProgressKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current) return;

    const t = setTimeout(advance, DURATIONS[active]);

    return () => clearTimeout(t);
  }, [active, paused, advance, progressKey]);

  const select = (cat: Category) => {
    setActive(cat);

    // Restart this category's timer
    setProgressKey((k) => k + 1);
  };

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Animated category navigation */}
      <h2 className="text-xl sm:text-2xl font-semibold mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-2">
        {CATEGORIES.map((cat, i) => (
          <span key={cat} className="flex items-baseline gap-x-2">
            <button
              type="button"
              onClick={() => select(cat)}
              className={`relative pb-1 transition-all duration-500 focus:outline-none ${
                active === cat
                  ? "text-white [text-shadow:0_0_18px_rgba(255,255,255,0.55)]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {cat}

              {active === cat && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-white/30 overflow-hidden">
                  <span
                    key={progressKey}
                    className="spotlight-progress block h-full bg-white"
                    style={{
                      animationDuration: `${DURATIONS[cat]}ms`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                </span>
              )}
            </button>

            {i < CATEGORIES.length - 1 && <span className="text-white/30 select-none">/</span>}
          </span>
        ))}
      </h2>

      {/* Content */}
      <div className="pt-2 max-w-4xl">
        <SpotlightContent category={active} animKey={progressKey} />
      </div>
    </section>
  );
};

/* ======================================================================== */
/* GitHub Activity                                                          */
/* ======================================================================== */

const GitHubActivity = () => {
  return (
    <section className="pt-2">
      {/* Keep the heading in the original classic content position */}
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-semibold">GitHub Activity</h2>

        <p className="text-sm text-white/45 mt-1">A year of building, experimenting, and shipping.</p>
      </div>

      {/* Contribution calendar gets its own full-width visual area */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
          <div className="github-calendar-surface relative overflow-hidden rounded-3xl border border-white/[0.16] bg-white/[0.10] backdrop-blur-[5px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-44 w-[42rem] -translate-x-1/2 rounded-full bg-white/[0.055] blur-3xl"
            />

            <div className="relative w-full min-w-0 px-4 py-6 sm:px-7 sm:py-7 lg:px-10 lg:py-8">
              <div className="github-calendar-viewport w-full min-w-0 overflow-x-auto">
                <GitHubCalendar
                  username="GauravDarwesh"
                  year="last"
                  colorScheme="dark"
                  blockSize={12}
                  blockMargin={3}
                  blockRadius={2}
                  fontSize={12}
                  showWeekdayLabels
                  showMonthLabels
                  showColorLegend
                  showTotalCount
                  theme={{
                    dark: [
                      "rgba(255,255,255,0.060)",
                      "rgba(255,184,77,0.24)",
                      "rgba(255,161,54,0.44)",
                      "rgba(255,137,38,0.68)",
                      "rgba(255,255,255,0.92)",
                    ],
                  }}
                />
              </div>
            </div>
          </div>

          <a
            href="https://github.com/GauravDarwesh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-4 text-sm text-white/45 hover:text-white transition-colors duration-300"
          >
            github.com/GauravDarwesh →
          </a>
        </div>
      </div>
    </section>
  );
};

const Portfolio = () => {
  return (
    <div className="site-page min-h-screen w-full flex flex-col items-center relative overflow-hidden">
      <Helmet>
        <title>Experience &amp; Skills — Gaurav Darwesh</title>

        <meta
          name="description"
          content="Gaurav Darwesh's classic resume view: experience, skills, platforms, certifications and extracurriculars."
        />

        <link rel="canonical" href="https://gauravdarwesh.app/hobbies" />

        <meta property="og:title" content="Experience &amp; Skills — Gaurav Darwesh" />

        <meta property="og:description" content="Experience, skills, platforms and certifications of Gaurav Darwesh." />

        <meta property="og:url" content="https://gauravdarwesh.app/hobbies" />
      </Helmet>

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Main Content */}
      <div className="relative z-10 max-w-3xl w-full px-4 sm:px-6 md:px-8 text-left space-y-10 overflow-y-scroll no-scrollbar pt-20 sm:pt-24 pb-20 sm:pb-24">
        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}

        <div className="relative w-full mb-8 overflow-hidden">
          <h1 className="sr-only">Gaurav Darwesh — Experience &amp; Skills</h1>

          {/* Seamless marquee */}
          <div className="overflow-hidden marquee-fade-edges">
            <div className="animate-marquee flex items-center">
              {/* Group A */}
              <div className="flex items-center shrink-0">
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>

                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>

                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>

                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>
              </div>

              {/* Group B */}
              <div className="flex items-center shrink-0" aria-hidden="true">
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>

                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>

                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>

                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">
                  Gaurav Darwesh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Social Links                                                     */}
        {/* ================================================================ */}

        <div>
          <div className="flex flex-wrap gap-4 text-white mt-2">
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=gauravdarwesh155@gmail.com">mail/</a>

            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank" rel="noopener noreferrer">
              in/
            </a>

            <a href="https://twitter.com/gaurav11darwesh" target="_blank" rel="noopener noreferrer">
              twitter/
            </a>

            <a href="https://instagram.com/allaboutgaurav" target="_blank" rel="noopener noreferrer">
              instagram/
            </a>
          </div>
        </div>

        {/* ================================================================ */}
        {/* About                                                            */}
        {/* ================================================================ */}

        <p className="text-base sm:text-lg leading-relaxed mt-4">
          Results-oriented professional with a strong foundation in regulatory tech and customer success operations.
          Skilled in transforming complex requirements into scalable solutions and streamlining end-to-end processes
          through Applied AI and workflow automation. Experienced in equipping teams with AI-powered insights and tools
          to drive engagement, retention, and growth. Recognized for cross-functional collaboration and a holistic,
          data-driven approach to solving business challenges.
        </p>

        {/* ================================================================ */}
        {/* Education                                                        */}
        {/* ================================================================ */}

        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Education</h2>

          {/* University of Mumbai */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">University of Mumbai</h3>
            </div>

            <p className="text-sm">
              B.E. Computer Science & Engineering (Artificial Intelligence and Machine Learning) — 8.6 CGPA
            </p>

            <p className="text-sm text-white/60 mt-1">Dec 2021 – June 2025</p>
          </div>

          {/* University of Cambridge */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">University of Cambridge</h3>
            </div>

            <p className="text-sm">Undergraduate Certificate in Strategic Business and Management</p>

            <p className="text-sm text-white/60 mt-1">Oct 2023 – July 2024</p>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Experience                                                       */}
        {/* ================================================================ */}

        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Experience</h2>

          {/* ============================================================ */}
          {/* NASDAQ — Product Manager Analyst                              */}
          {/* ============================================================ */}

          <div className="mb-8">
            <h3 className="font-semibold">NASDAQ, Mumbai, India</h3>

            <p className="italic mb-3">Product Manager Analyst · July 2025 – Present</p>

            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>
                Monitor and analyze regulatory updates across EMEA, NAM, and LATAM regions, interpreting complex
                regulations into actionable product and business requirements for AxiomSL&apos;s reporting solutions.
              </li>

              <li>
                Manage end-to-end regulatory change processes, including creating JIRA tickets, coordinating
                cross-functional teams like BA, sales and pre-sales teams with client-specific needs, ensuring data
                accuracy and integrity in internal systems, and contributing to product enhancements.
              </li>

              <li>
                Built Power BI dashboards using Power Query translating raw data (Jira, SNOW) into leadership insights.
              </li>

              <li>
                Designed a comprehensive Regulatory Monitoring communication pipeline (AxiomSL Regulatory Newsletter -
                Global, Email, Teams Channel) via Power Automate and internal AI platform. The system captures marked
                Jira tickets, utilizes AI to structure the data, and enforces human-in-the-loop approvals before
                broadcasting to internal teams and clients. This seamless workflow reduced manual reporting time from 3
                days to 30 minutes (98% faster).
              </li>

              <li>
                Drive automation initiatives to streamline regulatory monitoring, including the development of ReM AI
                (Regulatory Monitoring AI). This LLM-powered tool assists the RMT Team with document summarization,
                comparison, and understanding historical trends via a connected Jira MCP, and can automatically create
                Jira issues and Confluence pages.
              </li>

              <li>
                Architecting a unified data repository (Reg-Inventory) by integrating multi-channel data streams from
                Jira, ServiceNow (SNOW), and product inventory to centralize documentation for all regulatory reports.
              </li>
            </ul>
          </div>

          {/* ============================================================ */}
          {/* NASDAQ — Client Success Operations Analysis Intern             */}
          {/* ============================================================ */}

          <div className="mb-8">
            <h3 className="font-semibold">NASDAQ, Mumbai, India</h3>

            <p className="italic mb-3">Client Success Operations Analysis Intern · Jan 2025 – Jun 2025</p>

            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>
                Led strategic initiatives, including the Whitespace Project to identify upsell and cross-sell
                opportunities, and an organization-wide Net Promoter Score campaign across multiple Nasdaq product lines
                (Calypso, AxiomSL, NTS) leveraging Qualtrics, Planhat, Power BI, and Salesforce.
              </li>

              <li>
                Supported Nasdaq Trade Surveillance (Phase-1) by vetting subscriptions through JIRA and automating
                AI-powered vetting workflows using an internal GenAI Platform. This increased efficiency and reduced
                manual work for easy-to-process documents.
              </li>

              <li>
                Collaborated with global teams to streamline customer success operations, analyze client trends,
                optimize retention strategies, and enhance stakeholder engagement.
              </li>
            </ul>
          </div>

          {/* ============================================================ */}
          {/* JIO                                                             */}
          {/* ============================================================ */}

          <div className="mb-8">
            <h3 className="font-semibold">Jio Platforms Limited, Mumbai, India</h3>

            <p className="italic mb-3">Data Science Intern · Dec 2023 – Jan 2024</p>

            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>
                Designed and implemented an AI-driven indoor wireless coverage optimization system, integrating ray
                tracing simulations (Pylayers) and computer vision (OpenCV) to enhance network planning and signal
                accuracy.
              </li>

              <li>
                Developed visibility and interaction maps, automated wall detection, and distance measurements to
                optimize the placement of network access points for improved 5G coverage.
              </li>

              <li>
                Delivered a proof-of-concept demonstrating the real-world applicability of ray tracing for 5G network
                challenges, providing actionable insights and collaborating with teams to support Jio&apos;s network
                improvement strategies.
              </li>
            </ul>
          </div>

          {/* ============================================================ */}
          {/* FANATISCH DIGITAL MARKETING SERVICES                           */}
          {/* ============================================================ */}

          <div className="mb-8">
            <h3 className="font-semibold">Fanatisch Digital Marketing Services, Mumbai, India</h3>

            <p className="italic mb-3">Marketing Intern</p>

            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>
                Curated engaging content ideas for Instagram handles of food companies, including @oddiyana._, @pots56_,
                @pakkhtun_, @blissobowl, and @birinjz.
              </li>

              <li>
                Executed data-driven campaigns using Instagram and Google Ads to boost brand visibility and engagement.
              </li>

              <li>
                Led a comprehensive campaign titled &quot;Feast from the east&quot; for a month, targeting food
                enthusiasts in Mumbai.
              </li>

              <li>
                Utilized Instagram and Google Ads to segment audiences based on culinary interests and online behavior.
              </li>

              <li>
                Developed a content calendar featuring daily recipes, cooking tips, and user-generated content to
                maintain engagement.
              </li>

              <li>Implemented A/B testing for ad creatives and landing pages to optimize performance.</li>

              <li>Increased followers by 25% across all Instagram handles.</li>

              <li>Achieved a 40% boost in engagement rates through targeted ads and interactive content.</li>

              <li>
                Enhanced website traffic by 35% and improved conversion rates by 20% through optimized online marketing
                strategies.
              </li>

              <li>
                Assisted in organizing the &quot;Feast from the East&quot; event at Royal Orchid Central Grazia, Mumbai.
              </li>

              <li>
                Coordinated logistics, managed vendor relations, and promoted the event through social media channels.
              </li>

              <li>Ensured a successful event turnout and positive attendee feedback.</li>
            </ul>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Recommendations                                                   */}
        {/* ================================================================ */}

        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Recommendations</h2>

          <div className="space-y-6">
            <div>
              <p>
                <strong>Ibrahim Carime</strong> — Senior Director, Customer Success Operations, Nasdaq
              </p>

              <p className="text-sm text-white mt-1">
                Ibrahim mentored Gaurav during his internship at Nasdaq. He praised Gaurav’s motivation, curiosity, and
                strong engagement, describing him as a standout contributor who brought fresh energy and shows great
                potential for the future.
              </p>
            </div>

            <div>
              <p>
                <strong>Doug Williamson</strong> — Executive Finance Coach, University of Cambridge
              </p>

              <p className="text-sm text-white mt-1">
                Doug taught Gaurav in the Finance & Accounting unit at Cambridge. He highlighted his ability to grasp
                complex finance topics, apply them to practical challenges, and deliver insightful analysis. Doug also
                commended Gaurav’s strong time and project management skills, confident he will add substantial value in
                any role.
              </p>
            </div>

            <div>
              <p>
                <strong>Sourav Raj</strong> — Data Scientist, Jio
              </p>

              <p className="text-sm text-white mt-1">
                Sourav mentored Gaurav during an internship at Jio. He emphasized his flexibility, rapid learning, and
                proactive approach to problem-solving. Gaurav consistently delivered high-quality work on time, and
                Sourav noted he would be a valuable asset in any future position.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Category Spotlight                                                */}
        {/* ================================================================ */}

        <CategorySpotlight />

        {/* ================================================================ */}
        {/* GitHub Activity                                                   */}
        {/* ================================================================ */}

        <GitHubActivity />
      </div>

      {/* ================================================================ */}
      {/* Existing scrollbar styling ONLY                                  */}
      {/* ================================================================ */}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* GitHub calendar scrollbar is hidden everywhere */
        .github-calendar-viewport {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .github-calendar-viewport::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .github-calendar-viewport .react-activity-calendar__scroll-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .github-calendar-viewport .react-activity-calendar__scroll-container::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        /* Let the calendar use the width of its own full-size viewport */
        .github-calendar-viewport > * {
          min-width: max-content;
        }

        .github-calendar-surface {
          isolation: isolate;
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
