import NavigationToggle from "@/components/NavigationToggle";

const Portfolio = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden text-white font-sans">
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-black via-orange-900/80 to-black opacity-95"
        style={{ backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`, backgroundSize: "cover", backgroundPosition: "center" }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Content */}
      <main className="relative z-10 w-full max-w-5xl px-6 sm:px-10 py-20 space-y-20 overflow-y-scroll no-scrollbar">
        {/* Header */}
        <header className="space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Gaurav Darwesh
          </h1>
          <div className="flex gap-6 text-sm sm:text-base text-gray-200">
            <a href="mailto:gauravdarwesh155@gmail.com" className="hover:text-orange-400 transition">mail/</a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank" className="hover:text-orange-400 transition">in/</a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank" className="hover:text-orange-400 transition">twitter/</a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank" className="hover:text-orange-400 transition">instagram/</a>
          </div>
        </header>

        {/* About */}
        <section className="leading-relaxed text-lg text-gray-200 max-w-3xl">
          <p>
            Cambridge University graduate in Strategic Business & Management, with a B.E. in Computer Science (AI/ML) from the University of Mumbai. Currently at Nasdaq, with prior experience at Jio. Skilled in Jira, Salesforce, ServiceNow, Planhat, Power BI, and Excel — I build innovative solutions that drive business growth and efficiency.
          </p>
        </section>

        {/* Timeline Sections */}
        <section className="space-y-16">
          {/* Education */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8 border-l-4 border-orange-500 pl-4">Education</h2>
            <div className="space-y-6">
              <div className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition">
                <div className="flex justify-between">
                  <h3 className="font-semibold">University of Mumbai</h3>
                  <span className="text-sm italic">Dec 2021 – Jun 2025</span>
                </div>
                <p className="text-sm text-gray-300">B.E. in Computer Science & Engineering (AI & ML), 8.6 CGPA</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition">
                <div className="flex justify-between">
                  <h3 className="font-semibold">University of Cambridge</h3>
                  <span className="text-sm italic">Oct 2023 – Jul 2024</span>
                </div>
                <p className="text-sm text-gray-300">Undergraduate Certificate in Strategic Business & Management</p>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold mb-8 border-l-4 border-orange-500 pl-4">Experience</h2>
            <div className="space-y-8">
              {[
                { company: "Nasdaq", role: "Product Manager Analyst", date: "July 2025 – Present", desc: ["Monitoring global regulatory updates across NAM/LATAM", "Translating regulations into product requirements", "Supporting regulatory newsletters & pre-sales"], },
                { company: "Nasdaq", role: "Client Success Operations Intern", date: "Jan 2025 – Jun 2025", desc: ["Led Whitespace Project for upsell opportunities", "Deployed NPS campaigns across product lines", "Contributed to Trade Surveillance automation"], },
                { company: "Jio Platforms Limited", role: "Data Science Intern", date: "Dec 2023 – Jan 2024", desc: ["Developed AI system for indoor wireless coverage", "Built ray tracing simulation with Pylayers", "Applied OpenCV for structure detection"], },
                { company: "Fanatisch Digital Marketing", role: "Marketing Intern", date: "May 2023 – Jul 2023", desc: ["Curated content ideas for Instagram food brands", "Led ‘Feast from the East’ campaign", "Boosted followers by 25% & engagement by 40%"], },
              ].map((exp, i) => (
                <div key={i} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{exp.company}</h3>
                    <span className="text-xs italic">{exp.date}</span>
                  </div>
                  <p className="italic text-sm mb-3">{exp.role}</p>
                  <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                    {exp.desc.map((d, idx) => <li key={idx}>{d}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Skills / Extras */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-8 border-l-4 border-orange-500 pl-4">Skills & More</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            {[
              { title: "Languages", items: ["English", "Marathi", "Hindi", "Japanese"] },
              { title: "Skills", items: ["Business Strategy", "Data Analytics", "Project Management", "AI Dev Solutions"] },
              { title: "Awards", items: ["Student of The Year (2020-2021)"] },
              { title: "Extracurriculars", items: ["President – CSI (2024–2025)", "Tech Lead – AIMSA (2024–2025)", "Media Head – AIMSA (2023–2024)", "Core Team – GDSC (2023–2024)"] },
            ].map((block, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition">
                <h3 className="font-semibold mb-2">{block.title}</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-300">
                  {block.items.map((item, idx) => <li key={idx}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Invisible scrollbar styling */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Portfolio;
