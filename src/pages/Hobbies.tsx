import NavigationToggle from "@/components/NavigationToggle";

const Portfolio = () => {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="background"
          className="w-full h-full object-cover brightness-90"
        />
        {/* overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/30" />
      </div>

      {/* Navigation Toggle */}
      <div className="relative z-20 pt-4">
        <NavigationToggle />
      </div>

      {/* Main Content with smooth scroll */}
      <div className="relative z-10 max-w-3xl w-full px-6 sm:px-10 md:px-12 text-left space-y-16 overflow-y-scroll no-scrollbar pt-24 sm:pt-32 pb-32">
        
        {/* Header */}
        <header className="backdrop-blur-sm bg-black/30 rounded-2xl p-6 shadow-md animate-fadeIn">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow">
            Gaurav Darwesh
          </h1>
          <div className="flex flex-wrap gap-4 text-gray-200 mt-3 text-sm">
            <a className="hover:text-orange-300 transition" href="mailto:gauravdarwesh155@gmail.com">mail/</a>
            <a className="hover:text-orange-300 transition" href="https://linkedin.com/in/gauravdarwesh" target="_blank">in/</a>
            <a className="hover:text-orange-300 transition" href="https://twitter.com/gaurav11darwesh" target="_blank">twitter/</a>
            <a className="hover:text-orange-300 transition" href="https://instagram.com/allaboutgaurav" target="_blank">instagram/</a>
          </div>
        </header>

        {/* About */}
        <section className="animate-fadeIn">
          <p className="text-base sm:text-lg leading-relaxed text-gray-100">
            I am a Cambridge University graduate in Strategic Business and Management, 
            with a Bachelor of Engineering in Computer Science (AIML) from the University of Mumbai. 
            Currently working at Nasdaq, with prior experience at notable MNC like Jio. 
            Proficient in Jira, Salesforce, ServiceNow, Planhat, Power BI, and Excel, I specialize in developing 
            innovative solutions that drive business growth and operational efficiency.
          </p>
        </section>

        {/* Education */}
        <section className="space-y-8 animate-fadeIn">
          <h2 className="text-2xl font-semibold tracking-wide text-orange-300">Education</h2>
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-white">University of Mumbai</h3>
              <span className="text-sm italic text-gray-300">Dec 2021 – Jun 2025</span>
            </div>
            <p className="text-sm text-gray-200">
              B.E. in Computer Science & Engineering (AI & ML), 8.6 CGPA
            </p>
          </div>
          <div>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-white">University of Cambridge</h3>
              <span className="text-sm italic text-gray-300">Oct 2023 – Jul 2024</span>
            </div>
            <p className="text-sm text-gray-200">
              Undergraduate Certificate in Strategic Business & Management
            </p>
          </div>
        </section>

        {/* Experience */}
        <section className="space-y-10 animate-fadeIn">
          <h2 className="text-2xl font-semibold tracking-wide text-orange-300">Experience</h2>
          {/* Example item */}
          <div className="space-y-2 border-l-2 border-orange-400 pl-4">
            <h3 className="font-semibold text-white">Nasdaq, Mumbai, India</h3>
            <span className="text-sm italic text-gray-300">July 2025 – Present</span>
            <p className="italic text-gray-200">Product Manager Analyst</p>
            <ul className="list-disc pl-6 text-sm text-gray-200 leading-relaxed">
              <li>Monitoring and analyzing global regulatory updates across NAM and LATAM regions.</li>
              <li>Collaborating with cross-functional teams to interpret regulations and translate them into product requirements.</li>
              <li>Building expertise in compliance frameworks such as Basel, EMIR, and SFTR.</li>
            </ul>
          </div>
          {/* (repeat structure for other jobs) */}
        </section>

        {/* Recommendations */}
        <section className="space-y-6 animate-fadeIn">
          <h2 className="text-2xl font-semibold tracking-wide text-orange-300">Recommendations</h2>
          <div className="backdrop-blur-sm bg-black/20 p-4 rounded-xl space-y-4 text-gray-200">
            <p><strong>Ibrahim Carime</strong> — Senior Director, Nasdaq</p>
            <p className="text-sm">Ibrahim mentored Gaurav during his internship... shows great potential for the future.</p>
          </div>
          {/* repeat for other recommendations */}
        </section>

        {/* Skills */}
        <section className="space-y-6 animate-fadeIn">
          <h2 className="text-2xl font-semibold tracking-wide text-orange-300">Languages / Skills / Awards / Extracurriculars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-200">
            <div>
              <h3 className="font-semibold mb-2 text-white">Languages</h3>
              <ul className="list-disc pl-5 space-y-1"><li>English</li><li>Marathi</li><li>Hindi</li><li>Japanese</li></ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-white">Skills</h3>
              <ul className="list-disc pl-5 space-y-1"><li>Business Strategy</li><li>Data Analytics</li><li>AI Dev Solutions</li></ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-white">Awards</h3>
              <ul className="list-disc pl-5 space-y-1"><li>Student of The Year (2020-2021)</li></ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-white">Extracurriculars</h3>
              <ul className="list-disc pl-5 space-y-1"><li>President – CSI (2024–2025)</li><li>Technical Lead – AIMSA</li></ul>
            </div>
          </div>
        </section>
      </div>

      {/* Invisible scrollbar styling */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fadeIn { animation: fadeIn 1s ease-in-out both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
      `}</style>
    </div>
  );
};

export default Portfolio;
