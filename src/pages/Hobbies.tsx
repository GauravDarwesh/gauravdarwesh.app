import NavigationToggle from "@/components/NavigationToggle";

const About = () => {
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

      {/* Main Content */}
<div className="relative z-10 max-w-3xl w-full text-left space-y-6 pt-28">
  {/* Header */}
  <div>
    <h1 className="text-5xl font-bold">Gaurav Darwesh</h1>
    <div className="flex flex-wrap gap-4 text-white mt-2">
      <a href="mailto:contact@gauravdarwesh.com" className="hover:underline">email/</a>
      <a href="https://linkedin.com/in/gauravdarwesh" target="_blank" className="hover:underline">in/</a>
      <a href="https://twitter.com/gaurav11darwesh" target="_blank" className="hover:underline">twitter/</a>
      <a href="https://instagram.com/allaboutgaurav" target="_blank" className="hover:underline">instagram/</a>
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
        <div>
          <h2 className="text-xl font-semibold mt-4">Education</h2>
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
        </div>

        {/* Experience (short version for webpage) */}
        <div>
          <h2 className="text-xl font-semibold mt-4">Experience</h2>
          <p>
            <strong>Nasdaq</strong> — Product Manager Analyst (2025 – Present) <br />
            <strong>Nasdaq</strong> — Client Success Operations Intern (2025) <br />
            <strong>Jio Platforms</strong> — Data Science Intern (2023) <br />
            <strong>CodersCave</strong> — Business Analytics Intern (2023) <br />
            <strong>Fanatisch Digital</strong> — Marketing Intern (2023)
          </p>
        </div>


const ExperiencePage = () => {
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
      <div className="relative z-10 max-w-4xl w-full text-left space-y-10 overflow-y-scroll no-scrollbar pt-24">
        {/* Experience Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Experience</h2>

          {/* Nasdaq Analyst */}
          <div className="mb-6">
            <h3 className="font-semibold">Nasdaq, Mumbai, India</h3>
            <p className="italic">Product Manager Analyst <span className="float-right">July 2025 – Present</span></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Monitoring and analyzing global regulatory updates across NAM and LATAM regions to assess impact on AxiomSL’s regulatory reporting solutions.</li>
              <li>Creating and managing JIRA tickets to document and track regulatory changes, client requirements, and enhancement requests.</li>
              <li>Collaborating with cross-functional teams to interpret complex regulatory publications and translate them into actionable requirements.</li>
              <li>Supporting weekly regulatory newsletters for internal and external stakeholders.</li>
              <li>Assisting pre-sales and sales teams by gathering client-specific regulatory needs.</li>
              <li>Contributing to internal product enhancement initiatives aimed at improving responsiveness to regulatory change.</li>
              <li>Developing expertise in regulatory reporting frameworks (Basel, EMIR, SFTR).</li>
              <li>Ensuring data integrity across internal systems and escalating potential regulatory risks.</li>
              <li>Enhancing workflows by supporting business analysis and automating regulatory tracking processes.</li>
            </ul>
          </div>

          {/* Nasdaq Intern */}
          <div className="mb-6">
            <h3 className="font-semibold">Nasdaq, Mumbai, India</h3>
            <p className="italic">Client Success Operations Analysis Intern <span className="float-right">Jan 2025 – Jun 2025</span></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Led the Whitespace Project to identify upsell/cross-sell opportunities across Calypso, AxiomSL, and NTS.</li>
              <li>Deployed NPS campaigns via Qualtrics across multiple product lines.</li>
              <li>Contributed to Nasdaq Trade Surveillance (Phase-1) by vetting SUBS, automating workflows, and building weekly visualizations.</li>
              <li>Utilized Planhat, Power BI, and Salesforce for analytics and reporting.</li>
              <li>Streamlined global customer success operations and retention strategies.</li>
            </ul>
          </div>

          {/* Jio */}
          <div className="mb-6">
            <h3 className="font-semibold">Jio Platforms Limited, Mumbai, India</h3>
            <p className="italic">Data Science Intern <span className="float-right">Dec 2023 – Jan 2024</span></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Developed an AI-based system to improve indoor wireless network coverage.</li>
              <li>Built ray tracing simulations with Pylayers for modeling signals indoors.</li>
              <li>Created visibility and interaction maps for access point placement.</li>
              <li>Applied OpenCV for structure detection to improve network planning.</li>
              <li>Ran simulations and visualized 5G design signal patterns.</li>
            </ul>
          </div>

          {/* CodersCave */}
          <div className="mb-6">
            <h3 className="font-semibold">CodersCave, Mumbai, India</h3>
            <p className="italic">Business Analytics Intern <span className="float-right">Sept 2023 – Oct 2023</span></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Cleaned and preprocessed Amazon dataset using Python (Pandas, NumPy, SciPy).</li>
              <li>Analyzed Tata dataset for pricing strategies using Scikit-learn and Google Sheets.</li>
              <li>Performed EDA on TCS industry data using Python and SQL.</li>
              <li>Built and hosted a KPI dashboard for real-time tracking.</li>
            </ul>
          </div>

          {/* Fanatisch */}
          <div className="mb-6">
            <h3 className="font-semibold">Fanatisch Digital Marketing Services, Mumbai, India</h3>
            <p className="italic">Marketing Intern <span className="float-right">May 2023 – July 2023</span></p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Curated content ideas for Instagram handles of food companies.</li>
              <li>Led campaign “Feast from the East” targeting food enthusiasts in Mumbai.</li>
              <li>Utilized Instagram & Google Ads for audience segmentation.</li>
              <li>Developed a content calendar with daily recipes and user content.</li>
              <li>Implemented A/B testing for ads and boosted engagement by 40%.</li>
            </ul>
          </div>
        </section>

        {/* Skills Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Languages / Skills / Projects / Extracurriculars</h2>
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
              <h3 className="font-semibold mb-2">University Projects</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>AI Language Generator (Tensorflow, APIs, AES)</li>
                <li>Time Table Generator (PHP, JS, CSS, MySQL)</li>
                <li>E-commerce Website (PHP, JS, CSS)</li>
                <li>Movie Recommendation System (Python, ML, Sklearn)</li>
                <li>Library Management System (Java, SQL, JDBC)</li>
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

export default ExperiencePage;

  
      </div>
    </div>
  );
};

export default About;
