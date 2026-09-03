import { useCallback, useEffect, useRef, useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";

const CATEGORIES = ["Languages", "Skills", "Platforms", "Certifications", "Extracurriculars"] as const;

type Category = (typeof CATEGORIES)[number];

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

const CATEGORY_DATA: Record<Category, string[]> = {
  Languages: ["English", "Marathi", "Hindi", "Japanese"],

  Skills: [
    "Generative AI & Agents",
    "AI Workflows & Automation",
    "Python & SQL",
    "Data Analytics & Visualization",
    "Business Analysis",
    "Product Management",
    "Project Management",
    "Strategic Planning",
    "Customer Success Operations",
    "Regulatory Technology",
  ],

  Platforms: [
    "Salesforce",
    "ServiceNOW",
    "JIRA, Confluence",
    "Planhat",
    "Power BI, Tableau",
    "Power Automate, n8n",
    "Qualtrics",
    "Workday",
  ],

  Certifications: [
    "Model Context Protocol – Anthropic",
    "Forward Program – McKinsey",
    "Power User Certification – Planhat",
    "Six Sigma White Belt – AIGPE",
    "Sustainable Software Engineering – Hasso Plattner Institute",
    "Project Management – Saylor Academy",
  ],

  Extracurriculars: [
    "Photography Lead – NASDAQ",
    "President – CSI (2024 – 2025)",
    "Technical Lead – AIMSA (2024 – 2025)",
    "Media Head – AIMSA (2023 – 2024)",
  ],
};

/* -------------------------------------------------------------------------- */
/* Timing                                                                     */
/* -------------------------------------------------------------------------- */

const DURATIONS: Record<Category, number> = {
  Languages: 7000,
  Skills: 9000,
  Platforms: 8000,
  Certifications: 11000,
  Extracurriculars: 9000,
};

/* -------------------------------------------------------------------------- */
/* Chip styling                                                               */
/* -------------------------------------------------------------------------- */

const chipClass =
  "rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/90 hover:bg-white/20 transition-colors duration-300 ease-out px-4 py-2 text-sm";

/* -------------------------------------------------------------------------- */
/* Spotlight Content                                                          */
/* -------------------------------------------------------------------------- */

const SpotlightContent = ({ category, animationKey }: { category: Category; animationKey: number }) => {
  const items = CATEGORY_DATA[category];

  return (
    <div key={animationKey} className="flex flex-wrap gap-2.5 sm:gap-3">
      {items.map((item, index) => (
        <div
          key={item}
          className={`spotlight-item ${chipClass}`}
          style={
            {
              "--spotlight-delay": `${index * 75}ms`,
            } as React.CSSProperties
          }
        >
          {item}
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Category Spotlight                                                         */
/* -------------------------------------------------------------------------- */

const CategorySpotlight = () => {
  const [active, setActive] = useState<Category>("Languages");
  const [paused, setPaused] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const timerRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Reduced motion                                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Timer cleanup                                                          */
  /* ---------------------------------------------------------------------- */

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Advance category                                                       */
  /* ---------------------------------------------------------------------- */

  const advance = useCallback(() => {
    setActive((current) => {
      const currentIndex = CATEGORIES.indexOf(current);
      return CATEGORIES[(currentIndex + 1) % CATEGORIES.length];
    });

    setAnimationKey((key) => key + 1);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Category timer                                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    clearTimer();

    if (paused || reducedMotionRef.current) {
      return;
    }

    timerRef.current = window.setTimeout(advance, DURATIONS[active]);

    return clearTimer;
  }, [active, paused, advance, clearTimer]);

  /* ---------------------------------------------------------------------- */
  /* Manual category selection                                              */
  /* ---------------------------------------------------------------------- */

  const select = (category: Category) => {
    if (category === active) {
      return;
    }

    clearTimer();

    setActive(category);
    setAnimationKey((key) => key + 1);
  };

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* ---------------------------------------------------------------- */}
      {/* Category navigation                                               */}
      {/* ---------------------------------------------------------------- */}

      <h2 className="text-xl sm:text-2xl font-semibold mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-2">
        {CATEGORIES.map((category, index) => (
          <span key={category} className="flex items-baseline gap-x-2">
            <button
              type="button"
              onClick={() => select(category)}
              className={`relative pb-1 transition-all duration-500 ease-out focus:outline-none ${
                active === category
                  ? "text-white [text-shadow:0_0_18px_rgba(255,255,255,0.55)]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {category}

              {/* -------------------------------------------------------- */}
              {/* Progress indicator                                       */}
              {/* -------------------------------------------------------- */}

              {active === category && (
                <span
                  className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-white/30 overflow-hidden"
                  aria-hidden="true"
                >
                  <span
                    key={`${category}-${animationKey}`}
                    className="spotlight-progress block h-full w-full bg-white"
                    style={{
                      animationDuration: `${DURATIONS[category]}ms`,
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                </span>
              )}
            </button>

            {index < CATEGORIES.length - 1 && <span className="text-white/30 select-none">/</span>}
          </span>
        ))}
      </h2>

      {/* ---------------------------------------------------------------- */}
      {/* Category content                                                  */}
      {/* ---------------------------------------------------------------- */}

      <div className="pt-2 max-w-4xl">
        <SpotlightContent category={active} animationKey={animationKey} />
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Portfolio                                                                  */
/* -------------------------------------------------------------------------- */

const Portfolio = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* Background                                                        */}
      {/* ---------------------------------------------------------------- */}

      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)",
        }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Navigation                                                        */}
      {/* ---------------------------------------------------------------- */}

      <NavigationToggle />

      {/* ---------------------------------------------------------------- */}
      {/* Main content                                                      */}
      {/* ---------------------------------------------------------------- */}

      <div className="relative z-10 max-w-3xl w-full px-4 sm:px-6 md:px-8 text-left space-y-10 overflow-y-scroll no-scrollbar pt-20 sm:pt-24 pb-20 sm:pb-24">
        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}

        <div className="relative w-full mb-8 overflow-hidden">
          <h1 className="sr-only">Gaurav Darwesh</h1>

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
                regulations into actionable product and business requirements for AxiomSL’s reporting solutions.
              </li>

              <li>
                Manage end-to-end regulatory change processes, including creating JIRA tickets, coordinating
                cross-functional teams like BA, sales and pre-sales teams with client-specific needs, ensuring data
                accuracy and integrity in internal systems, and contributing to product enhancements.
              </li>

              <li>
                Built Power BI dashboards using Power Query translating raw data from JIRA and ServiceNow into
                leadership insights.
              </li>

              <li>
                Designed a comprehensive Regulatory Monitoring communication pipeline for the AxiomSL Regulatory
                Newsletter, Email, and Teams Channel via Power Automate and an internal AI platform. The system captures
                marked JIRA tickets, utilizes AI to structure the data, and enforces human-in-the-loop approvals before
                broadcasting to internal teams and clients.
              </li>

              <li>
                Reduced manual reporting time from 3 days to 30 minutes, making the reporting workflow 98% faster.
              </li>

              <li>
                Drive automation initiatives through the development of ReM AI (Regulatory Monitoring AI), an
                LLM-powered tool assisting the RMT Team with document summarization, comparison, and understanding
                historical trends via a connected JIRA MCP.
              </li>

              <li>Developed capabilities for ReM AI to automatically create JIRA issues and Confluence pages.</li>

              <li>
                Architecting a unified data repository, Reg-Inventory, by integrating multi-channel data streams from
                JIRA, ServiceNow, and product inventory to centralize documentation for all regulatory reports.
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
                opportunities across Nasdaq product lines.
              </li>

              <li>
                Led an organization-wide Net Promoter Score campaign across multiple Nasdaq product lines including
                Calypso, AxiomSL, and NTS, leveraging Qualtrics, Planhat, Power BI, and Salesforce.
              </li>

              <li>
                Supported Nasdaq Trade Surveillance (Phase-1) by vetting subscriptions through JIRA and automating
                AI-powered vetting workflows using an internal GenAI Platform.
              </li>

              <li>
                Improved efficiency and reduced manual work for easy-to-process documents through AI-powered workflow
                automation.
              </li>

              <li>
                Collaborated with global teams to streamline customer success operations, analyze client trends,
                optimize retention strategies, and enhance stakeholder engagement.
              </li>
            </ul>
          </div>

          {/* ============================================================ */}
          {/* JIO                                                            */}
          {/* ============================================================ */}

          <div className="mb-8">
            <h3 className="font-semibold">Jio Platforms Limited, Mumbai, India</h3>

            <p className="italic mb-3">Data Science Intern · Dec 2023 – Jan 2024</p>

            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>
                Designed and implemented an AI-driven indoor wireless coverage optimization system, integrating ray
                tracing simulations using Pylayers and computer vision using OpenCV to enhance network planning and
                signal accuracy.
              </li>

              <li>
                Developed visibility and interaction maps, automated wall detection, and distance measurements to
                optimize the placement of network access points for improved 5G coverage.
              </li>

              <li>
                Delivered a proof-of-concept demonstrating the real-world applicability of ray tracing for 5G network
                challenges, providing actionable insights and collaborating with teams to support Jio’s network
                improvement strategies.
              </li>
            </ul>
          </div>

          {/* ============================================================ */}
          {/* FANATISCH                                                      */}
          {/* ============================================================ */}

          <div className="mb-8">
            <h3 className="font-semibold">Fanatisch Digital Marketing Services, Mumbai, India</h3>

            <p className="italic mb-3">Marketing Intern</p>

            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>Curated engaging content ideas for Instagram handles of food companies under FDMS.</li>

              <li>
                Led a comprehensive campaign titled “Feast from the East” for a month, targeting food enthusiasts in
                Mumbai.
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
            </ul>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Category Spotlight                                                */}
        {/* ================================================================ */}

        <CategorySpotlight />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Performance-focused animations                                    */}
      {/* ------------------------------------------------------------------ */}

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* ================================================================ */
        /* Spotlight item animation                                         */
        /* ================================================================ */

        /*
         * IMPORTANT:
         *
         * Do NOT animate filter: blur().
         *
         * Blur is a paint-heavy operation and was the main reason the
         * previous version could feel like it was running at ~24fps.
         *
         * Instead, this creates the same soft visual impression through:
         *
         *   opacity
         *   translateY
         *   scale
         *
         * These properties can be handled by the compositor.
         */

        .spotlight-item {
          opacity: 0;
          transform: translate3d(0, 4px, 0) scale(0.985);

          animation-name: spotlightItemIn;
          animation-duration: 620ms;
          animation-timing-function: cubic-bezier(
            0.22,
            1,
            0.36,
            1
          );
          animation-delay: var(--spotlight-delay);
          animation-fill-mode: both;

          /*
           * Only promote the currently animating element.
           * The animation itself is short, so this avoids keeping
           * unnecessary GPU layers around permanently.
           */
          backface-visibility: hidden;
        }

        @keyframes spotlightItemIn {

          0% {
            opacity: 0;
            transform: translate3d(0, 4px, 0) scale(0.985);
          }

          35% {
            opacity: 0.45;
            transform: translate3d(0, 2px, 0) scale(0.992);
          }

          70% {
            opacity: 0.82;
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        /* ================================================================ */
        /* Progress bar                                                     */
        /* ================================================================ */

        /*
         * ScaleX is compositor-friendly.
         *
         * We don't animate width, left, margin, padding or any layout
         * property.
         */

        .spotlight-progress {
          transform-origin: left center;
          transform: scale3d(0, 1, 1);

          animation-name: spotlightProgress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;

          backface-visibility: hidden;
        }

        @keyframes spotlightProgress {

          from {
            transform: scale3d(0, 1, 1);
          }

          to {
            transform: scale3d(1, 1, 1);
          }

        }

        /* ================================================================ */
        /* Reduced motion                                                   */
        /* ================================================================ */

        @media (prefers-reduced-motion: reduce) {

          .spotlight-item {
            animation: none;
            opacity: 1;
            transform: none;
          }

          .spotlight-progress {
            animation: none;
            transform: scale3d(1, 1, 1);
          }

        }
      `}</style>
    </div>
  );
};

export default Portfolio;
