import React, { useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";

const Blog = () => {
  const [activeNotion, setActiveNotion] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const blogPosts = [
    {
      date: "March 15, 2024",
      title: "Building AI-Powered Solutions: Lessons from My Internship",
      description:
        "During my time at Jio Platforms, I had the opportunity to work on cutting-edge AI systems for improving wireless network coverage. Here are the key insights I gained about implementing machine learning in real-world scenarios...",
      tags: ["AI", "Machine Learning", "Internship"],
      notionUrl: "https://olive-zircon-d34.notion.site/placeholder1", // replace with real notion
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
      notionUrl:
        "https://olive-zircon-d34.notion.site/ebd/af37b2ddb019405c873004b8a91a9137",
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

  // Collect all unique tags
  const allTags = Array.from(new Set(blogPosts.flatMap((post) => post.tags)));

  // Filtered posts
  const filteredPosts = selectedTag
    ? blogPosts.filter((post) => post.tags.includes(selectedTag))
    : blogPosts;

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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="text-center">
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Thoughts, insights, and stories from my journey in technology,
              business and beyond.
            </p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full text-sm transition ${
                selectedTag === null
                  ? "bg-white/20 text-white font-semibold"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              All
            </button>
            {allTags.map((tag, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  selectedTag === tag
                    ? "bg-white/20 text-white font-semibold"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {tag}
              </button>
            ))}
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
              {filteredPosts.length === 0 && (
                <p className="text-center text-white/70">
                  No blogs found for this tag.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Glassmorphism Modal for Notion */}
      {activeNotion && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm"
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
