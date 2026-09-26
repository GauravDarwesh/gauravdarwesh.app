import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";
import { ExternalLink, X } from "lucide-react";

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
/* Book                                                                        */
/* -------------------------------------------------------------------------- */

const Book = ({ post, index, onOpen }: { post: BlogPost; index: number; onOpen: () => void }) => {
  const coverVariants = [
    {
      background: "linear-gradient(145deg, rgba(255,255,255,.19), rgba(255,255,255,.06))",
      line: "rgba(255,255,255,.24)",
    },
    {
      background: "linear-gradient(145deg, rgba(255,255,255,.14), rgba(255,255,255,.035))",
      line: "rgba(255,255,255,.19)",
    },
    {
      background: "linear-gradient(145deg, rgba(255,255,255,.22), rgba(255,255,255,.075))",
      line: "rgba(255,255,255,.27)",
    },
    {
      background: "linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.045))",
      line: "rgba(255,255,255,.18)",
    },
  ];

  const rotations = [
    "-rotate-[1.2deg]",
    "rotate-[0.7deg]",
    "-rotate-[0.5deg]",
    "rotate-[1deg]",
    "-rotate-[0.7deg]",
    "rotate-[0.6deg]",
    "-rotate-[1deg]",
    "rotate-[0.8deg]",
  ];

  const heights = [
    "h-[238px]",
    "h-[255px]",
    "h-[245px]",
    "h-[264px]",
    "h-[250px]",
    "h-[258px]",
    "h-[242px]",
    "h-[252px]",
  ];

  const variant = coverVariants[index % coverVariants.length];

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Read ${post.title}`}
      className={`
        group
        relative
        shrink-0
        w-[122px]
        sm:w-[132px]
        md:w-[140px]
        lg:w-[146px]
        ${heights[index % heights.length]}
        ${rotations[index % rotations.length]}
        transition-transform
        duration-500
        ease-out
        hover:-translate-y-4
        hover:rotate-0
        focus:outline-none
      `}
    >
      {/* Soft shadow beneath the book */}
      <div
        className="
          absolute
          left-1/2
          -translate-x-1/2
          bottom-[-8px]
          w-[82%]
          h-4
          rounded-full
          bg-black/35
          blur-lg
          transition-all
          duration-500
          group-hover:w-[68%]
          group-hover:opacity-70
        "
      />

      {/* Book */}
      <div
        className="
          absolute
          inset-0
          overflow-hidden
          rounded-[5px]
          border
          border-white/20
          shadow-[0_18px_35px_rgba(0,0,0,.26)]
          transition-all
          duration-500
          group-hover:border-white/30
          group-hover:shadow-[0_25px_45px_rgba(0,0,0,.34)]
        "
        style={{
          background: variant.background,
        }}
      >
        {/* Slight page edge */}
        <div
          className="
            absolute
            top-[4px]
            bottom-[4px]
            right-[-3px]
            w-[7px]
            rounded-r-[4px]
            bg-white/[0.07]
            border-r
            border-white/[0.10]
          "
        />

        {/* Inner cover frame */}
        <div
          className="
            absolute
            inset-[9px]
            rounded-[2px]
            border
            border-white/[0.11]
          "
        >
          <div className="absolute left-3 right-3 top-3 h-px" style={{ background: variant.line }} />

          <div className="absolute left-3 right-3 bottom-3 h-px" style={{ background: variant.line }} />

          {/* Book number */}
          <div className="absolute top-4 left-4 text-[8px] tracking-[0.18em] text-white/32">
            {String(index + 1).padStart(2, "0")}
          </div>

          {/* Date */}
          <div className="absolute top-4 right-4 text-[8px] tracking-[0.12em] text-white/28">
            {new Date(post.date).getFullYear()}
          </div>

          {/* Main title */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
            <div
              className="
                font-serif
                text-[15px]
                sm:text-[16px]
                leading-[1.14]
                tracking-[-0.015em]
                text-white/90
                text-left
              "
            >
              {post.displayTitle}
            </div>
          </div>

          {/* Bottom metadata */}
          <div className="absolute left-4 right-4 bottom-4">
            <div className="h-px bg-white/[0.07] mb-2" />

            <div className="text-[7px] uppercase tracking-[0.16em] text-white/30 truncate">{post.tags[0]}</div>
          </div>
        </div>

        {/* Cover sheen */}
        <div
          className="
            absolute
            inset-0
            bg-gradient-to-br
            from-white/[0.12]
            via-transparent
            to-transparent
            opacity-60
            transition-opacity
            duration-500
            group-hover:opacity-100
          "
        />
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Blog                                                                        */
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
  /* Modal scroll lock                                                        */
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
  /* Filter + sort                                                             */
  /* ------------------------------------------------------------------------ */

  const filteredPosts = useMemo(() => {
    const posts =
      selectedTags.length === 0
        ? [...blogPosts]
        : blogPosts.filter((post) => selectedTags.every((tag) => post.tags.includes(tag)));

    posts.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      return sortOrder === "newer" ? dateB - dateA : dateA - dateB;
    });

    return posts;
  }, [selectedTags, sortOrder]);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="site-page min-h-screen w-full relative overflow-hidden">
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
        {/* HEADER — EXACTLY THE ORIGINAL                                     */}
        {/* ------------------------------------------------------------------ */}

        <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="text-center">
            <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
              Thoughts, insights, and stories from my journey in technology, business and beyond.
            </p>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* MAIN                                                                */}
        {/* ------------------------------------------------------------------ */}

        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-40">
          {/* Controls */}
          <div className="mb-16 relative">
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

              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
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
                  `}
                >
                  Clear All
                </button>
              )}

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

            {/* Filter Dropdown */}
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

            {/* Sort Dropdown */}
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
          {/* SINGLE SHELF                                                    */}
          {/* ---------------------------------------------------------------- */}

          <section className="relative">
            {/* Books */}
            <div
              className="
                overflow-x-auto
                overflow-y-visible
                scrollbar-none
                pb-6
              "
            >
              <div
                className="
                  flex
                  items-end
                  justify-center
                  min-w-max
                  px-8
                  gap-2
                  sm:gap-3
                  md:gap-3.5
                "
              >
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
            <div className="relative mx-3 sm:mx-5 md:mx-8">
              <div
                className="
                  h-[10px]
                  rounded-full
                  bg-white/[0.085]
                  border
                  border-white/[0.11]
                  shadow-[0_14px_30px_rgba(0,0,0,.26)]
                "
              />

              <div
                className="
                  absolute
                  left-[8%]
                  right-[8%]
                  top-0
                  h-px
                  bg-white/[0.22]
                  blur-[0.2px]
                "
              />

              <div className="flex justify-between px-5 sm:px-10">
                <div className="w-[4px] h-7 bg-white/[0.055] rounded-b-sm" />
                <div className="w-[4px] h-7 bg-white/[0.055] rounded-b-sm" />
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* Empty state                                                      */}
          {/* ---------------------------------------------------------------- */}

          {filteredPosts.length === 0 && (
            <div className="flex justify-center py-28">
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
      {/* ORIGINAL NOTION MODAL — unchanged                                    */}
      {/* -------------------------------------------------------------------- */}

      {activeNotion && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-md p-4"
          onClick={() => setActiveNotion(null)}
        >
          <div
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 w-full max-w-7xl h-[85vh] border border-white/20 shadow-xl relative"
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
              className="flex items-center gap-2 h-9 px-4 text-[12px] rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 ease-out"
            >
              Visit Notion Page
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;
