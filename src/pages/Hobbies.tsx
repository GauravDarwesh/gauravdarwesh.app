import { cloneElement, useCallback, useEffect, useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { Helmet } from "react-helmet-async";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import NavigationToggle from "@/components/NavigationToggle";

const CATEGORIES = ["Languages", "Skills", "Platforms", "Certifications", "Extracurriculars"] as const;

type Category = (typeof CATEGORIES)[number];

const getOrdinalSuffix = (day: number) => {
  const remainder100 = day % 100;

  if (remainder100 >= 11 && remainder100 <= 13) return "th";

  if (day % 10 === 1) return "st";
  if (day % 10 === 2) return "nd";
  if (day % 10 === 3) return "rd";

  return "th";
};

const formatContributionDetail = ({ count, date }: Activity) => {
  const parsedDate = new Date(`${date}T12:00:00`);
  const month = parsedDate.toLocaleDateString("en-US", { month: "long" });
  const day = parsedDate.getDate();
  const contributionLabel = count === 1 ? "contribution" : "contributions";

  return `${count} ${contributionLabel} on ${month} ${day}${getOrdinalSuffix(day)}.`;
};

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
  "rounded-full border border-white/20 bg-white/10 backdrop-blur-sm text-white/90 hover:bg-white/20 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] px-4 py-2 text-sm";

const SpotlightContent = ({
  category,
  animKey,
  measure = false,
}: {
  category: Category;
  animKey: number;
  measure?: boolean;
}) => {
  const items = CATEGORY_DATA[category];

  const stagger = (i: number) => ({
    animationDelay: `${i * 90}ms`,
  });

  return (
    <div
      key={animKey}
      className={`flex flex-wrap gap-2.5 sm:gap-3 ${measure ? "spotlight-measure-content" : ""}`}
    >
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
      id="skills"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Animated category navigation */}
      <h2 className="relative z-20 text-xl sm:text-2xl font-semibold mb-6 flex flex-wrap items-baseline gap-x-2 gap-y-2">
        {CATEGORIES.map((cat, i) => (
          <span key={cat} className="flex items-baseline gap-x-2">
            <button
              type="button"
              onClick={() => select(cat)}
              className={`relative pb-1 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none ${
                active === cat
                  ? "text-white [text-shadow:0_0_18px_rgba(255,255,255,0.55)]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {cat}

              {active === cat && (
                <span className="absolute left-0 right-0 -bottom-0.5 z-30 h-[2px] rounded-full bg-white/30 overflow-hidden">
                  <span
                    key={progressKey}
                    className="spotlight-progress relative z-30 block h-full bg-white"
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
      <div className="spotlight-stage pt-2 max-w-4xl">
        <div className="spotlight-active-content">
          <SpotlightContent category={active} animKey={progressKey} />
        </div>

        <div className="spotlight-measure" aria-hidden="true">
          {CATEGORIES.map((category) => (
            <SpotlightContent
              key={`measure-${category}`}
              category={category}
              animKey={0}
              measure
            />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ======================================================================== */
/* GitHub Activity                                                          */
/* ======================================================================== */

const GitHubActivity = () => {
  const [isMinimal, setIsMinimal] = useState(false);
  const [contributions, setContributions] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityTooltip, setActivityTooltip] = useState<{
    text: string;
    left: number;
    top: number;
  } | null>(null);
  const currentYear = new Date().getFullYear();

  const showActivityTooltip = (
    event: MouseEvent<SVGElement> | FocusEvent<SVGElement>,
    activity: Activity,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const safeLeft = Math.min(window.innerWidth - 118, Math.max(118, bounds.left + bounds.width / 2));

    setActivityTooltip({
      text: formatContributionDetail(activity),
      left: safeLeft,
      top: bounds.top - 10,
    });
  };

  useEffect(() => {
    const root = document.documentElement;

    const syncTheme = () => {
      setIsMinimal(root.dataset.theme === "minimal");
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadContributions = async () => {
      setLoading(true);

      try {
        const cacheBuster = Date.now();

        const response = await fetch(
          `https://github-contributions-api.jogruber.de/v4/GauravDarwesh?y=${currentYear}&_=${cacheBuster}`,
          {
            signal: controller.signal,
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`GitHub contribution request failed: ${response.status}`);
        }

        const data = (await response.json()) as {
          contributions?: Activity[];
        };

        if (!Array.isArray(data.contributions)) {
          throw new Error("GitHub contribution data was not returned in the expected format.");
        }

        setContributions(data.contributions);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("GitHub contribution loading failed:", error);
          setContributions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadContributions();

    return () => controller.abort();
  }, [currentYear]);

  /*
   * Only the contribution colors are changed here.
   * The data source, calendar library, sizing, labels and counts remain intact.
   *
   * Classic:
   * transparent/plum -> violet -> lavender
   *
   * Minimal:
   * white/gray -> black
   */
  const calendarTheme = isMinimal
    ? {
        light: ["rgba(0,0,0,0.045)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.62)", "rgba(0,0,0,0.92)"],
        dark: [
          "rgba(255,255,255,0.045)",
          "rgba(28,180,170,0.22)",
          "rgba(20,170,195,0.40)",
          "rgba(55,125,245,0.68)",
          "rgba(125,195,255,0.95)",
        ],
      }
    : {
        dark: [
          "rgba(255,255,255,0.045)",
          "rgba(28,180,170,0.22)",
          "rgba(20,170,195,0.40)",
          "rgba(55,125,245,0.68)",
          "rgba(125,195,255,0.95)",
        ],
      };

  return (
    <section id="github" className="pt-2">
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-semibold">GitHub Activity</h2>

        <p className="text-sm text-white/45 mt-1">A year of building, experimenting, and shipping.</p>
      </div>

      <div className="github-calendar-shell relative w-full overflow-hidden rounded-3xl border border-white/[0.16] bg-white/[0.10] backdrop-blur-[5px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-44 w-80 -translate-x-1/2 rounded-full bg-white/[0.055] blur-3xl"
        />

        <div className="relative px-4 py-5 sm:px-6 sm:py-6 overflow-hidden">
          {loading ? (
            <div className="h-[190px] w-full animate-pulse rounded-2xl bg-white/[0.04]" />
          ) : (
            <ActivityCalendar
              key={`github-calendar-${isMinimal ? "minimal" : "classic"}`}
              className="github-activity-calendar"
              data={contributions}
              colorScheme={isMinimal ? "light" : "dark"}
              blockSize={11}
              blockMargin={4}
              blockRadius={2}
              fontSize={12}
              showWeekdayLabels
              showMonthLabels
              showColorLegend
              showTotalCount
              labels={{
                totalCount: `{{count}} contributions in ${currentYear}`,
              }}
              renderBlock={(block, activity) =>
                cloneElement(block, {
                  className: "github-contribution-cell",
                  role: "img",
                  tabIndex: 0,
                  "aria-label": formatContributionDetail(activity),
                  onMouseEnter: (event: MouseEvent<SVGElement>) =>
                    showActivityTooltip(event, activity),
                  onMouseLeave: () => setActivityTooltip(null),
                  onFocus: (event: FocusEvent<SVGElement>) =>
                    showActivityTooltip(event, activity),
                  onBlur: () => setActivityTooltip(null),
                })
              }
              theme={calendarTheme}
            />
          )}
        </div>
      </div>

      {activityTooltip && (
        <div
          className="github-activity-tooltip"
          role="tooltip"
          style={{ left: activityTooltip.left, top: activityTooltip.top }}
        >
          {activityTooltip.text}
        </div>
      )}
    </section>
  );
};

/* ======================================================================== */
/* Outside Work / Training                                                  */
/* ======================================================================== */

type TrainingActivity = {
  id: string;
  type: string;
  date: string;
  distanceKm: number;
  movingMinutes: number;
};

type TrainingDay = {
  date: string;
  count: number;
  activities: TrainingActivity[];
};

type TrainingResponse = {
  source: string;
  year: number;
  from: string;
  to: string;
  totals: {
    activities: number;
    distanceKm: number;
    movingMinutes: number;
  };
  days: TrainingDay[];
};

const formatTrainingDuration = (minutes: number) => {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
};

const formatTrainingDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

const formatTrainingType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

const OutsideWork = () => {
  const [training, setTraining] = useState<TrainingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimal, setIsMinimal] = useState(false);
  const [trainingTooltip, setTrainingTooltip] = useState<{
    text: string;
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsMinimal(root.dataset.theme === "minimal");
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadTraining = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          "https://zdrcjhohalgzhlbufwcl.supabase.co/functions/v1/intervals-activity",
          { signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" } },
        );
        if (!response.ok) throw new Error(`Training request failed: ${response.status}`);
        setTraining((await response.json()) as TrainingResponse);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Training activity loading failed:", error);
          setTraining(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadTraining();
    return () => controller.abort();
  }, []);

  const showTrainingTooltip = (
    event: MouseEvent<SVGElement> | FocusEvent<SVGElement>,
    day: TrainingDay,
  ) => {
    if (day.count === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const safeLeft = Math.min(window.innerWidth - 150, Math.max(150, bounds.left + bounds.width / 2));
    const details = day.activities.map((activity) => {
      const distance = activity.distanceKm > 0 ? ` · ${activity.distanceKm.toFixed(1)} km` : "";
      return `${formatTrainingType(activity.type)} · ${formatTrainingDuration(activity.movingMinutes)}${distance}`;
    }).join(" | ");
    setTrainingTooltip({
      text: `${formatTrainingDate(day.date)} · ${details}`,
      left: safeLeft,
      top: bounds.top - 10,
    });
  };

  if (!loading && !training) return null;

  const days = training?.days ?? [];
  const trainingDayByDate = new Map(days.map((day) => [day.date, day]));
  const calendarData: Activity[] = days.map((day) => ({
    date: day.date,
    count: day.count,
    level: day.count === 0 ? 0 : Math.min(4, Math.max(1, day.count)),
  }));
  const totalHours = Math.floor((training?.totals.movingMinutes ?? 0) / 60);
  const totalMinutes = Math.round((training?.totals.movingMinutes ?? 0) % 60);
  const latestActiveDay = [...days].reverse().find((day) => day.count > 0) ?? null;

  const trainingCalendarTheme = isMinimal
    ? {
        light: [
          "rgba(0,0,0,0.045)",
          "rgba(0,0,0,0.18)",
          "rgba(0,0,0,0.38)",
          "rgba(0,0,0,0.62)",
          "rgba(0,0,0,0.92)",
        ],
      }
    : {
        dark: [
          "rgba(255,255,255,0.045)",
          "rgba(120,125,255,0.24)",
          "rgba(130,110,255,0.42)",
          "rgba(155,105,255,0.64)",
          "rgba(190,155,255,0.88)",
        ],
      };

  return (
    <section id="outside-work" className="pt-2">
      <div className="mb-5">
        <h2 className="text-xl sm:text-2xl font-semibold">Outside Work</h2>
        <p className="text-sm text-white/45 mt-1">A year of movement outside the screen.</p>
      </div>

      <div className="training-shell relative w-full overflow-hidden rounded-3xl border border-white/[0.16] bg-white/[0.10] backdrop-blur-[5px]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-44 w-80 -translate-x-1/2 rounded-full bg-white/[0.055] blur-3xl" />
        <div className="relative px-4 py-5 sm:px-6 sm:py-6 overflow-hidden">
          {loading ? (
            <div className="h-[190px] w-full animate-pulse rounded-2xl bg-white/[0.04]" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] px-3 py-3 sm:px-4">
                  <p className="text-2xl sm:text-3xl font-semibold tracking-tight">{totalHours}<span className="text-sm sm:text-base text-white/40 ml-1">h</span></p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mt-1">moving</p>
                </div>
                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] px-3 py-3 sm:px-4">
                  <p className="text-2xl sm:text-3xl font-semibold tracking-tight">{(training?.totals.distanceKm ?? 0).toFixed(0)}<span className="text-sm sm:text-base text-white/40 ml-1">km</span></p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mt-1">distance</p>
                </div>
                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] px-3 py-3 sm:px-4">
                  <p className="text-2xl sm:text-3xl font-semibold tracking-tight">{training?.totals.activities ?? 0}</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mt-1">activities</p>
                </div>
              </div>

              <div className="training-calendar-shell relative w-full overflow-hidden">
                <ActivityCalendar
                  key={`training-calendar-${isMinimal ? "minimal" : "classic"}`}
                  className="training-activity-calendar"
                  data={calendarData}
                  colorScheme={isMinimal ? "light" : "dark"}
                  blockSize={11}
                  blockMargin={4}
                  blockRadius={2}
                  fontSize={12}
                  showWeekdayLabels
                  showMonthLabels
                  showColorLegend={false}
                  showTotalCount={false}
                  renderBlock={(block, activity) => {
                    const day = trainingDayByDate.get(activity.date);
                    if (!day) return block;
                    return cloneElement(block, {
                      className: "training-calendar-cell",
                      role: "img",
                      tabIndex: day.count > 0 ? 0 : -1,
                      "aria-label": day.count > 0
                        ? `${formatTrainingDate(day.date)}: ${day.count} activities`
                        : `${formatTrainingDate(day.date)}: no activity`,
                      onMouseEnter: (event: MouseEvent<SVGElement>) => showTrainingTooltip(event, day),
                      onMouseLeave: () => setTrainingTooltip(null),
                      onFocus: (event: FocusEvent<SVGElement>) => showTrainingTooltip(event, day),
                      onBlur: () => setTrainingTooltip(null),
                    });
                  }}
                  theme={trainingCalendarTheme}
                />
              </div>

              {latestActiveDay && (
                <div className="mt-5 pt-5 border-t border-white/[0.10]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs uppercase tracking-[0.14em] text-white/35">Most recent</span>
                    <span className="text-xs text-white/35">{formatTrainingDate(latestActiveDay.date)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                    {latestActiveDay.activities.map((activity) => (
                      <span key={activity.id} className="text-sm text-white/75">{formatTrainingType(activity.type)}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {trainingTooltip && (
        <div className="training-activity-tooltip" role="tooltip" style={{ left: trainingTooltip.left, top: trainingTooltip.top }}>
          {trainingTooltip.text}
        </div>
      )}
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

            <a href="https://github.com/GauravDarwesh" target="_blank" rel="noopener noreferrer">
              github/
            </a>

            <a href="https://strava.app.link/hNhQ2KtF94b" target="_blank" rel="noopener noreferrer">
              strava/
            </a>
          </div>
        </div>

        {/* ================================================================ */}
        {/* About                                                            */}
        {/* ================================================================ */}

        <p id="about" className="text-base sm:text-lg leading-relaxed mt-4">
          Results-oriented professional with a strong foundation in regulatory tech and customer success operations.
          Skilled in transforming complex requirements into scalable solutions and streamlining end-to-end processes
          through Applied AI and workflow automation. Experienced in equipping teams with AI-powered insights and tools
          to drive engagement, retention, and growth. Recognized for cross-functional collaboration and a holistic,
          data-driven approach to solving business challenges.
        </p>

        {/* ================================================================ */}
        {/* Education                                                        */}
        {/* ================================================================ */}

        <section id="education">
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

        <section id="experience">
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

        <section id="recommendations">
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
        {/* GitHub Activity                                                   */}
        {/* ================================================================ */}

        <CategorySpotlight />

        {/* ================================================================ */}
        {/* GitHub Activity                                                   */}
        {/* ================================================================ */}

        <GitHubActivity />

        {/* ================================================================ */}
        {/* Outside Work / Training                                           */}
        {/* ================================================================ */}

        <OutsideWork />
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

        /*
         * GitHub Activity
         *
         * ActivityCalendar already creates its own horizontal scroll
         * container on narrow screens. The old implementation added another
         * horizontal scroll owner around it, which caused the "sticky"
         * scrolling near the end of the year.
         *
         * Keep ONE horizontal scroll owner: the library's own container.
         * The scrollbar stays completely hidden while touch/trackpad scrolling
         * remains enabled.
         */
        .github-activity-calendar {
          width: max-content;
          max-width: 100%;
          margin: 0;
        }

        .github-activity-calendar .react-activity-calendar__scroll-container {
          max-width: 100%;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          scroll-behavior: smooth;
        }

        .github-contribution-cell {
          cursor: crosshair;
          transform-box: fill-box;
          transform-origin: center;
          transition:
            transform 220ms var(--motion-ease-gentle),
            filter 260ms var(--motion-ease-gentle),
            stroke 220ms var(--motion-ease-gentle);
        }

        .github-contribution-cell:hover,
        .github-contribution-cell:focus-visible {
          filter: drop-shadow(0 0 5px hsl(var(--github-cell-glow)));
          outline: none;
          stroke: hsl(var(--github-cell-ring));
          stroke-width: 1.5px;
          transform: scale(1.18);
        }

        .github-activity-tooltip {
          position: fixed;
          z-index: 80;
          width: max-content;
          max-width: calc(100vw - 24px);
          padding: 7px 10px;
          border: 1px solid hsl(var(--github-tooltip-border));
          border-radius: 6px;
          background: hsl(var(--github-tooltip-background));
          color: hsl(var(--github-tooltip-foreground));
          box-shadow: 0 8px 24px hsl(var(--github-tooltip-shadow));
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          font-size: 12px;
          font-weight: 500;
          line-height: 1.35;
          letter-spacing: 0;
          pointer-events: none;
          transform: translate(-50%, -100%);
          animation: github-tooltip-in 220ms var(--motion-ease-enter) both;
        }

        @keyframes github-tooltip-in {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-100% + 3px)) scale(0.97);
          }

          to {
            opacity: 1;
            transform: translate(-50%, -100%) scale(1);
          }
        }

        .github-activity-calendar
          .react-activity-calendar__scroll-container::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        /*
         * The parent site switches every <article> to black on hover in
         * minimal mode. The GitHub calendar library uses an <article> root,
         * so keep that element transparent and let our shell provide the
         * visible surface instead.
         */
        :root[data-theme="minimal"]
          .site-page
          .github-calendar-shell
          article,
        :root[data-theme="minimal"]
          .site-page
          .github-calendar-shell
          article:hover {
          background-color: transparent !important;
          color: hsl(var(--foreground)) !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }

        :root[data-theme="minimal"] .github-calendar-shell {
          background: rgba(255, 255, 255, 0.92) !important;
          border-color: rgba(0, 0, 0, 0.12) !important;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }

        :root[data-theme="minimal"]
          .github-calendar-shell
          .react-activity-calendar__scroll-container {
          color: rgba(0, 0, 0, 0.72) !important;
        }

        :root[data-theme="minimal"] .github-calendar-shell footer {
          color: rgba(0, 0, 0, 0.72) !important;
        }

        :root[data-theme="minimal"] .github-calendar-shell svg text {
          fill: currentColor !important;
        }

        :root[data-theme="minimal"] .github-activity-tooltip {
          -webkit-backdrop-filter: none;
          backdrop-filter: none;
        }

        /*
         * Measure all rotating categories in one grid cell so the section
         * reserves the tallest required height. The visible category keeps
         * its existing animation; content below it no longer shifts.
         */
        .spotlight-stage {
          display: grid;
          align-items: start;
        }

        .spotlight-stage > * {
          grid-area: 1 / 1;
        }

        .spotlight-measure {
          display: grid;
          pointer-events: none;
          visibility: hidden;
        }

        .spotlight-measure > * {
          grid-area: 1 / 1;
        }

        .spotlight-measure-content .spotlight-item {
          animation: none !important;
        }
        .training-calendar-shell {
          width: 100%;
        }

        .training-activity-calendar {
          width: max-content;
          max-width: 100%;
          margin: 0;
        }

        .training-activity-calendar .react-activity-calendar__scroll-container {
          max-width: 100%;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          scroll-behavior: smooth;
        }

        .training-activity-calendar .react-activity-calendar__scroll-container::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .training-calendar-cell {
          cursor: crosshair;
          transform-box: fill-box;
          transform-origin: center;
          transition:
            transform 220ms var(--motion-ease-gentle),
            filter 260ms var(--motion-ease-gentle),
            stroke 220ms var(--motion-ease-gentle);
        }

        .training-calendar-cell:hover,
        .training-calendar-cell:focus-visible {
          filter: drop-shadow(0 0 5px rgba(175, 145, 255, 0.42));
          outline: none;
          stroke: rgba(210, 195, 255, 0.95);
          stroke-width: 1.5px;
          transform: scale(1.18);
        }

        :root[data-theme="minimal"]
          .site-page
          .training-shell
          article,
        :root[data-theme="minimal"]
          .site-page
          .training-shell
          article:hover {
          background-color: transparent !important;
          color: hsl(var(--foreground)) !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }

        :root[data-theme="minimal"] .training-shell {
          background: rgba(255, 255, 255, 0.92) !important;
          border-color: rgba(0, 0, 0, 0.12) !important;
          backdrop-filter: none;
        }

        :root[data-theme="minimal"] .training-shell article {
          background-color: transparent !important;
          color: hsl(var(--foreground)) !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }

        :root[data-theme="minimal"] .training-shell .react-activity-calendar__scroll-container {
          color: rgba(0, 0, 0, 0.72) !important;
        }

        :root[data-theme="minimal"] .training-shell svg text {
          fill: currentColor !important;
        }

        .training-activity-tooltip {
          position: fixed;
          z-index: 80;
          width: max-content;
          max-width: min(520px, calc(100vw - 24px));
          padding: 8px 11px;
          border: 1px solid hsl(var(--github-tooltip-border));
          border-radius: 6px;
          background: hsl(var(--github-tooltip-background));
          color: hsl(var(--github-tooltip-foreground));
          box-shadow: 0 8px 24px hsl(var(--github-tooltip-shadow));
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          font-size: 12px;
          font-weight: 500;
          line-height: 1.4;
          pointer-events: none;
          transform: translate(-50%, -100%);
          animation: github-tooltip-in 220ms var(--motion-ease-enter) both;
        }

        :root[data-theme="minimal"] .training-activity-tooltip {
          -webkit-backdrop-filter: none;
          backdrop-filter: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .github-contribution-cell {
            transition: none;
          }

          .github-contribution-cell:hover,
          .github-contribution-cell:focus-visible {
            transform: none;
          }

          .github-activity-tooltip,
          .training-activity-tooltip {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
