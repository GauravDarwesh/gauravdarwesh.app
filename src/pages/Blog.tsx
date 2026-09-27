```tsx
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
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//6b8a309db3634687a0fba21a678002f3",
  },
  {
    date: "July 30, 2020",
    title: "How to Make Time for What Matters",
    displayTitle: "Make Time for What Matters",
    description:
      "Time is rarely found — it is deliberately created through choices and priorities.\n\nThis post explores how to cut noise, say no without guilt, and align daily actions with what truly matters.\n\nA guide for building a life where your time reflects your values, not your distractions.",
    tags: ["Life", "Time Management", "Priorities", "Growth"],
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//a8c9599f63d44bc39bfa1eb2bcd4fef4",
  },
  {
    date: "December 29, 2020",
    title: "How to read more Books in the Golden Age of Content",
    displayTitle: "Read More in the Age of Content",
    description:
      "In today’s world of endless social media and distractions, finding time to read books feels harder than ever. Yet, with the right habits, anyone can finish multiple books a year without feeling overwhelmed. In this post, I’ll share practical tips to read more, enjoy the process, and make books a powerful part of your growth.",
    tags: ["Life", "Books", "Growth"],
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//af37b2ddb019405c873004b8a91a9137",
  },
  {
    date: "July 26, 2020",
    title: "Learn to Do Anything",
    displayTitle: "Learn to Do Anything",
    description:
      "Learning any new skill starts with the courage to try, the patience to practice, and the mindset to embrace mistakes. In this post, I share how taking small opportunities, staying consistent, and welcoming discomfort can shape your growth. These lessons will guide you to build confidence and carve your own career path.",
    tags: ["Career", "Learning", "Growth"],
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//b4225891b21343bf8328dfce2ba7bd10",
  },
  {
    date: "January 2, 2021",
    title: "How to Set Goals Properly",
    displayTitle: "Set Goals Properly",
    description:
      "Setting goals isn't about ambition alone — it's about clarity, systems, and alignment with who you want to become.\n\nThis post breaks down how to define meaningful goals, turn them into daily actions, and stay flexible without losing direction.\n\nA practical guide to building goals that actually guide your life, not just your intentions.",
    tags: ["Life", "Growth", "Learning"],
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//dac76e5b23be436c8d730c6e33fcde44",
  },
  {
    date: "July 26, 2020",
    title: "Getting Your Life Back on Track",
    displayTitle: "Get Your Life Back on Track",
    description:
      "Practical ideas for getting yourself back on track. Learn to play both offensively and defensively in life — make the most of good situations and stay calm when things go badly. Rest when needed, learn as many skills as possible, and understand which work habits bring out your best performance.",
    tags: ["Life", "Growth", "Learning"],
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//beb73ee09f2b42a39bc358e650a82fd4",
  },
  {
    date: "September 8, 2026",
    title: "BE GOOD OR DON’T BE GOOD",
    displayTitle: "BE GOOD OR DON’T BE GOOD",
    description: "Thoughts on communication and functioning of society.",
    tags: ["Life", "People", "Communication"],
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//3d564e75ffe980a0a8084eb4f695ac381",
  },
  {
    date: "September 8, 2026",
    title: "Intent",
    displayTitle: "Intent",
    description: "The most important factor for success (in my opinion).",
    tags: ["Life", "Work"],
    notionUrl:
      "https://olive-zircon-d34.notion.site/ebd//3d564e75ffe9804394e4da6d10e0fdbe",
  },
];

/* -------------------------------------------------------------------------- */
/* BOOK                                                                       */
/* -------------------------------------------------------------------------- */

const Book = ({
  post,
  index,
  onOpen,
}: {
  post: BlogPost;
  index: number;
  onOpen: () => void;
}) => {
  const heights = [224, 246, 234, 252, 240, 248, 228, 242];

  const rotations = [-1.1, 0.7, -0.5, 0.9, -0.8, 0.5, -0.9, 0.7];

  const backgrounds = [
    "linear-gradient(145deg, rgba(255,255,255,.17), rgba(255,255,255,.055))",
    "linear-gradient(145deg, rgba(255,255,255,.13), rgba(255,255,255,.035))",
    "linear-gradient(145deg, rgba(255,255,255,.20), rgba(255,255,255,.06))",
    "linear-gradient(145deg, rgba(255,255,255,.115), rgba(255,255,255,.04))",
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
        shrink-0
        self-end
        w-[82px]
        xs:w-[90px]
        sm:w-[108px]
        md:w-[124px]
        lg:w-[136px]
        xl:w-[142px]
        focus:outline-none
        touch-manipulation
        transform-gpu
        will-change-transform
      "
      style={{
        height: `clamp(${Math.max(height - 34, 194)}px, ${height}px, ${height}px)`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "bottom center",
        zIndex: index + 1,
      }}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Ground shadow                                                       */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="
          pointer-events-none
          absolute
          bottom-[-5px]
          left-1/2
          -translate-x-1/2
          w-[72%]
          h-2
          rounded-full
          bg-black/30
          blur-md
          opacity-60
          transition-all
          duration-700
          ease-[cubic-bezier(.22,1,.36,1)]
          group-hover:w-[65%]
          group-hover:opacity-40
        "
      />

      {/* ------------------------------------------------------------------ */}
      {/* Book                                                                */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="
          absolute
          inset-0
          overflow-hidden
          rounded-[5px]
          border
          border-white/[0.11]
          bg-white/[0.04]
          shadow-[0_16px_32px_rgba(0,0,0,.20)]
          transform-gpu
          transition-[transform,box-shadow,border-color]
          duration-700
          ease-[cubic-bezier(.22,1,.36,1)]
          group-hover:-translate-y-2
          group-hover:shadow-[0_24px_42px_rgba(0,0,0,.28)]
          group-hover:border-white/[0.20]
        "
        style={{
          background,
          backfaceVisibility: "hidden",
        }}
      >
        {/* Spine */}
        <div
          className="
            pointer-events-none
            absolute
            inset-y-0
            left-0
            w-[5px]
            bg-black/[0.075]
          "
        />

        {/* Edge */}
        <div
          className="
            pointer-events-none
            absolute
            inset-y-0
            right-0
            w-[4px]
            bg-black/[0.075]
          "
        />

        {/* Inner cover */}
        <div
          className="
            absolute
            inset-[8px]
            rounded-[2px]
            border
            border-white/[0.07]
          "
        >
          {/* Number / year */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center">
            <span className="text-[6px] sm:text-[7px] tracking-[0.16em] text-white/25">
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="text-[6px] sm:text-[7px] tracking-[0.12em] text-white/22">
              {new Date(post.date).getFullYear()}
            </span>
          </div>

          {/* Title */}
          <div className="absolute inset-x-3 sm:inset-x-4 top-1/2 -translate-y-1/2">
            <span
              className="
                block
                font-serif
                text-[11px]
                sm:text-[13px]
                md:text-[15px]
                lg:text-[16px]
                leading-[1.12]
                tracking-[-0.018em]
                text-white/[0.86]
                text-left
              "
            >
              {post.displayTitle}
            </span>
          </div>

          {/* Bottom detail */}
          <div className="absolute left-3 sm:left-4 right-3 sm:right-4 bottom-2.5 sm:bottom-3">
            <div className="h-px bg-white/[0.065] mb-1.5 sm:mb-2" />

            <span className="block text-[6px] sm:text-[7px] uppercase tracking-[0.15em] text-white/24 truncate">
              {post.tags[0]}
            </span>
          </div>
        </div>

        {/* Cover reflection */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-br
            from-white/[0.075]
            via-transparent
            to-transparent
            opacity-60
            transition-opacity
            duration-700
            ease-out
            group-hover:opacity-100
          "
        />
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* SHELF                                                                      */
/* -------------------------------------------------------------------------- */

const Shelf = ({
  posts,
  onOpen,
}: {
  posts: BlogPost[];
  onOpen: (url: string) => void;
}) => {
  return (
    <section
      className="
        relative
        w-full
        isolate
        transform-gpu
      "
      aria-label="Writing shelf"
    >
      {/* -------------------------------------------------------------- */}
      {/* Book stage                                                      */}
      {/* -------------------------------------------------------------- */}

      <div
        className="
          relative
          w-full
          overflow-x-auto
          overflow-y-visible
          scrollbar-none
          overscroll-x-contain
          touch-pan-x
        "
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div
          className="
            flex
            items-end
            justify-center
            min-w-max
            w-full
            px-5
            sm:px-8
            md:px-10
            lg:px-12
            pt-10
            pb-4
            gap-[1px]
            sm:gap-[2px]
            md:gap-[3px]
            transform-gpu
          "
        >
          {posts.map((post, index) => (
            <Book
              key={`${post.title}-${post.date}`}
              post={post}
              index={index}
              onOpen={() => onOpen(post.notionUrl)}
            />
          ))}
        </div>
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Shelf itself                                                    */}
      {/* -------------------------------------------------------------- */}

      <div
        className="
          relative
          mx-auto
          w-[calc(100%-32px)]
          sm:w-[calc(100%-56px)]
          md:w-[calc(100%-80px)]
          lg:w-[calc(100%-96px)]
          mt-[-1px]
          pointer-events-none
        "
      >
        {/* Main shelf */}
        <div
          className="
            relative
            h-[8px]
            sm:h-[9px]
            rounded-full
            bg-white/[0.065]
            shadow-[0_10px_24px_rgba(0,0,0,.22)]
          "
        >
          {/* top edge */}
          <div
            className="
              absolute
              inset-x-[8%]
              top-0
              h-px
              rounded-full
              bg-white/[0.15]
            "
          />

          {/* soft inner light */}
          <div
            className="
              absolute
              inset-x-[14%]
              top-[1px]
              h-px
              bg-white/[0.05]
              blur-[1px]
            "
          />
        </div>

        {/* Underside */}
        <div
          className="
            absolute
            inset-x-[12%]
            top-[8px]
            h-[3px]
            rounded-b-full
            bg-black/[0.10]
            blur-[2px]
          "
        />

        {/* Supports */}
        <div
          className="
            flex
            justify-between
            px-[10%]
            sm:px-[12%]
          "
        >
          <div
            className="
              w-[2px]
              h-[16px]
              sm:h-[20px]
              rounded-b-full
              bg-white/[0.035]
            "
          />

          <div
            className="
              w-[2px]
              h-[16px]
              sm:h-[20px]
              rounded-b-full
              bg-white/[0.035]
            "
          />
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* BLOG                                                                       */
/* -------------------------------------------------------------------------- */

const Blog = () => {
  const [activeNotion, setActiveNotion] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"newer" | "older">("newer");
  const [sortOpen, setSortOpen] = useState(false);
  const [isSortAnimating, setIsSortAnimating] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Modal scroll lock                                                      */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Tags                                                                    */
  /* ---------------------------------------------------------------------- */

  const allTags = useMemo(
    () => Array.from(new Set(blogPosts.flatMap((post) => post.tags))),
    []
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
    );
  };

  /* ---------------------------------------------------------------------- */
  /* Filtering / sorting                                                     */
  /* ---------------------------------------------------------------------- */

  const filteredPosts = useMemo(() => {
    const posts =
      selectedTags.length === 0
        ? [...blogPosts]
        : blogPosts.filter((post) =>
            selectedTags.every((tag) => post.tags.includes(tag))
          );

    return posts.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      return sortOrder === "newer" ? dateB - dateA : dateA - dateB;
    });
  }, [selectedTags, sortOrder]);

  /* ---------------------------------------------------------------------- */
  /* Dropdown closing                                                       */
  /* ---------------------------------------------------------------------- */

  const closeFilters = () => {
    if (!filterOpen) return;

    setIsAnimating(true);

    window.setTimeout(() => {
      setFilterOpen(false);
      setIsAnimating(false);
    }, 260);
  };

  const closeSort = () => {
    if (!sortOpen) return;

    setIsSortAnimating(true);

    window.setTimeout(() => {
      setSortOpen(false);
      setIsSortAnimating(false);
    }, 260);
  };

  return (
    <div
      className="
        site-page
        relative
        min-h-screen
        w-full
        overflow-x-hidden
      "
    >
      <Helmet>
        <title>Notions — Writing by Gaurav Darwesh</title>

        <meta
          name="description"
          content="Essays and notes by Gaurav Darwesh on learning, growth, goals and building with AI."
        />

        <link
          rel="canonical"
          href="https://gauravdarwesh.app/blog"
        />

        <meta
          property="og:title"
          content="Notions — Writing by Gaurav Darwesh"
        />

        <meta
          property="og:description"
          content="Essays and notes by Gaurav Darwesh on learning, growth, goals and building with AI."
        />

        <meta
          property="og:url"
          content="https://gauravdarwesh.app/blog"
        />
      </Helmet>

      <h1 className="sr-only">
        Notions — writing by Gaurav Darwesh
      </h1>

      <NavigationToggle
        isModalOpen={!!activeNotion}
        onCloseModal={() => setActiveNotion(null)}
        isBlurred={filterOpen || sortOpen || !!activeNotion}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}

        <header
          className="
            flex
            flex-col
            items-center
            justify-center
            px-5
            sm:px-6
            lg:px-8
            pt-24
            sm:pt-28
            pb-10
            sm:pb-12
          "
        >
          <div className="text-center max-w-2xl">
            <p
              className="
                text-sm
                sm:text-base
                lg:text-lg
                text-white/80
                leading-relaxed
                tracking-[-0.01em]
              "
            >
              Thoughts, insights, and stories from my journey in technology,
              business and beyond.
            </p>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Main                                                              */}
        {/* ---------------------------------------------------------------- */}

        <main
          className="
            w-full
            max-w-6xl
            mx-auto
            px-4
            sm:px-6
            lg:px-8
            pb-32
            sm:pb-40
          "
        >
          {/* -------------------------------------------------------------- */}
          {/* Controls                                                        */}
          {/* -------------------------------------------------------------- */}

          <div className="mb-10 sm:mb-14 relative">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              {/* Filter */}
              <button
                type="button"
                onClick={() => {
                  if (filterOpen) {
                    closeFilters();
                  } else {
                    setFilterOpen(true);
                    setSortOpen(false);
                  }
                }}
                className={`
                  h-9
                  px-3.5
                  sm:px-4
                  text-[11px]
                  sm:text-[12px]
                  rounded-full
                  bg-white/[0.075]
                  text-white/90
                  border
                  border-white/[0.14]
                  backdrop-blur-md
                  hover:bg-white/[0.13]
                  hover:border-white/[0.20]
                  transition-all
                  duration-500
                  ease-[cubic-bezier(.22,1,.36,1)]
                  ${
                    filterOpen
                      ? "relative z-[57] bg-white/[0.15]"
                      : ""
                  }
                `}
                aria-expanded={filterOpen}
                aria-controls="blog-filter-dropdown"
              >
                Filter
              </button>

              {/* Clear */}
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  className="
                    h-9
                    px-3.5
                    sm:px-4
                    text-[11px]
                    sm:text-[12px]
                    rounded-full
                    bg-white/[0.075]
                    text-white/80
                    border
                    border-white/[0.14]
                    backdrop-blur-md
                    hover:bg-white/[0.13]
                    hover:text-white
                    transition-all
                    duration-500
                  "
                >
                  Clear All
                </button>
              )}

              {/* Active tags */}
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="
                    flex
                    items-center
                    gap-2
                    h-9
                    px-3
                    text-[11px]
                    sm:text-[12px]
                    rounded-full
                    bg-white/[0.075]
                    text-white/85
                    border
                    border-white/[0.14]
                    backdrop-blur-md
                  "
                >
                  {tag}

                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="
                      text-white/45
                      hover:text-white
                      transition-colors
                      duration-300
                    "
                    aria-label={`Remove ${tag} filter`}
                  >
                    ×
                  </button>
                </span>
              ))}

              {/* Sort */}
              <button
                type="button"
                onClick={() => {
                  if (sortOpen) {
                    closeSort();
                  } else {
                    setSortOpen(true);
                    setFilterOpen(false);
                  }
                }}
                className={`
                  ml-auto
                  h-9
                  px-3.5
                  sm:px-4
                  text-[11px]
                  sm:text-[12px]
                  rounded-full
                  bg-white/[0.075]
                  text-white/90
                  border
                  border-white/[0.14]
                  backdrop-blur-md
                  hover:bg-white/[0.13]
                  hover:border-white/[0.20]
                  transition-all
                  duration-500
                  ease-[cubic-bezier(.22,1,.36,1)]
                  ${
                    sortOpen
                      ? "relative z-[57] bg-white/[0.15]"
                      : ""
                  }
                `}
                aria-expanded={sortOpen}
                aria-controls="blog-sort-dropdown"
              >
                Sort by
              </button>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Dropdown overlay                                               */}
            {/* ------------------------------------------------------------ */}

            {(filterOpen || sortOpen) && (
              <div
                className={`
                  fixed
                  inset-0
                  bg-black/35
                  backdrop-blur-[3px]
                  z-[55]
                  transition-opacity
                  duration-300
                  ${
                    isAnimating || isSortAnimating
                      ? "opacity-0"
                      : "opacity-100"
                  }
                `}
                onClick={() => {
                  if (filterOpen) closeFilters();
                  if (sortOpen) closeSort();
                }}
              />
            )}

            {/* ------------------------------------------------------------ */}
            {/* Filter dropdown                                                */}
            {/* ------------------------------------------------------------ */}

            {filterOpen && (
              <div
                id="blog-filter-dropdown"
                className={`
                  absolute
                  mt-3
                  left-0
                  z-[56]
                  w-full
                  max-w-lg
                  p-4
                  rounded-2xl
                  bg-black/20
                  backdrop-blur-xl
                  border
                  border-white/[0.14]
                  shadow-[0_20px_60px_rgba(0,0,0,.25)]
                  transition-all
                  duration-300
                  ease-[cubic-bezier(.22,1,.36,1)]
                  ${
                    isAnimating
                      ? "opacity-0 scale-[.97] translate-y-1"
                      : "opacity-100 scale-100 translate-y-0"
                  }
                `}
              >
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`
                        px-3
                        py-1.5
                        rounded-full
                        text-xs
                        transition-all
                        duration-300
                        border
                        ${
                          selectedTags.includes(tag)
                            ? "bg-white/[0.20] text-white border-white/[0.24]"
                            : "bg-white/[0.06] text-white/70 border-white/[0.12] hover:bg-white/[0.12] hover:text-white"
                        }
                      `}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------ */}
            {/* Sort dropdown                                                  */}
            {/* ------------------------------------------------------------ */}

            {sortOpen && (
              <div
                id="blog-sort-dropdown"
                className={`
                  absolute
                  mt-3
                  right-0
                  z-[56]
                  p-4
                  rounded-2xl
                  bg-black/20
                  backdrop-blur-xl
                  border
                  border-white/[0.14]
                  shadow-[0_20px_60px_rgba(0,0,0,.25)]
                  transition-all
                  duration-300
                  ease-[cubic-bezier(.22,1,.36,1)]
                  ${
                    isSortAnimating
                      ? "opacity-0 scale-[.97] translate-y-1"
                      : "opacity-100 scale-100 translate-y-0"
                  }
                `}
              >
                <div className="flex gap-2">
                  {(["newer", "older"] as const).map((order) => (
                    <button
                      key={order}
                      type="button"
                      onClick={() => {
                        setSortOrder(order);
                        setIsSortAnimating(true);

                        window.setTimeout(() => {
                          setSortOpen(false);
                          setIsSortAnimating(false);
                        }, 260);
                      }}
                      className={`
                        px-3
                        py-1.5
                        rounded-full
                        text-xs
                        border
                        transition-all
                        duration-300
                        ${
                          sortOrder === order
                            ? "bg-white/[0.20] text-white border-white/[0.24]"
                            : "bg-white/[0.06] text-white/70 border-white/[0.12] hover:bg-white/[0.12] hover:text-white"
                        }
                      `}
                    >
                      {order === "newer" ? "Newer" : "Older"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------- */}
          {/* SHELF                                                            */}
          {/* -------------------------------------------------------------- */}

          <Shelf
            posts={filteredPosts}
            onOpen={(url) => setActiveNotion(url)}
          />

          {/* -------------------------------------------------------------- */}
          {/* Empty state                                                     */}
          {/* -------------------------------------------------------------- */}

          {filteredPosts.length === 0 && (
            <div className="flex justify-center py-24">
              <button
                type="button"
                onClick={() => setSelectedTags([])}
                className="
                  text-sm
                  text-white/45
                  hover:text-white
                  transition-colors
                  duration-300
                "
              >
                No articles match these filters. Clear filters.
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* NOTION MODAL                                                        */}
      {/* ------------------------------------------------------------------ */}

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
            p-3
            sm:p-4
          "
          onClick={() => setActiveNotion(null)}
        >
          <div
            className="
              relative
              w-full
              max-w-7xl
              h-[88vh]
              sm:h-[85vh]
              rounded-2xl
              bg-white/[0.08]
              backdrop-blur-xl
              border
              border-white/[0.15]
              shadow-[0_30px_100px_rgba(0,0,0,.35)]
              p-2
              sm:p-4
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

          <div className="mt-3 sm:mt-4">
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
                text-[11px]
                sm:text-[12px]
                rounded-full
                bg-white/[0.08]
                text-white
                border
                border-white/[0.14]
                backdrop-blur-md
                hover:bg-white/[0.14]
                transition-all
                duration-500
                ease-[cubic-bezier(.22,1,.36,1)]
              "
            >
              Visit Notion Page
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Scrollbar removal                                                   */}
      {/* ------------------------------------------------------------------ */}

      <style>
        {`
          .scrollbar-none::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }

          .scrollbar-none {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Blog;
```
