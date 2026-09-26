import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";
import { ExternalLink } from "lucide-react";

type BlogPost = {
  date: string;
  title: string;
  displayTitle: string;
  description: string;
  tags: string[];
  notionUrl: string;
};

const blogPosts: BlogPost[] = [
  {
    date: "August 8, 2020",
    title: "How to Study",
    displayTitle: "How to Study",
    description:
      "Studying effectively is not about spending more hours, but about learning with intention and clarity.\n\nThis piece breaks down how to focus deeply, understand concepts instead of memorizing, and build systems that actually work.\n\nIf you want to study smarter, retain more, and feel less overwhelmed, this is a practical starting point.",
    tags: ["Learning", "Study", "Focus", "Growth"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//6b8a309db3634687a0fba21a678002f3",
  },
  {
    date: "July 30, 2020",
    title: "How to Make Time for What Matters",
    displayTitle: "Make Time for What Matters",
    description:
      "Time is rarely found — it is deliberately created through choices and priorities.\n\nThis post explores how to cut noise, say no without guilt, and align daily actions with what truly matters.\n\nA guide for building a life where your time reflects your values, not your distractions.",
    tags: ["Life", "Time Management", "Priorities", "Growth"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//a8c9599f63d44bc39bfa1eb2bcd4fef4",
  },
  {
    date: "December 29, 2020",
    title: "How to read more Books in the Golden Age of Content",
    displayTitle: "Read More in the Age of Content",
    description:
      "In today’s world of endless social media and distractions, finding time to read books feels harder than ever. Yet, with the right habits, anyone can finish multiple books a year without feeling overwhelmed. In this post, I’ll share practical tips to read more, enjoy the process, and make books a powerful part of your growth.",
    tags: ["Life", "Books", "Growth"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//af37b2ddb019405c873004b8a91a9137",
  },
  {
    date: "July 26, 2020",
    title: "Learn to Do Anything",
    displayTitle: "Learn to Do Anything",
    description:
      "Learning any new skill starts with the courage to try, the patience to practice, and the mindset to embrace mistakes. In this post, I share how taking small opportunities, staying consistent, and welcoming discomfort can shape your growth. These lessons will guide you to build confidence and carve your own career path.",
    tags: ["Career", "Learning", "Growth"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//b4225891b21343bf8328dfce2ba7bd10",
  },
  {
    date: "January 2, 2021",
    title: "How to Set Goals Properly",
    displayTitle: "Set Goals Properly",
    description:
      "Setting goals isn't about ambition alone — it's about clarity, systems, and alignment with who you want to become.\n\nThis post breaks down how to define meaningful goals, turn them into daily actions, and stay flexible without losing direction.\n\nA practical guide to building goals that actually guide your life, not just your intentions.",
    tags: ["Life", "Growth", "Learning"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//dac76e5b23be436c8d730c6e33fcde44",
  },
  {
    date: "July 26, 2020",
    title: "Getting Your Life Back on Track",
    displayTitle: "Get Your Life Back on Track",
    description:
      "Practical ideas for getting yourself back on track. Learn to play both offensively and defensively in life — make the most of good situations and stay calm when things go badly. Rest when needed, learn as many skills as possible, and understand which work habits bring out your best performance.",
    tags: ["Life", "Growth", "Learning"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//beb73ee09f2b42a39bc358e650a82fd4",
  },
  {
    date: "September 8, 2026",
    title: "BE GOOD OR DON’T BE GOOD",
    displayTitle: "BE GOOD OR DON’T BE GOOD",
    description: "Thoughts on communication and functioning of society.",
    tags: ["Life", "People", "Communication"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//3d564e75ffe9800a8084eb4f695ac381",
  },
  {
    date: "September 8, 2026",
    title: "Intent",
    displayTitle: "Intent",
    description: "The most important factor for success (in my opinion).",
    tags: ["Life", "Work"],
    notionUrl: "https://olive-zircon-d34.notion.site/ebd//3d564e75ffe9804394e4da6d10e0fdbe",
  },
];

/* -------------------------------------------------------------------------- */
/* BOOK                                                                        */
/* -------------------------------------------------------------------------- */

const Book = ({ post, index, onOpen }: { post: BlogPost; index: number; onOpen: () => void }) => {
  const heights = [218, 242, 228, 250, 235, 246, 222, 238];

  const rotations = [-1, 0.5, -0.5, 0.8, -0.7, 0.4, -0.8, 0.6];

  const backgrounds = [
    "linear-gradient(150deg, rgba(255,255,255,.18), rgba(255,255,255,.055))",
    "linear-gradient(150deg, rgba(255,255,255,.13), rgba(255,255,255,.035))",
    "linear-gradient(150deg, rgba(255,255,255,.20), rgba(255,255,255,.06))",
    "linear-gradient(150deg, rgba(255,255,255,.115), rgba(255,255,255,.04))",
  ];

  const height = heights[index % heights.length];
  const rotation = rotations[index % rotations.length];
  const background = backgrounds[index % backgrounds.length];

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Read ${post.title}`}
      className="
        group
        relative
        flex-1
        min-w-0
        max-w-[145px]
        h-[250px]
        sm:h-[275px]
        md:h-[295px]
        lg:h-[310px]
        focus:outline-none
      "
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "bottom center",
        zIndex: index + 1,
      }}
    >
      {/* Shadow */}
      <div
        className="
          absolute
          left-1/2
          bottom-[2px]
          -translate-x-1/2
          w-[76%]
          h-3
          rounded-full
          bg-black/35
          blur-lg
          opacity-70
          transition-all
          duration-500
          group-hover:w-[65%]
          group-hover:opacity-45
        "
      />

      {/* Book */}
      <div
        className="
          absolute
          left-1/2
          bottom-[10px]
          -translate-x-1/2
          w-[76%]
          h-[var(--book-height)]
          rounded-[4px]
          overflow-hidden
          shadow-[0_18px_35px_rgba(0,0,0,.24)]
          transition-all
          duration-500
          ease-[cubic-bezier(.22,1,.36,1)]
          group-hover:-translate-y-5
          group-hover:shadow-[0_25px_42px_rgba(0,0,0,.30)]
        "
        style={
          {
            "--book-height": `${height}px`,
            background,
          } as React.CSSProperties
        }
      >
        {/* Minimal book depth */}
        <div className="absolute inset-y-0 left-0 w-[5px] bg-black/[0.08]" />

        <div className="absolute inset-y-0 right-0 w-[4px] bg-black/[0.08]" />

        {/* Cover */}
        <div className="absolute inset-[9px] rounded-[2px] border border-white/[0.075]">
          {/* Number */}
          <span className="absolute top-3 left-3 text-[7px] tracking-[0.18em] text-white/25">
            {String(index + 1).padStart(2, "0")}
          </span>

          {/* Year */}
          <span className="absolute top-3 right-3 text-[7px] tracking-[0.12em] text-white/22">
            {new Date(post.date).getFullYear()}
          </span>

          {/* Title */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
            <span
              className="
                block
                font-serif
                text-[14px]
                sm:text-[15px]
                md:text-[16px]
                leading-[1.13]
                tracking-[-0.02em]
                text-white/[0.88]
                text-left
              "
            >
              {post.displayTitle}
            </span>
          </div>
        </div>

        {/* Soft light */}
        <div
          className="
            absolute
            inset-0
            pointer-events-none
            bg-gradient-to-br
            from-white/[0.09]
            via-transparent
            to-transparent
            opacity-70
            group-hover:opacity-100
            transition-opacity
            duration-500
          "
        />
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* BLOG                                                                        */
/* -------------------------------------------------------------------------- */

const Blog = () => {
  const [activeNotion, setActiveNotion] = useState<string | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [sortOrder, setSortOrder] = useState<"newer" | "older">("newer");

  const [sortOpen, setSortOpen] = useState(false);
  const [isSortAnimating, setIsSortAnimating] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Prevent background scrolling when Notion modal is open                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (activeNotion) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeNotion]);

  /* ------------------------------------------------------------------------ */
  /* Tags                                                                      */
  /* ------------------------------------------------------------------------ */

  const allTags = useMemo(() => Array.from(new Set(blogPosts.flatMap((post) => post.tags))), []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Filter + Sort                                                             */
  /* ------------------------------------------------------------------------ */

  const filteredPosts = useMemo(() => {
    const posts =
      selectedTags.length === 0
        ? [...blogPosts]
        : blogPosts.filter((post) => selectedTags.every((tag) => post.tags.includes(tag)));

    return posts.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      return sortOrder === "newer" ? dateB - dateA : dateA - dateB;
    });
  }, [selectedTags, sortOrder]);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="site-page blog-page min-h-screen w-full relative overflow-x-hidden">
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

      <h1 className="sr-only">Notions — writing by Gaurav Darwesh</h1>

      <NavigationToggle
        isModalOpen={!!activeNotion}
        onCloseModal={() => setActiveNotion(null)}
        isBlurred={filterOpen || sortOpen || !!activeNotion}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ------------------------------------------------------------------ */}
        {/* ORIGINAL TAGLINE — UNCHANGED                                      */}
        {/* ------------------------------------------------------------------ */}

        <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="text-center">
            <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
              Thoughts, insights, and stories from my journey in technology, business and beyond.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* CONTENT                                                            */}
        {/* ------------------------------------------------------------------ */}

        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-40">
          {/* ---------------------------------------------------------------- */}
          {/* FILTERS                                                          */}
          {/* ---------------------------------------------------------------- */}

          <div className="mb-12 relative">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter */}
              <button
                onClick={() => {
                  if (filterOpen) {
                    setIsAnimating(true);

                    setTimeout(() => {
                      setFilterOpen(false);
                      setIsAnimating(false);
                    }, 300);
                  } else {
                    setFilterOpen(true);
                    setSortOpen(false);
                  }
                }}
                className={`
                  h-9
                  px-4
                  text-[12px]
                  rounded-full
                  bg-white/10
                  text-white
                  border
                  border-white/20
                  backdrop-blur-sm
                  hover:bg-white/20
                  transition-all
                  duration-300
                  ${filterOpen ? "relative z-[57]" : ""}
                `}
                aria-expanded={filterOpen}
                aria-controls="blog-filter-dropdown"
              >
                Filter
              </button>

              {/* Clear */}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="
                    h-9
                    px-4
                    text-[12px]
                    rounded-full
                    bg-white/10
                    text-white
                    border
                    border-white/20
                    backdrop-blur-sm
                    hover:bg-white/20
                    transition-all
                  "
                >
                  Clear All
                </button>
              )}

              {/* Selected filters */}
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="
                    flex
                    items-center
                    gap-2
                    h-9
                    px-3
                    text-[12px]
                    rounded-full
                    bg-white/10
                    text-white
                    border
                    border-white/20
                    backdrop-blur-sm
                  "
                >
                  {tag}

                  <button onClick={() => toggleTag(tag)} className="text-white/70 hover:text-white">
                    ✕
                  </button>
                </span>
              ))}

              {/* Sort */}
              <button
                onClick={() => {
                  if (sortOpen) {
                    setIsSortAnimating(true);

                    setTimeout(() => {
                      setSortOpen(false);
                      setIsSortAnimating(false);
                    }, 300);
                  } else {
                    setSortOpen(true);
                    setFilterOpen(false);
                  }
                }}
                className={`
                  ml-auto
                  h-9
                  px-4
                  text-[12px]
                  rounded-full
                  bg-white/10
                  text-white
                  border
                  border-white/20
                  backdrop-blur-sm
                  hover:bg-white/20
                  transition-all
                  duration-300
                  ${sortOpen ? "relative z-[57]" : ""}
                `}
                aria-expanded={sortOpen}
                aria-controls="blog-sort-dropdown"
              >
                Sort by
              </button>
            </div>

            {/* Overlay */}
            {(filterOpen || sortOpen) && (
              <div
                className={`
                  fixed
                  inset-0
                  bg-black/40
                  backdrop-blur-sm
                  z-[55]
                  transition-all
                  duration-300
                  ${isAnimating || isSortAnimating ? "opacity-0" : "opacity-100"}
                `}
                onClick={() => {
                  if (filterOpen) {
                    setIsAnimating(true);

                    setTimeout(() => {
                      setFilterOpen(false);
                      setIsAnimating(false);
                    }, 300);
                  }

                  if (sortOpen) {
                    setIsSortAnimating(true);

                    setTimeout(() => {
                      setSortOpen(false);
                      setIsSortAnimating(false);
                    }, 300);
                  }
                }}
              />
            )}

            {/* Filter dropdown */}
            {filterOpen && (
              <div
                id="blog-filter-dropdown"
                className={`
                  absolute
                  mt-3
                  left-0
                  z-[56]
                  bg-white/10
                  backdrop-blur-md
                  rounded-2xl
                  p-4
                  border
                  border-white/20
                  shadow-lg
                  w-full
                  max-w-lg
                  transition-all
                  duration-300
                  ${isAnimating ? "opacity-0 scale-95 translate-y-2" : "opacity-100 scale-100 translate-y-0"}
                `}
              >
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`
                        px-3
                        py-1
                        rounded-full
                        text-sm
                        transition-all
                        duration-200
                        border
                        hover:scale-105
                        ${
                          selectedTags.includes(tag)
                            ? "bg-white/30 text-white border-white/30"
                            : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                        }
                      `}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort dropdown */}
            {sortOpen && (
              <div
                id="blog-sort-dropdown"
                className={`
                  absolute
                  mt-3
                  right-0
                  z-[56]
                  bg-white/10
                  backdrop-blur-md
                  rounded-2xl
                  p-4
                  border
                  border-white/20
                  shadow-lg
                  transition-all
                  duration-300
                  ${isSortAnimating ? "opacity-0 scale-95 translate-y-2" : "opacity-100 scale-100 translate-y-0"}
                `}
              >
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSortOrder("newer");
                      setIsSortAnimating(true);

                      setTimeout(() => {
                        setSortOpen(false);
                        setIsSortAnimating(false);
                      }, 300);
                    }}
                    className={`
                      px-3
                      py-1
                      rounded-full
                      text-sm
                      transition-all
                      duration-200
                      border
                      hover:scale-105
                      ${
                        sortOrder === "newer"
                          ? "bg-white/30 text-white border-white/30"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                      }
                    `}
                  >
                    Newer
                  </button>

                  <button
                    onClick={() => {
                      setSortOrder("older");
                      setIsSortAnimating(true);

                      setTimeout(() => {
                        setSortOpen(false);
                        setIsSortAnimating(false);
                      }, 300);
                    }}
                    className={`
                      px-3
                      py-1
                      rounded-full
                      text-sm
                      transition-all
                      duration-200
                      border
                      hover:scale-105
                      ${
                        sortOrder === "older"
                          ? "bg-white/30 text-white border-white/30"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                      }
                    `}
                  >
                    Older
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* SINGLE SEAMLESS SHELF                                            */}
          {/* ---------------------------------------------------------------- */}

          <section className="relative pt-8">
            {/* Books */}
            <div className="relative z-10 w-full px-1 sm:px-2">
              <div className="flex items-end justify-center w-full gap-0">
                {filteredPosts.map((post, index) => (
                  <Book
                    key={`${post.title}-${post.date}`}
                    post={post}
                    index={index}
                    onOpen={() => setActiveNotion(post.notionUrl)}
                  />
                ))}
              </div>
            </div>

            {/* Shelf */}
            <div className="relative z-0 -mt-[1px] px-3 sm:px-6">
              {/* The shelf itself — NO TOP LINE */}
              <div
                className="
                  h-[9px]
                  rounded-[4px]
                  bg-white/[0.075]
                  shadow-[0_16px_30px_rgba(0,0,0,.30)]
                "
              />

              {/* Under-shelf shadow */}
              <div
                className="
                  absolute
                  left-[12%]
                  right-[12%]
                  top-[9px]
                  h-4
                  rounded-full
                  bg-black/[0.12]
                  blur-md
                "
              />

              {/* supports */}
              <div className="flex justify-between px-7 sm:px-16">
                <div className="w-[3px] h-6 rounded-b-full bg-white/[0.045]" />
                <div className="w-[3px] h-6 rounded-b-full bg-white/[0.045]" />
              </div>
            </div>
          </section>

          {/* Empty state */}
          {filteredPosts.length === 0 && (
            <div className="flex justify-center py-24">
              <button
                onClick={() => setSelectedTags([])}
                className="
                  text-sm
                  text-white/45
                  hover:text-white
                  transition-colors
                "
              >
                No articles match these filters. Clear filters.
              </button>
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* NOTION MODAL — SAME AS ORIGINAL                                      */}
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
            bg-black/50
            backdrop-blur-md
            p-4
          "
          onClick={() => setActiveNotion(null)}
        >
          <div
            className="
              bg-white/10
              backdrop-blur-lg
              rounded-2xl
              p-4
              w-full
              max-w-7xl
              h-[85vh]
              border
              border-white/20
              shadow-xl
              relative
            "
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              title="Notion article"
              src={activeNotion}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              className="rounded-xl w-full h-full"
            />
          </div>

          <div className="mt-4">
            <a
              href={activeNotion}
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex
                items-center
                gap-2
                h-9
                px-4
                text-[12px]
                rounded-full
                bg-white/10
                text-white
                border
                border-white/20
                backdrop-blur-sm
                hover:bg-white/20
                transition-all
                duration-300
                ease-out
              "
            >
              Visit Notion Page
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* HIDE SCROLLBARS WITHOUT DISABLING PAGE SCROLLING                      */}
      {/* -------------------------------------------------------------------- */}

      <style>
        {`
          .blog-page {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .blog-page::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
        `}
      </style>
    </div>
  );
};

export default Blog;
