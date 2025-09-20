import React, { useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";

const Blog = () => {
  const [activeNotion, setActiveNotion] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const blogPosts = [
    {
      date: "March 15, 2024",
      title: "Building AI-Powered Solutions: Lessons from My Internship",
      description:
        "During my time at Jio Platforms, I had the opportunity to work on cutting-edge AI systems for improving wireless network coverage. Here are the key insights I gained about implementing machine learning in real-world scenarios...",
      tags: ["AI", "Machine Learning", "Internship"],
      notionUrl: "https://olive-zircon-d34.notion.site/placeholder1",
    },
    {
      date: "February 28, 2024",
      title: "From Engineering to Data Science: My Career Transition",
      description:
        "Making the leap from traditional engineering to data science wasn't easy, but it's been one of the most rewarding decisions of my career. In this post, I share the challenges I faced and the strategies that helped me succeed...",
      tags: ["Career", "Data Science", "Transition"],
      notionUrl: "https://olive-zircon-d34.notion.site/placeholder2",
    },
    {
      date: "December 29, 2020",
      title: "How to read more Books in the Golden Age of Content",
      description:
        "In today’s world of endless social media and distractions, finding time to read books feels harder than ever. Yet, with the right habits, anyone can finish multiple books a year without feeling overwhelmed. In this post, I’ll share practical tips to read more, enjoy the process, and make books a powerful part of your growth.",
      tags: ["Life", "Books", "Growth"],
      notionUrl: "https://olive-zircon-d34.notion.site/ebd/af37b2ddb019405c873004b8a91a9137",
    },
    {
      date: "July 26, 2020",
      title: "Learn to Do Anything",
      description:
        "Learning any new skill starts with the courage to try, the patience to practice, and the mindset to embrace mistakes. In this post, I share how taking small opportunities, staying consistent, and welcoming discomfort can shape your growth. These lessons will guide you to build confidence and carve your own career path.",
      tags: ["Career", "Learning", "Growth"],
      notionUrl:
        "https://olive-zircon-d34.notion.site/ebd/b4225891b21343bf8328dfce2ba7bd10",
    },
  ];

  // collect unique tags
  const allTags = Array.from(new Set(blogPosts.flatMap((p) => p.tags)));

  // filter logic (multiple tags)
  const filteredPosts =
    selectedTags.length > 0
      ? blogPosts.filter((post) =>
          selectedTags.every((tag) => post.tags.includes(tag))
        )
      : blogPosts;

  // toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
      <NavigationToggle />

      {/* Filter Button (Top Right) */}
      <div className="fixed top-6 right-6 z-30">
        <div
          className={`relative origin-top-right transition-transform duration-300 ease-out ${
            filterOpen ? "scale-100" : "scale-100"
          }`}
        >
          <button
            onClick={() => setFilterOpen((prev) => !prev)}
            className="bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 text-white text-sm shadow-lg hover:bg-white/30 transition"
          >
            {filterOpen ? "Close" : "Filter"}
          </button>

          {/* Expanding Tags */}
          <div
            className={`absolute top-full right-0 mt-3 transform origin-top-right transition-all duration-300 ease-out ${
              filterOpen
                ? "scale-100 opacity-100 translate-x-0 translate-y-0"
                : "scale-75 opacity-0 -translate-x-6 -translate-y-6"
            }`}
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 w-56 border border-white/20 shadow-xl">
              <h3 className="text-white/90 mb-3 text-sm font-semibold text-center">
                Select Tags
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {allTags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer transition backdrop-blur-sm border border-white/20 ${
                      selectedTags.includes(tag)
                        ? "bg-white/30 text-white font-semibold"
                        : "bg-white/10 text-white/80 hover:bg-white/20"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <div className="text-center">
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Thoughts, insights, and stories from my journey in technology,
              business and beyond.
            </p>
          </div>
        </div>

        {/* Blog Posts Section */}
        <div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="space-y-12">
              {filteredPosts.map((post, idx) => (
                <article
                  key={idx}
                  onClick={() => setActiveNotion(post.notionUrl)}
                  className="cursor-pointer bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition"
                >
                  <div className="mb-4">
                    <span className="text-white/70 text-sm">{post.date}</span>
                    <h2 className="text-2xl font-bold text-white mt-2 mb-3">
                      {post.title}
                    </h2>
                    <p className="text-white/90 leading-relaxed">
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setActiveNotion(null)}
        >
          <div
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 w-11/12 md:w-3/4 lg:w-2/3 border border-white/20 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={activeNotion}
              width="100%"
              height="600"
              frameBorder="0"
              allowFullScreen
              className="rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;