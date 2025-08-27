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
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center mb-8">
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Thoughts, insights, and stories from my journey in technology, business and beyond.
            </p>
          </div>
        </div>

        {/* Blog Posts Section */}
        <div className="bg-black/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="space-y-12">
              {/* Blog Post 1 */}
              <article className="bg-white rounded-lg p-6 shadow-md">
                <div className="mb-4">
                  <span className="text-gray-600 text-sm">March 15, 2024</span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">
                    Building AI-Powered Solutions: Lessons from My Internship
                  </h2>
                  <p className="text-gray-800 leading-relaxed">
                    During my time at Jio Platforms, I had the opportunity to work on cutting-edge AI systems 
                    for improving wireless network coverage. Here are the key insights I gained about implementing 
                    machine learning in real-world scenarios...
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">AI</span>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Machine Learning</span>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Internship</span>
                </div>
              </article>

              {/* Blog Post 2 */}
              <article className="bg-white rounded-lg p-6 shadow-md">
                <div className="mb-4">
                  <span className="text-gray-600 text-sm">February 28, 2024</span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">
                    From Engineering to Data Science: My Career Transition
                  </h2>
                  <p className="text-gray-800 leading-relaxed">
                    Making the leap from traditional engineering to data science wasn't easy, but it's been 
                    one of the most rewarding decisions of my career. In this post, I share the challenges 
                    I faced and the strategies that helped me succeed...
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Career</span>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Data Science</span>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Transition</span>
                </div>
              </article>

              {/* Blog Post 3 */}
              <article className="bg-white rounded-lg p-6 shadow-md">
                <div className="mb-4">
                  <span className="text-gray-600 text-sm">February 10, 2024</span>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">
                    The Power of Open Source: Contributing to the Developer Community
                  </h2>
                  <p className="text-gray-800 leading-relaxed">
                    Open source software has shaped my career in countless ways. From learning new technologies 
                    to collaborating with developers worldwide, here's why I believe every developer should 
                    contribute to open source projects...
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Open Source</span>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Community</span>
                  <span className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">Development</span>
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
