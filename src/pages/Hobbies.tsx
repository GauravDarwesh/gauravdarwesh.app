import NavigationToggle from "@/components/NavigationToggle";

const Portfolio = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden">
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
      <div className="relative z-10 max-w-3xl w-full px-4 sm:px-6 md:px-8 text-left space-y-14 overflow-y-scroll no-scrollbar pt-20 sm:pt-28">
        
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 shadow-lg border border-white/10">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-orange-300 via-yellow-200 to-white bg-clip-text text-transparent">
            Gaurav Darwesh
          </h1>
          <div className="flex flex-wrap gap-4 text-orange-100 mt-3 text-sm sm:text-base">
            <a href="mailto:gauravdarwesh155@gmail.com" className="hover:underline">mail/</a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank" className="hover:underline">in/</a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank" className="hover:underline">twitter/</a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank" className="hover:underline">instagram/</a>
          </div>
        </div>

        {/* About */}
        <section className="backdrop-blur-lg bg-white/5 rounded-2xl p-6 shadow-md border border-white/10">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-orange-200">About</h2>
          <p className="text-base sm:text-lg leading-relaxed text-white/90">
            I am a Cambridge University graduate in Strategic Business and Management, 
            with a Bachelor of Engineering in Computer Science (AIML) from the University of Mumbai. 
            Currently working at Nasdaq, with prior experience at notable MNC like Jio. 
            Proficient in Jira, Salesforce, ServiceNow, Planhat, Power BI, and Excel, I specialize in developing 
            innovative solutions that drive business growth and operational efficiency.
          </p>
        </section>

        {/* Education */}
        <section className="backdrop-blur-md bg-white/5 rounded-xl p-6 border border-white/10 hover:shadow-lg transition-all duration-500">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-200">Education</h2>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-white">University of Mumbai</h3>
                <span className="text-sm italic text-white/70">Dec 2021 – Jun 2025</span>
              </div>
              <p className="text-sm text-white/80">B.E. in Computer Science & Engineering (AI & ML), 8.6 CGPA</p>
            </div>

            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-white">University of Cambridge</h3>
                <span className="text-sm italic text-white/70">Oct 2023 – Jul 2024</span>
              </div>
              <p className="text-sm text-white/80">Undergraduate Certificate in Strategic Business & Management</p>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="backdrop-blur-md bg-white/5 rounded-xl p-6 border border-white/10 hover:shadow-lg transition-all duration-500">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-200">Experience</h2>
          {/* Keep your experience entries the same */}
        </section>

        {/* Recommendations */}
        <section className="backdrop-blur-md bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-200">Recommendations</h2>
          <div className="space-y-6 text-white/90">
            {/* Keep recommendations same, now inside a nice card */}
          </div>
        </section>

        {/* Skills */}
        <section className="backdrop-blur-md bg-white/5 rounded-xl p-6 border border-white/10">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-orange-200">Languages / Skills / Awards / Extracurriculars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm text-white/90">
            {/* Same structure, but with glassmorphism */}
          </div>
        </section>
      </div>

      {/* Invisible scrollbar styling */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Portfolio;
