import NavigationToggle from "@/components/NavigationToggle";

const Portfolio = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden px-6 py-12">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-fadeInSlow opacity-20"
        style={{
          backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`,
        }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Main Content with invisible scroll */}
      <div className="relative z-10 max-w-4xl w-full text-left space-y-10 overflow-y-scroll no-scrollbar pt-28">
        {/* Header */}
        <div>
          <h1 className="text-5xl font-bold">Gaurav Darwesh</h1>
          <div className="flex flex-wrap gap-4 text-white mt-2">
            <a href="mailto:contact@gauravdarwesh.com">email/</a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank">in/</a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank">twitter/</a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank">instagram/</a>
          </div>
        </div>

        {/* About Section */}
        <p className="text-lg leading-relaxed">
          I am a Cambridge University graduate in Strategic Business and Management, 
          with a Bachelor of Engineering in Computer Science (AIML) from the University of Mumbai. 
          Currently working at Nasdaq, with prior experience at Jio, CodersCave, and Fanatisch Digital Marketing. 
          Proficient in Jira, Salesforce, Planhat, Power BI, and Excel, I specialize in developing 
          innovative solutions that drive business growth and operational efficiency.
        </p>

        {/* Education */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Education</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>University of Cambridge</strong> — Undergraduate Certificate in 
              Strategic Business & Management (Oct 2023 – July 2024)
            </li>
            <li>
              <strong>University of Mumbai</strong> — B.E. in Computer Science & Engineering 
              (AI & ML), 8.6 CGPA (Dec 2021 – June 2025)
            </li>
          </ul>
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Experience</h2>

          <div className="mb-6">
            <h3 className="font-semibold">Nasdaq, Mumbai, India</h3>
            <p className="italic">
              Product Manager Analyst <span className="float-right">July 2025 – Present</span>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Monitoring and analyzing global regulatory updates across NAM and LATAM regions.</li>
              <li>Managing JIRA tickets for regulatory changes, requirements, and enhancements.</li>
              <li>Collaborating with cross-functional teams on compliance frameworks like Basel, EMIR, SFTR.</li>
              <li>Supporting weekly newsletters and pre-sales client alignment.</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold">Nasdaq, Mumbai, India</h3>
            <p className="italic">
              Client Success Operations Intern <span className="float-right">Jan 2025 – Jun 2025</span>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Led Whitespace Project for upsell opportunities across multiple products.</li>
              <li>Deployed NPS campaigns via Qualtrics, leveraging Planhat + Power BI.</li>
              <li>Streamlined client success workflows and built weekly visualizations.</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold">Jio Platforms Limited, Mumbai, India</h3>
            <p className="italic">
              Data Science Intern <span className="float-right">Dec 2023 – Jan 2024</span>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Developed AI-based system to improve indoor wireless coverage.</li>
              <li>Built ray tracing simulations with Pylayers.</li>
              <li>Applied OpenCV for wall/structure detection in 5G planning.</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold">CodersCave, Mumbai, India</h3>
            <p className="italic">
              Business Analytics Intern <span className="float-right">Sept 2023 – Oct 2023</span>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Preprocessed Amazon dataset using Pandas/NumPy/SciPy.</li>
              <li>Analyzed Tata dataset with Scikit-learn + Google Sheets.</li>
              <li>Built and deployed KPI dashboard for real-time tracking.</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold">Fanatisch Digital Marketing Services, Mumbai, India</h3>
            <p className="italic">
              Marketing Intern <span className="float-right">May 2023 – July 2023</span>
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Curated content ideas for food brands like @oddiyana, @pots56, @blissobowl.</li>
              <li>Ran “Feast from the East” campaign for Mumbai-based food enthusiasts.</li>
              <li>Boosted engagement by 40% and follower count by 25%.</li>
            </ul>
          </div>
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Languages / Skills / Projects / Extracurriculars</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Languages</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>English</li>
                <li>Marathi</li>
                <li>Hindi</li>
                <li>Japanese</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Business Strategy</li>
                <li>Data Analytics & Visualization</li>
                <li>Project Management</li>
                <li>Technical Leadership</li>
                <li>Strategic Planning</li>
                <li>AI Dev Solutions</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Projects</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>AI Language Generator (Tensorflow, APIs, AES)</li>
                <li>Time Table Generator (PHP, JS, MySQL)</li>
                <li>E-commerce Website (PHP, JS, CSS)</li>
                <li>Movie Recommender (Python, ML, Sklearn)</li>
                <li>Library System (Java, SQL, JDBC)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Extracurriculars</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>President – CSI (2024–2025)</li>
                <li>Technical Lead – AIMSA (2024–2025)</li>
                <li>Media Head – AIMSA (2023–2024)</li>
                <li>Core Team – GDSC (2023–2024)</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Invisible scrollbar styling */}
      <style jsx global>{`
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
