import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";
import { ExternalLink } from "lucide-react";

const Blog = () => {
  const [activeNotion, setActiveNotion] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"newer" | "older">("newer");
  const [sortOpen, setSortOpen] = useState(false);
  const [isSortAnimating, setIsSortAnimating] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (activeNotion) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to reset overflow when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeNotion]);

  const blogPosts = [
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
      notionUrl:
        "https://olive-zircon-d34.notion.site/ebd//af37b2ddb019405c873004b8a91a9137",
    },
    {
      date: "July 26, 2020",
      title: "Learn to Do Anything",
      description:
        "Learning any new skill starts with the courage to try, the patience to practice, and the mindset to embrace mistakes. In this post, I share how taking small opportunities, staying consistent, and welcoming discomfort can shape your growth. These lessons will guide you to build confidence and carve your own career path.",
      tags: ["Career", "Learning", "Growth"],
      notionUrl:
        "https://olive-zircon-d34.notion.site/ebd//b4225891b21343bf8328dfce2ba7bd10",
    },
    {
      date: "January 2, 2021",
      title: "How to Set Goals Properly",
      description:
        "Setting goals isn't about ambition alone — it's about clarity, systems, and alignment with who you want to become.\n\nThis post breaks down how to define meaningful goals, turn them into daily actions, and stay flexible without losing direction.\n\nA practical guide to building goals that actually guide your life, not just your intentions.",
      tags: ["Life", "Growth", "Learning"],
      notionUrl:
        "https://olive-zircon-d34.notion.site/ebd//dac76e5b23be436c8d730c6e33fcde44",
    },
  ];

  const allTags = Array.from(new Set(blogPosts.flatMap((post) => post.tags)));

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const filteredPosts = (
    selectedTags.length === 0
      ? blogPosts
      : blogPosts.filter((post) =>
          selectedTags.every((tag) => post.tags.includes(tag))
        )
  ).sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === "newer" ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle 
        isModalOpen={!!activeNotion} 
        onCloseModal={() => setActiveNotion(null)}
        isBlurred={filterOpen || sortOpen || !!activeNotion}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="text-center">
            <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
              Thoughts, insights, and stories from my journey in technology,
              business and beyond.
            </p>
          </div>
        </div>

        {/* Blog Posts Section */}
        <div>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-40">
            {/* Filter Section */}
            <div className="mb-8 relative">
              <div className="flex items-center gap-3 flex-wrap justify-start">
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
                    }
                  }}
                  className={`h-9 px-4 text-[12px] rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 ease-out ${filterOpen ? 'relative z-[57]' : ''}`}
                  aria-expanded={filterOpen}
                  aria-controls="blog-filter-dropdown"
                >
                  Filter
                </button>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className={`h-9 px-4 text-[12px] rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-700 ease-out ${filterOpen ? 'relative z-[57]' : ''}`}
                  >
                    Clear All
                  </button>
                )}

                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className={`flex items-center gap-2 h-9 px-3 text-[12px] rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm ${filterOpen ? 'relative z-[57]' : ''}`}
                  >
                    {tag}
                    <button
                      onClick={() => toggleTag(tag)}
                      className="text-white/70 hover:text-white"
                    >
                      ✕
                    </button>
                  </span>
                ))}

                {/* Sort Button */}
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
                    }
                  }}
                  className={`ml-auto h-9 px-4 text-[12px] rounded-full bg-white/10 text-white border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 ease-out ${sortOpen ? 'relative z-[57]' : ''}`}
                  aria-expanded={sortOpen}
                  aria-controls="blog-sort-dropdown"
                >
                  Sort by
                </button>
              </div>

              {/* Shared overlay for filter or sort */}
              {(filterOpen || sortOpen) && (
                <div
                  className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[55] transition-all duration-300 ease-out ${
                    (isAnimating || isSortAnimating) ? 'opacity-0' : 'opacity-100'
                  }`}
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
                  className={`absolute mt-3 left-0 z-[56] bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg w-full max-w-lg transition-all duration-300 ease-out ${
                    isAnimating 
                      ? 'opacity-0 scale-95 translate-y-2' 
                      : 'opacity-100 scale-100 translate-y-0'
                  }`}
                >
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-all duration-200 border hover:scale-105 ${
                          selectedTags.includes(tag)
                            ? "bg-white/30 text-white border-white/30"
                            : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                        }`}
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
                  className={`absolute mt-3 right-0 z-[56] bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg transition-all duration-300 ease-out ${
                    isSortAnimating 
                      ? 'opacity-0 scale-95 translate-y-2' 
                      : 'opacity-100 scale-100 translate-y-0'
                  }`}
                >
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSortOrder("newer"); setIsSortAnimating(true); setTimeout(() => { setSortOpen(false); setIsSortAnimating(false); }, 300); }}
                      className={`px-3 py-1 rounded-full text-sm transition-all duration-200 border hover:scale-105 ${
                        sortOrder === "newer"
                          ? "bg-white/30 text-white border-white/30"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      Newer
                    </button>
                    <button
                      onClick={() => { setSortOrder("older"); setIsSortAnimating(true); setTimeout(() => { setSortOpen(false); setIsSortAnimating(false); }, 300); }}
                      className={`px-3 py-1 rounded-full text-sm transition-all duration-200 border hover:scale-105 ${
                        sortOrder === "older"
                          ? "bg-white/30 text-white border-white/30"
                          : "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                      }`}
                    >
                      Older
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-12">
              {filteredPosts.map((post, idx) => (
                <article
                  key={idx}
                  onClick={() => setActiveNotion(post.notionUrl)}
                  className="cursor-pointer bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition"
                >
                  <div className="mb-4">
                    <span className="text-white/70 text-sm">{post.date}</span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-2 mb-3">
                      {post.title}
                    </h2>
                    <p className="text-white/90 leading-relaxed text-base sm:text-lg">
                      {post.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Glassmorphism Modal for Notion */}
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