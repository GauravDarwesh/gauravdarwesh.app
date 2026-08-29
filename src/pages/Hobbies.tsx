import { useCallback, useEffect, useRef, useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";

const CATEGORIES = ["Languages", "Skills", "Platforms", "Certifications", "Extracurriculars"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_DATA: Record<Category, string[]> = {
  Languages: ["English", "Marathi", "Hindi", "Japanese"],
  Skills: [
    "Business Strategy",
    "Data Analytics and Visualization",
    "Project Management",
    "Technical Leadership",
    "Strategic Planning",
    "AI Dev Solutions",
  ],
  Platforms: ["Salesforce", "ServiceNOW", "JIRA, Confluence", "Planhat", "PowerBI, Tableau", "O365", "Qualtrics", "Workday"],
  Certifications: [
    "Forward Program – McKinsey and Company",
    "Power User Certification – Planhat",
    "Six Sigma White Belt – AIGPE",
    "Sustainable Software Engineering – Hasso Plattner Institute",
    "Project Management – Saylor Academy",
  ],
  Extracurriculars: [
    "Photography Lead – NASDAQ Mumbai (2026 – 2027)",
    "President – Computer Society of India (2024 – 2025)",
    "Technical Lead – AIMSA (2024 – 2025)",
    "Media Head – AIMSA (2023 – 2024)",
  ],
};

// Auto-rotation dwell time per category (ms)
const DURATIONS: Record<Category, number> = {
  Languages: 7000,
  Skills: 7000,
  Platforms: 7000,
  Certifications: 11000,
  Extracurriculars: 11000,
};

const chipClass =
  "rounded-2xl border border-white/15 bg-black/25 backdrop-blur-md text-white/90 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]";

const SpotlightContent = ({ category, animKey }: { category: Category; animKey: number }) => {
  const items = CATEGORY_DATA[category];
  const stagger = (i: number) => ({ animationDelay: `${i * 70}ms` });

  if (category === "Languages") {
    return (
      <div key={animKey} className="grid grid-cols-2 gap-4 sm:gap-6">
        {items.map((item, i) => (
          <div
            key={item}
            style={stagger(i)}
            className={`spotlight-item ${chipClass} flex items-center justify-center px-6 py-8 sm:py-12 text-lg sm:text-2xl font-medium tracking-wide`}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (category === "Skills") {
    return (
      <div key={animKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {items.map((item, i) => (
          <div
            key={item}
            style={stagger(i)}
            className={`spotlight-item ${chipClass} flex items-center px-6 py-6 sm:py-8 text-base sm:text-lg leading-snug`}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (category === "Platforms") {
    return (
      <div key={animKey} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {items.map((item, i) => (
          <div
            key={item}
            style={stagger(i)}
            className={`spotlight-item ${chipClass} flex items-center justify-center text-center px-5 py-5 sm:py-6 text-sm sm:text-base`}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }

  if (category === "Certifications") {
    return (
      <div key={animKey} className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7">
        {items.map((item, i) => (
          <div
            key={item}
            style={stagger(i)}
            className={`spotlight-item ${chipClass} px-7 py-8 sm:px-9 sm:py-10 ${
              i === items.length - 1 ? "md:col-span-2" : ""
            }`}
          >
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-white/50 mb-3">Credential</p>
            <p className="text-base sm:text-xl font-medium leading-relaxed">{item}</p>
          </div>
        ))}
      </div>
    );
  }

  // Extracurriculars — "Role – Organisation (Years)"
  return (
    <div key={animKey} className="flex flex-col gap-5 sm:gap-7">
      {items.map((item, i) => {
        const [role, rest] = item.split(" – ", 2);
        return (
          <div key={item} style={stagger(i)} className={`spotlight-item ${chipClass} flex items-start gap-5 px-7 py-7 sm:px-9 sm:py-8`}>
            <span className="text-xs sm:text-sm text-white/40 font-mono pt-1">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="text-base sm:text-xl font-medium leading-snug">{role}</p>
              <p className="text-sm text-white/60 mt-1.5">{rest}</p>
            </div>
          </div>
        );
      })}
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
    setProgressKey((k) => k + 1); // restart this category's timer
  };

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Animated category navigation heading */}
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
                    style={{ animationDuration: `${DURATIONS[cat]}ms`, animationPlayState: paused ? "paused" : "running" }}
                  />
                </span>
              )}
            </button>
            {i < CATEGORIES.length - 1 && <span className="text-white/30 select-none">/</span>}
          </span>
        ))}
      </h2>

      {/* Glass content panel */}
      <div className="rounded-3xl border border-white/15 bg-black/25 backdrop-blur-md p-5 sm:p-8 md:p-10 max-w-4xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-white/45 mb-6">
          {String(CATEGORIES.indexOf(active) + 1).padStart(2, "0")} / {active}
        </p>
        <SpotlightContent category={active} animKey={progressKey} />
      </div>
    </section>
  );
};

const Portfolio = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Main Content with invisible scroll */}
      <div className="relative z-10 max-w-3xl w-full px-4 sm:px-6 md:px-8 text-left space-y-10 overflow-y-scroll no-scrollbar pt-20 sm:pt-24 pb-20 sm:pb-24">
        {/* Header */}
        <div className="relative w-full mb-8 overflow-hidden">
          {/* Accessible single H1 for SEO */}
          <h1 className="sr-only">Hobbies – Gaurav Darwesh</h1>
          {/* Seamless marquee: two identical groups inside a single animated track */}
          <div className="overflow-hidden marquee-fade-edges">
            <div className="animate-marquee flex items-center">
              {/* Group A */}
              <div className="flex items-center shrink-0">
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
              </div>
              {/* Group B (duplicate) */}
              <div className="flex items-center shrink-0" aria-hidden="true">
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
                <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold whitespace-nowrap px-6">Gaurav Darwesh</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-4 text-white mt-2">
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=gauravdarwesh155@gmail.com">mail/</a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank">
              in/
            </a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank">
              twitter/
            </a>
            <a href="https://www.threads.com/@allaboutgaurav" target="_blank">
              threads/
            </a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank">
              instagram/
            </a>
          </div>
        </div>

        {/* About Section */}
        <p className="text-base sm:text-lg leading-relaxed mt-4">
          I am a Cambridge University graduate in Strategic Business and Management, with a Bachelor of Engineering in
          Computer Science (AIML) from the University of Mumbai. Currently working at Nasdaq, with prior experience at
          notable MNC like Jio. Proficient in Jira, Salesforce, ServiceNow, Planhat, Power BI, and Excel, I specialize
          in developing innovative solutions that drive business growth and operational efficiency.
        </p>

        {/* Education */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Education</h2>

          <div className="mb-8">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">University of Mumbai</h3>
            </div>
            <p className="text-sm">B.E. in Computer Science & Engineering (AI & ML), 8.6 CGPA</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">University of Cambridge</h3>
            </div>
            <p className="text-sm">Undergraduate Certificate in Strategic Business & Management</p>
          </div>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Experience</h2>

          <div className="mb-8">
            <h3 className="font-semibold">Nasdaq, Mumbai, India </h3>
            <p className="italic mb-3">Product Manager Analyst</p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>Monitoring and analyzing global regulatory updates across NAM and LATAM regions.</li>
              <li>Managing JIRA tickets for regulatory changes, requirements, and enhancements.</li>
              <li>
                Collaborating with cross-functional teams to interpret regulations and translate them into product
                requirements.
              </li>
              <li>Supporting weekly regulatory newsletters for internal and external stakeholders.</li>
              <li>Assisting pre-sales and sales teams by aligning client regulatory needs with solutions.</li>
              <li>Contributing to product enhancement initiatives to improve responsiveness to regulatory change.</li>
              <li>Building expertise in compliance frameworks such as Basel, EMIR, and SFTR.</li>
              <li>Ensuring accuracy in regulatory documentation and maintaining data integrity.</li>
              <li>Identifying and escalating potential regulatory risks to ensure proactive compliance.</li>
              <li>Enhancing workflows by supporting business analysis and automating regulatory tracking.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold">Nasdaq, Mumbai, India</h3>
            <p className="italic mb-3">Client Success Operations Intern</p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>
                Led the Whitespace Project to identify upsell/cross-sell opportunities across Calypso, AxiomSL, and NTS
                product lines.
              </li>
              <li>
                Deployed organization-level NPS campaigns via Qualtrics for Calypso, AxiomSL (ControllerView), NTS,
                CapCloud, and RegCloud product lines to capture client feedback and inform strategy.
              </li>
              <li>Assisted with capturing global control times to provide smooth and relevant information flow.</li>
              <li>
                Contributed to Nasdaq Trade Surveillance (Phase-1) by vetting SUBS through JIRA, automating procedures
                and building visualizations weekly for global account review meetings.
              </li>
              <li>Utilized Planhat for customer success analytics and management.</li>
              <li>Leveraged Power BI/Salesforce for strategic data visualization and reporting.</li>
              <li>Partnered with global teams to streamline customer success operations.</li>
              <li>Analyzed client trends to optimize retention strategies.</li>
              <li>Assisted in automating workflows to enhance operational efficiency.</li>
              <li>Strengthened global stakeholder engagement for success execution.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold">Jio Platforms Limited, Mumbai, India</h3>
            <p className="italic mb-3">Data Science Intern</p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>
                Led the development of an AI-based system to improve indoor wireless network coverage, focusing on
                better planning and signal accuracy.
              </li>
              <li>
                Built a ray tracing simulation using the open-source Pylayers library to model how signals travel inside
                buildings.
              </li>
              <li>
                Created detailed visibility and interaction maps to represent indoor layouts and help place network
                access points more effectively.
              </li>
              <li>
                Used computer vision with OpenCV to detect walls and structures, measuring distances to improve coverage
                planning.
              </li>
              <li>
                Ran coverage simulations and visualized signal patterns to provide insights for enhancing 5G network
                design.
              </li>
              <li>
                Showed how ray tracing can be applied to real-world 5G network challenges through a working
                proof-of-concept.
              </li>
              <li>
                Worked closely with teams to share findings and support decision-making on Jio’s network improvement
                plans.
              </li>
            </ul>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold">Fanatisch Digital Marketing Services, Mumbai, India</h3>
            <p className="italic mb-3">Marketing Intern</p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>Curated engaging content ideas for Instagram handles of food companies under FDMS.</li>
              <li>
                Led a comprehensive campaign titled "Feast from the east" for a month, targeting food enthusiasts in
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

        {/* Recommendations */}
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

        {/* Skills */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Languages / Skills / Platforms / Certifications / Extracurriculars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 text-sm -mx-4 sm:-mx-6 md:-mx-12 px-4 sm:px-6 md:px-12">
            <div>
              <h3 className="font-semibold mb-2">Languages</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>English</li>
                <li>Marathi</li>
                <li>Hindi</li>
                <li>Japanese</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Business Strategy</li>
                <li>Data Analytics and Visualization</li>
                <li>Project Management</li>
                <li>Technical Leadership</li>
                <li>Strategic Planning</li>
                <li>AI Dev Solutions</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Platforms</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Salesforce</li>
                <li>ServiceNOW</li>
                <li>JIRA, Confluence</li>
                <li>Planhat</li>
                <li>PowerBI, Tableau</li>
                <li>O365</li>
                <li>Qualtrics</li>
                <li>Workday</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Certifications</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Forward Program – McKinsey and Company</li>
                <li>Power User Certification – Planhat</li>
                <li>Six Sigma White Belt – AIGPE</li>
                <li>Sustainable Software Engineering – Hasso Plattner Institute</li>
                <li>Project Management – Saylor Academy</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Extracurriculars</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Photography Lead – NASDAQ Mumbai (2026 – 2027)</li>
                <li>President – Computer Society of India (2024 – 2025)</li>
                <li>Technical Lead – AIMSA (2024 – 2025)</li>
                <li>Media Head – AIMSA (2023 – 2024)</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Invisible scrollbar styling */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
