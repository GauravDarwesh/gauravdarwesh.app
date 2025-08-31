import NavigationToggle from "@/components/NavigationToggle";

const Portfolio = () => {
  return (
    <div className="h-[100dvh] w-full flex flex-col items-center relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0">
        <img
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="background"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Navigation Toggle */}
      <div className="absolute top-6 left-6 z-20">
        <NavigationToggle />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl w-full px-4 sm:px-6 md:px-8 space-y-10 overflow-y-scroll no-scrollbar py-20">
        
        {/* Header */}
        <div className="backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-lg">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold">Gaurav Darwesh</h1>
          <div className="flex flex-wrap gap-4 text-sm text-white mt-4">
            <a href="mailto:gauravdarwesh155@gmail.com" className="hover:underline">mail/</a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank" className="hover:underline">in/</a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank" className="hover:underline">twitter/</a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank" className="hover:underline">instagram/</a>
          </div>
          <p className="text-base sm:text-lg leading-relaxed mt-6 text-white/90">
            I am a Cambridge University graduate in Strategic Business and Management, 
            with a Bachelor of Engineering in Computer Science (AIML) from the University of Mumbai. 
            Currently working at Nasdaq, with prior experience at Jio. Proficient in Jira, Salesforce, ServiceNow, 
            Planhat, Power BI, and Excel, I specialize in developing innovative solutions that drive business growth 
            and operational efficiency.
          </p>
        </div>

        {/* Education */}
        <section className="backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Education</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">University of Mumbai</h3>
                <span className="text-sm italic">Dec 2021 – Jun 2025</span>
              </div>
              <p className="text-sm">B.E. in Computer Science & Engineering (AI & ML), 8.6 CGPA</p>
            </div>
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">University of Cambridge</h3>
                <span className="text-sm italic">Oct 2023 – Jul 2024</span>
              </div>
              <p className="text-sm">Undergraduate Certificate in Strategic Business & Management</p>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section className="backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Experience</h2>
          <div className="space-y-8">
            {/* Nasdaq PM Analyst */}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">Nasdaq, Mumbai</h3>
                <span className="text-sm italic">Jul 2025 – Present</span>
              </div>
              <p className="italic mb-2">Product Manager Analyst</p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                <li>Monitoring and analyzing global regulatory updates across NAM and LATAM regions.</li>
                <li>Managing JIRA tickets for regulatory changes and enhancements.</li>
                <li>Collaborating with cross-functional teams to interpret and translate regulations.</li>
                <li>Supporting newsletters and pre-sales alignment with client needs.</li>
              </ul>
            </div>
            {/* Nasdaq Intern */}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">Nasdaq, Mumbai</h3>
                <span className="text-sm italic">Jan 2025 – Jun 2025</span>
              </div>
              <p className="italic mb-2">Client Success Operations Intern</p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                <li>Led the Whitespace Project across Calypso, AxiomSL, and NTS product lines.</li>
                <li>Deployed NPS campaigns via Qualtrics across multiple solutions.</li>
                <li>Automated workflows, analytics, and client retention strategies.</li>
              </ul>
            </div>
            {/* Jio */}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">Jio Platforms, Mumbai</h3>
                <span className="text-sm italic">Dec 2023 – Jan 2024</span>
              </div>
              <p className="italic mb-2">Data Science Intern</p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                <li>Developed AI-based system to improve wireless coverage using ray tracing.</li>
                <li>Applied computer vision (OpenCV) to detect walls & improve coverage planning.</li>
              </ul>
            </div>
            {/* Marketing */}
            <div>
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">Fanatisch Digital Marketing</h3>
                <span className="text-sm italic">May 2023 – Jul 2023</span>
              </div>
              <p className="italic mb-2">Marketing Intern</p>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
                <li>Curated engaging content ideas for Instagram handles of food companies.</li>
                <li>Increased followers by 25% and boosted engagement by 40% via campaigns.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Recommendations */}
        <section className="backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
          <div className="space-y-6 text-sm text-white/90">
            <div>
              <p><strong>Ibrahim Carime</strong> — Senior Director, Nasdaq</p>
              <p className="mt-1">Praised Gaurav’s motivation, curiosity, and strong engagement.</p>
            </div>
            <div>
              <p><strong>Doug Williamson</strong> — Executive Finance Coach, Cambridge</p>
              <p className="mt-1">Commended his ability to grasp finance concepts & deliver insights.</p>
            </div>
            <div>
              <p><strong>Sourav Raj</strong> — Data Scientist, Jio</p>
              <p className="mt-1">Noted flexibility, rapid learning, and high-quality deliveries.</p>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section className="backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Languages / Skills / Awards / Extracurriculars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Languages</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>English</li><li>Marathi</li><li>Hindi</li><li>Japanese</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Business Strategy</li><li>Data Analytics</li><li>Project Management</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Awards</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Student of The Year (2020–21)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Extracurriculars</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>President – CSI</li><li>Technical Lead – AIMSA</li>
                <li>Media Head – AIMSA</li><li>Core Team – GDSC</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Invisible scrollbar styling */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Portfolio;
