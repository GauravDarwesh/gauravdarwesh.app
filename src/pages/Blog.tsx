import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";
import { BookOpen, ExternalLink, Library, SlidersHorizontal, ArrowDownAZ, ArrowUpAZ, X } from "lucide-react";

type BlogPost = {
  date: string;
  title: string;
  description: string;
  tags: string[];
  notionUrl: string;
};

type BookProps = {
  post: BlogPost;
  index: number;
  onOpen: () => void;
};

/* -------------------------------------------------------------------------- */
/* Book                                                                       */
/* -------------------------------------------------------------------------- */

const Book = ({ post, index, onOpen }: BookProps) => {
  const rotations = [-1.5, 0.8, -0.8, 1.2, -1, 0.5, -1.2, 0.7];

  const spineTones = [
    "rgba(255,255,255,0.16)",
    "rgba(255,255,255,0.12)",
    "rgba(255,255,255,0.20)",
    "rgba(255,255,255,0.10)",
    "rgba(255,255,255,0.15)",
    "rgba(255,255,255,0.18)",
    "rgba(255,255,255,0.11)",
    "rgba(255,255,255,0.14)",
  ];

  const shelfHeight = 190 + ((index * 17) % 55);
  const rotation = rotations[index % rotations.length];
  const tone = spineTones[index % spineTones.length];

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Read ${post.title}`}
      className="group/book relative flex-1 min-w-0 focus:outline-none"
      style={{
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Hover glow behind book */}
      <div
        className="
          absolute inset-x-2 bottom-3 top-5
          rounded-xl
          bg-white/[0.06]
          blur-xl
          opacity-0
          scale-75
          transition-all duration-500
          group-hover/book:opacity-100
          group-hover/book:scale-100
        "
      />

      {/* Book */}
      <div
        className="
          relative mx-auto
          w-[78%] sm:w-[72%] lg:w-[68%]
          min-w-[58px]
          max-w-[112px]
          rounded-[5px]
          border border-white/20
          shadow-[0_18px_30px_rgba(0,0,0,0.30)]
          transition-all
          duration-500
          ease-out
          group-hover/book:-translate-y-5
          group-hover/book:scale-[1.035]
          group-hover/book:rotate-[0.5deg]
        "
        style={{
          height: `${shelfHeight}px`,
          background: `
            linear-gradient(
              90deg,
              rgba(255,255,255,0.08) 0%,
              ${tone} 12%,
              ${tone} 82%,
              rgba(0,0,0,0.16) 100%
            )
          `,
        }}
      >
        {/* Spine highlight */}
        <div className="absolute inset-y-0 left-[11%] w-px bg-white/20" />

        {/* Spine shadow */}
        <div className="absolute inset-y-0 right-0 w-[10%] bg-black/10 rounded-r-[5px]" />

        {/* Tiny top/bottom details */}
        <div className="absolute left-[14%] right-[14%] top-3 h-px bg-white/15" />
        <div className="absolute left-[14%] right-[14%] bottom-3 h-px bg-white/15" />

        {/* Title */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 px-1">
          <span
            className="
              block
              text-[10px]
              sm:text-[11px]
              lg:text-[12px]
              leading-[1.15]
              font-medium
              tracking-[0.08em]
              uppercase
              text-white/90
              [writing-mode:vertical-rl]
              rotate-180
              mx-auto
              max-h-[78%]
              overflow-hidden
            "
          >
            {post.title}
          </span>
        </div>

        {/* Date */}
        <span className="absolute bottom-[18px] left-1/2 -translate-x-1/2 text-[8px] tracking-[0.16em] uppercase text-white/40 whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
          {new Date(post.date).getFullYear()}
        </span>

        {/* Little "read" indicator */}
        <span
          className="
            absolute
            -right-3
            top-1/2
            -translate-y-1/2
            flex
            items-center
            justify-center
            w-6
            h-6
            rounded-full
            border border-white/15
            bg-black/30
            backdrop-blur-md
            opacity-0
            translate-x-2
            group-hover/book:opacity-100
            group-hover/book:translate-x-0
            transition-all
            duration-300
          "
        >
          <BookOpen size={11} className="text-white/80" />
        </span>
      </div>

      {/* Bottom shadow/contact */}
      <div
        className="
          absolute
          left-1/2
          -translate-x-1/2
          bottom-[1px]
          w-[72%]
          h-3
          rounded-full
          bg-black/30
          blur-md
          transition-all
          duration-500
          group-hover/book:w-[58%]
          group-hover/book:opacity-60
        "
      />
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Shelf                                                                      */
/* -------------------------------------------------------------------------- */

const Shelf = ({
  books,
  shelfNumber,
  onOpen,
}: {
  books: BlogPost[];
  shelfNumber: number;
  onOpen: (post: BlogPost) => void;
}) => {
  return (
    <section className="relative">
      {/* Shelf label */}
      <div className="flex items-center gap-3 px-1 mb-3">
        <span className="text-[10px] tracking-[0.24em] uppercase text-white/30">
          Shelf {String(shelfNumber).padStart(2, "0")}
        </span>

        <div className="h-px flex-1 bg-white/[0.07]" />
      </div>

      {/* Books area */}
      <div
        className="
          relative
          rounded-t-[18px]
          border-x border-t border-white/[0.09]
          bg-white/[0.018]
          backdrop-blur-[2px]
          px-4
          pt-10
          pb-7
          min-h-[250px]
          sm:min-h-[285px]
          overflow-visible
        "
      >
        {/* Back panel */}
        <div className="absolute inset-0 rounded-t-[18px] pointer-events-none bg-gradient-to-b from-white/[0.035] via-transparent to-transparent" />

        {/* Empty shelf state */}
        {books.length === 0 && (
          <div className="h-[190px] flex items-center justify-center text-white/25 text-sm">Nothing on this shelf.</div>
        )}

        {/* Books */}
        <div className="relative z-10 flex items-end justify-center gap-1 sm:gap-2 h-full">
          {books.map((post, index) => (
            <Book
              key={`${post.title}-${post.date}`}
              post={post}
              index={index + shelfNumber * 3}
              onOpen={() => onOpen(post)}
            />
          ))}
        </div>
      </div>

      {/* Wooden / physical shelf edge */}
      <div
        className="
          relative
          h-5
          rounded-b-[5px]
          border border-white/[0.10]
          bg-white/[0.075]
          shadow-[0_14px_25px_rgba(0,0,0,0.25)]
          overflow-hidden
        "
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20" />
      </div>

      {/* Shelf supports */}
      <div className="flex justify-between px-8 sm:px-14">
        <div className="w-2 h-6 bg-white/[0.06] rounded-b-sm" />
        <div className="w-2 h-6 bg-white/[0.06] rounded-b-sm" />
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Blog                                                                       */
/* -------------------------------------------------------------------------- */

const Blog = () => {
  const [activeNotion, setActiveNotion] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"newer" | "older">("newer");

  const blogPosts: BlogPost[] = [
    {
      date: "August 8, 2020",
      title: "How to Study",
      description:
        "Studying effectively is not about spending more hours, but about learning with intention and clarity.\n\nThis piece breaks down how to focus deeply, understand concepts instead of memorizing, and build systems that actually work.\n\nIf you want to study smarter, retain more, and feel less overwhelmed, this is a practical starting point.",
      tags: ["Learning", "Study", "Focus", "Growth"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//6b8a309db3634687a0fba21a678002f3",
    },
    {
      date: "July 30, 2020",
      title: "How to Make Time for What Matters",
      description:
        "Time is rarely found — it is deliberately created through choices and priorities.\n\nThis post explores how to cut noise, say no without guilt, and align daily actions with what truly matters.\n\nA guide for building a life where your time reflects your values, not your distractions.",
      tags: ["Life", "Time Management", "Priorities", "Growth"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//a8c9599f63d44bc39bfa1eb2bcd4fef4",
    },
    {
      date: "December 29, 2020",
      title: "How to read more Books in the Golden Age of Content",
      description:
        "In today’s world of endless social media and distractions, finding time to read books feels harder than ever. Yet, with the right habits, anyone can finish multiple books a year without feeling overwhelmed. In this post, I’ll share practical tips to read more, enjoy the process, and make books a powerful part of your growth.",
      tags: ["Life", "Books", "Growth"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//af37b2ddb019405c873004b8a91a9137",
    },
    {
      date: "July 26, 2020",
      title: "Learn to Do Anything",
      description:
        "Learning any new skill starts with the courage to try, the patience to practice, and the mindset to embrace mistakes. In this post, I share how taking small opportunities, staying consistent, and welcoming discomfort can shape your growth. These lessons will guide you to build confidence and carve your own career path.",
      tags: ["Career", "Learning", "Growth"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//b4225891b21343bf8328dfce2ba7bd10",
    },
    {
      date: "January 2, 2021",
      title: "How to Set Goals Properly",
      description:
        "Setting goals isn't about ambition alone — it's about clarity, systems, and alignment with who you want to become.\n\nThis post breaks down how to define meaningful goals, turn them into daily actions, and stay flexible without losing direction.\n\nA practical guide to building goals that actually guide your life, not just your intentions.",
      tags: ["Life", "Growth", "Learning"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//dac76e5b23be436c8d730c6e33fcde44",
    },
    {
      date: "July 26, 2020",
      title: "Getting Your Life Back on Track",
      description:
        "Practical ideas for getting yourself back on track. Learn to play both offensively and defensively in life — make the most of good situations and stay calm when things go badly. Rest when needed, learn as many skills as possible, and understand which work habits bring out your best performance.",
      tags: ["Life", "Growth", "Learning"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//beb73ee09f2b42a39bc358e650a82fd4",
    },
    {
      date: "September 8, 2026",
      title: "BE GOOD OR DON’T BE GOOD",
      description: "Thoughts on communication and functioning of society.",
      tags: ["Life", "People", "Communication"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//3d564e75ffe9800a8084eb4f695ac381",
    },
    {
      date: "September 8, 2026",
      title: "Intent",
      description: "The most important factor for success (in my opinion).",
      tags: ["Life", "Work"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd//3d564e75ffe9804394e4da6d10e0fdbe",
    },
  ];

  /* ------------------------------------------------------------------------ */
  /* Body scroll lock                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (activeNotion) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeNotion]);

  /* ------------------------------------------------------------------------ */
  /* Tags                                                                      */
  /* ------------------------------------------------------------------------ */

  const allTags = useMemo(() => Array.from(new Set(blogPosts.flatMap((post) => post.tags))), [blogPosts]);

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]));
  };

  /* ------------------------------------------------------------------------ */
  /* Filter + sort                                                             */
  /* ------------------------------------------------------------------------ */

  const filteredPosts = useMemo(() => {
    const filtered =
      selectedTags.length === 0
        ? [...blogPosts]
        : blogPosts.filter((post) => selectedTags.every((tag) => post.tags.includes(tag)));

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      return sortOrder === "newer" ? dateB - dateA : dateA - dateB;
    });
  }, [selectedTags, sortOrder]);

  /* ------------------------------------------------------------------------ */
  /* Shelves                                                                   */
  /* ------------------------------------------------------------------------ */

  const shelves = useMemo(() => {
    const result: BlogPost[][] = [];

    for (let i = 0; i < filteredPosts.length; i += 4) {
      result.push(filteredPosts.slice(i, i + 4));
    }

    return result;
  }, [filteredPosts]);

  /* ------------------------------------------------------------------------ */
  /* Open book                                                                 */
  /* ------------------------------------------------------------------------ */

  const openBook = (post: BlogPost) => {
    setActiveTitle(post.title);
    setActiveNotion(post.notionUrl);
  };

  const closeReader = () => {
    setActiveNotion(null);
    setActiveTitle("");
  };

  return (
    <div className="site-page relative min-h-screen w-full overflow-hidden">
      <Helmet>
        <title>Notions — Writing by Gaurav Darwesh</title>

        <meta
          name="description"
          content="Essays and notes by Gaurav Darwesh on learning, growth, goals and building with AI."
        />

        <link rel="canonical" href="https://gauravdarwesh.app/blog" />

        <meta property="og:title" content="Notions — Writing by Gaurav Darwesh" />

        <meta
          property="og:description"
          content="Essays and notes by Gaurav Darwesh on learning, growth, goals and building with AI."
        />

        <meta property="og:url" content="https://gauravdarwesh.app/blog" />
      </Helmet>

      <NavigationToggle
        isModalOpen={!!activeNotion}
        onCloseModal={closeReader}
        isBlurred={filterOpen || sortOpen || !!activeNotion}
      />

      <main className="relative z-10 min-h-screen">
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}

        <header className="px-5 sm:px-8 lg:px-12 pt-24 sm:pt-28 pb-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
              <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04]">
                    <Library size={17} className="text-white/65" />
                  </div>

                  <span className="text-[11px] uppercase tracking-[0.28em] text-white/40">Personal Library</span>
                </div>

                <h1
                  className="
                    text-4xl
                    sm:text-5xl
                    lg:text-6xl
                    font-semibold
                    tracking-[-0.04em]
                    text-white
                  "
                >
                  Notions
                </h1>

                <p
                  className="
                    mt-5
                    max-w-2xl
                    text-base
                    sm:text-lg
                    leading-relaxed
                    text-white/60
                  "
                >
                  Thoughts, ideas, stories, and lessons collected over time. Pick a book from the shelf.
                </p>
              </div>

              {/* Library count */}
              <div className="flex items-center gap-3 text-white/45 text-xs">
                <BookOpen size={15} />
                <span>
                  {filteredPosts.length} {filteredPosts.length === 1 ? "volume" : "volumes"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* Library controls                                                    */}
        {/* ------------------------------------------------------------------ */}

        <section className="px-5 sm:px-8 lg:px-12 pb-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setFilterOpen((current) => !current);
                    setSortOpen(false);
                  }}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    h-9
                    px-4
                    rounded-full
                    border
                    border-white/10
                    bg-white/[0.05]
                    text-xs
                    text-white/70
                    transition-all
                    duration-300
                    hover:bg-white/[0.09]
                    hover:text-white
                  "
                  aria-expanded={filterOpen}
                >
                  <SlidersHorizontal size={13} />
                  Filter
                  {selectedTags.length > 0 && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white/15 text-[10px] text-white">
                      {selectedTags.length}
                    </span>
                  )}
                </button>

                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />

                    <div className="absolute left-0 top-12 z-50 w-[min(90vw,420px)] rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-4 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs uppercase tracking-[0.16em] text-white/45">Browse by theme</span>

                        {selectedTags.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedTags([])}
                            className="text-[11px] text-white/45 hover:text-white transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {allTags.map((tag) => {
                          const active = selectedTags.includes(tag);

                          return (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`
                                px-3
                                py-1.5
                                rounded-full
                                text-[11px]
                                border
                                transition-all
                                duration-200
                                ${
                                  active
                                    ? "bg-white/15 border-white/20 text-white"
                                    : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.07] hover:text-white/80"
                                }
                              `}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Selected filters */}
              {selectedTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    h-9
                    px-3
                    rounded-full
                    border
                    border-white/10
                    bg-white/[0.04]
                    text-[11px]
                    text-white/65
                    hover:bg-white/[0.08]
                    transition-all
                  "
                >
                  {tag}
                  <X size={11} />
                </button>
              ))}

              {/* Sort */}
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSortOpen((current) => !current);
                    setFilterOpen(false);
                  }}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    h-9
                    px-4
                    rounded-full
                    border
                    border-white/10
                    bg-white/[0.05]
                    text-xs
                    text-white/70
                    transition-all
                    duration-300
                    hover:bg-white/[0.09]
                    hover:text-white
                  "
                  aria-expanded={sortOpen}
                >
                  {sortOrder === "newer" ? <ArrowDownAZ size={13} /> : <ArrowUpAZ size={13} />}

                  {sortOrder === "newer" ? "Newest" : "Oldest"}
                </button>

                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />

                    <div className="absolute right-0 top-12 z-50 min-w-[160px] rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-2 shadow-2xl">
                      <button
                        type="button"
                        onClick={() => {
                          setSortOrder("newer");
                          setSortOpen(false);
                        }}
                        className={`
                          flex
                          items-center
                          gap-3
                          w-full
                          px-3
                          py-2.5
                          rounded-xl
                          text-xs
                          text-left
                          transition-colors
                          ${
                            sortOrder === "newer"
                              ? "bg-white/10 text-white"
                              : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                          }
                        `}
                      >
                        <ArrowDownAZ size={14} />
                        Newest first
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOrder("older");
                          setSortOpen(false);
                        }}
                        className={`
                          flex
                          items-center
                          gap-3
                          w-full
                          px-3
                          py-2.5
                          rounded-xl
                          text-xs
                          text-left
                          transition-colors
                          ${
                            sortOrder === "older"
                              ? "bg-white/10 text-white"
                              : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                          }
                        `}
                      >
                        <ArrowUpAZ size={14} />
                        Oldest first
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Library                                                             */}
        {/* ------------------------------------------------------------------ */}

        <section className="px-5 sm:px-8 lg:px-12 pb-40">
          <div className="max-w-6xl mx-auto">
            {shelves.length > 0 ? (
              <div className="space-y-16 sm:space-y-20">
                {shelves.map((books, shelfIndex) => (
                  <Shelf key={shelfIndex} books={books} shelfNumber={shelfIndex + 1} onOpen={openBook} />
                ))}
              </div>
            ) : (
              <div className="min-h-[300px] flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.025]">
                <Library size={28} className="text-white/25 mb-4" />

                <p className="text-sm text-white/45">No books match these filters.</p>

                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="mt-4 text-xs text-white/60 hover:text-white underline underline-offset-4 transition-colors"
                >
                  Return all books to the shelves
                </button>
              </div>
            )}

            {/* Bottom library note */}
            <div className="mt-20 pt-7 border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
                <span className="text-[10px] tracking-[0.22em] uppercase text-white/30">
                  The Gaurav Darwesh Library
                </span>
              </div>

              <span className="text-[11px] text-white/25">Click a book to read it</span>
            </div>
          </div>
        </section>
      </main>

      {/* -------------------------------------------------------------------- */}
      {/* Notion Reader                                                        */}
      {/* -------------------------------------------------------------------- */}

      {activeNotion && (
        <div
          className="
            fixed
            inset-0
            z-[60]
            flex
            flex-col
            items-center
            justify-center
            bg-black/60
            backdrop-blur-xl
            p-3
            sm:p-5
          "
          onClick={closeReader}
        >
          <div
            className="
              w-full
              max-w-7xl
              h-[90vh]
              rounded-[22px]
              border
              border-white/10
              bg-black/20
              backdrop-blur-xl
              shadow-[0_25px_80px_rgba(0,0,0,0.45)]
              overflow-hidden
              relative
            "
            onClick={(event) => event.stopPropagation()}
          >
            {/* Reader header */}
            <div className="absolute top-0 left-0 right-0 z-10 h-14 flex items-center justify-between px-4 sm:px-5 border-b border-white/[0.06] bg-black/25 backdrop-blur-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                  <BookOpen size={13} className="text-white/60" />
                </div>

                <span className="text-xs text-white/60 truncate max-w-[55vw]">{activeTitle}</span>
              </div>

              <button
                type="button"
                onClick={closeReader}
                aria-label="Close reader"
                className="
                  flex
                  items-center
                  justify-center
                  w-8
                  h-8
                  rounded-full
                  border
                  border-white/10
                  bg-white/[0.04]
                  text-white/60
                  hover:text-white
                  hover:bg-white/[0.08]
                  transition-all
                "
              >
                <X size={15} />
              </button>
            </div>

            {/* Notion */}
            <div className="w-full h-full pt-14">
              <iframe
                title={activeTitle || "Notion article"}
                src={activeNotion}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>

          <div className="mt-3">
            <a
              href={activeNotion}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex
                items-center
                gap-2
                h-9
                px-4
                rounded-full
                border
                border-white/10
                bg-white/[0.05]
                text-[11px]
                text-white/65
                backdrop-blur-md
                hover:bg-white/[0.09]
                hover:text-white
                transition-all
              "
            >
              Visit Notion Page
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;
