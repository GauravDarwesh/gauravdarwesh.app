import NavigationToggle from "@/components/NavigationToggle";

const Blog = () => {
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
              Thoughts, insights, and stories from my journey in technology, business and beyond.
            </p>
          </div>
        </div>

        {/* Blog Posts Section */}

        {/* Blog Post 4 - Embedded Notion Page */}
<article className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
  <div className="mb-4">
    <span className="text-white/70 text-sm">September 20, 2025</span>
    <h2 className="text-2xl font-bold text-white mt-2 mb-3">
      Learn to do anything
    </h2>
    <p className="text-white/90 leading-relaxed mb-4">
      Explore my curated Notion page that captures step-by-step guides, frameworks, 
      and methods to quickly pick up new skills.
    </p>

    {/* Embedded Notion Page */}
    <div className="rounded-xl overflow-hidden border border-white/20">
      <iframe
        src="https://olive-zircon-d34.notion.site/ebd/b4225891b21343bf8328dfce2ba7bd10"
        width="100%"
        height="600"
        className="w-full rounded-xl"
        style={{ background: "transparent" }}
        frameBorder="0"
        allowFullScreen
      />
    </div>
  </div>
  <div className="flex flex-wrap gap-2 mt-4">
    <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Notion</span>
    <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Learning</span>
    <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Guides</span>
  </div>
</article>



        
        <div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="space-y-12">
              {/* Blog Post 1 */}
              <article className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
                <div className="mb-4">
                  <span className="text-white/70 text-sm">March 15, 2024</span>
                  <h2 className="text-2xl font-bold text-white mt-2 mb-3">
                    Building AI-Powered Solutions: Lessons from My Internship
                  </h2>
                  <p className="text-white/90 leading-relaxed">
                    During my time at Jio Platforms, I had the opportunity to work on cutting-edge AI systems 
                    for improving wireless network coverage. Here are the key insights I gained about implementing 
                    machine learning in real-world scenarios...
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">AI</span>
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Machine Learning</span>
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Internship</span>
                </div>
              </article>

              {/* Blog Post 2 */}
              <article className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
                <div className="mb-4">
                  <span className="text-white/70 text-sm">February 28, 2024</span>
                  <h2 className="text-2xl font-bold text-white mt-2 mb-3">
                    From Engineering to Data Science: My Career Transition
                  </h2>
                  <p className="text-white/90 leading-relaxed">
                    Making the leap from traditional engineering to data science wasn't easy, but it's been 
                    one of the most rewarding decisions of my career. In this post, I share the challenges 
                    I faced and the strategies that helped me succeed...
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Career</span>
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Data Science</span>
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Transition</span>
                </div>
              </article>

              {/* Blog Post 3 */}
              <article className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition">
                <div className="mb-4">
                  <span className="text-white/70 text-sm">February 10, 2024</span>
                  <h2 className="text-2xl font-bold text-white mt-2 mb-3">
                    The Power of Open Source: Contributing to the Developer Community
                  </h2>
                  <p className="text-white/90 leading-relaxed">
                    Open source software has shaped my career in countless ways. From learning new technologies 
                    to collaborating with developers worldwide, here's why I believe every developer should 
                    contribute to open source projects...
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Open Source</span>
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Community</span>
                  <span className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full">Development</span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
