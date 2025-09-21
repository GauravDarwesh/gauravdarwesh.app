import React, { useState } from "react";
import NavigationToggle from "@/components/NavigationToggle";

const Blog = () => {
  const [activeNotion, setActiveNotion] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
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

  const allTags = Array.from(new Set(blogPosts.flatMap((post) => post.tags)));

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const filteredPosts =
    selectedTags.length === 0
      ? blogPosts
      : blogPosts.filter((post) =>
          selectedTags.every((tag) => post.tags.includes(tag))
        );

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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-40">
            {/* Elegant Filter Section */}
            <div className="mb-12 relative">
              <div className="flex items-center gap-4 flex-wrap justify-center">
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
                  className={`h-11 px-6 text-sm font-medium rounded-elegant bg-glass-medium backdrop-blur-elegant text-foreground border border-card-border shadow-elegant-md hover:bg-glass-strong hover:scale-105 transition-all duration-300 ease-elegant ${filterOpen ? 'relative z-40' : ''}`}
                  aria-expanded={filterOpen}
                  aria-controls="blog-filter-dropdown"
                >
                  Filter Articles
                </button>
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className={`h-11 px-6 text-sm font-medium rounded-elegant bg-glass-subtle border border-card-border text-foreground/80 hover:bg-glass-medium hover:scale-105 transition-all duration-300 ease-elegant ${filterOpen ? 'relative z-40' : ''}`}
                  >
                    Clear Filters
                  </button>
                )}

                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className={`flex items-center gap-2 h-11 px-4 text-sm font-medium rounded-elegant bg-gradient-accent text-accent-foreground border border-accent/20 shadow-elegant-sm ${filterOpen ? 'relative z-40' : ''}`}
                  >
                    {tag}
                    <button
                      onClick={() => toggleTag(tag)}
                      className="text-accent-foreground/70 hover:text-accent-foreground"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {filterOpen && (
                <>
                  {/* Elegant Blur overlay */}
                  <div
                    className={`fixed inset-0 bg-background/60 backdrop-blur-md z-20 transition-all duration-300 ease-elegant ${
                      isAnimating ? 'opacity-0' : 'opacity-100'
                    }`}
                    onClick={() => {
                      setIsAnimating(true);
                      setTimeout(() => {
                        setFilterOpen(false);
                        setIsAnimating(false);
                      }, 300);
                    }}
                  />

                  {/* Enhanced Dropdown */}
                  <div 
                    id="blog-filter-dropdown" 
                    className={`absolute mt-4 left-1/2 -translate-x-1/2 z-30 bg-glass-strong backdrop-blur-elegant rounded-elegant p-6 border border-card-border shadow-elegant-lg w-full max-w-2xl transition-all duration-300 ease-elegant ${
                      isAnimating 
                        ? 'opacity-0 scale-95 translate-y-2' 
                        : 'opacity-100 scale-100 translate-y-0'
                    }`}
                  >
                    <h3 className="font-playfair text-lg font-semibold text-foreground mb-4 text-center">
                      Filter by Topics
                    </h3>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-elegant border hover:scale-105 active:scale-95 ${
                            selectedTags.includes(tag)
                              ? "bg-gradient-primary text-primary-foreground border-primary/30 shadow-elegant-md"
                              : "bg-glass-subtle text-foreground/80 border-card-border hover:bg-glass-medium hover:border-primary/20"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Elegant Blog Posts Grid */}
            <div className="space-y-8">
              {filteredPosts.map((post, idx) => (
                <article
                  key={idx}
                  onClick={() => setActiveNotion(post.notionUrl)}
                  className="group cursor-pointer bg-glass-medium backdrop-blur-elegant rounded-elegant p-8 border border-card-border hover:bg-glass-strong hover:border-primary/20 hover:shadow-elegant-lg hover:scale-[1.02] transition-all duration-500 ease-elegant"
                >
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-foreground/60 text-sm font-medium font-inter">{post.date}</span>
                      <div className="w-6 h-6 rounded-full bg-glass-subtle border border-card-border group-hover:bg-primary group-hover:border-primary transition-all duration-300" />
                    </div>
                    <h2 className="font-playfair text-2xl md:text-3xl font-bold text-foreground mt-3 mb-4 group-hover:text-primary transition-colors duration-300">
                      {post.title}
                    </h2>
                    <p className="text-foreground/80 leading-relaxed text-base md:text-lg font-inter">
                      {post.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-glass-subtle border border-card-border text-foreground/70 text-sm rounded-full font-medium group-hover:border-primary/30 transition-colors duration-300"
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

      {/* Elegant Modal for Notion */}
      {activeNotion && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-elegant"
          onClick={() => setActiveNotion(null)}
        >
          <div
            className="bg-glass-strong backdrop-blur-elegant rounded-elegant p-6 w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 border border-card-border shadow-elegant-lg animate-fade-in-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-playfair text-xl font-semibold text-foreground">Article</h3>
              <button
                onClick={() => setActiveNotion(null)}
                className="w-8 h-8 rounded-full bg-glass-medium border border-card-border text-foreground/70 hover:text-foreground hover:bg-glass-strong transition-all duration-200"
              >
                ✕
              </button>
            </div>
            <iframe
              src={activeNotion}
              width="100%"
              height="600"
              frameBorder="0"
              allowFullScreen
              className="rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;