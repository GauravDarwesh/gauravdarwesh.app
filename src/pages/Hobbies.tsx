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

      {/* Main Content with invisible scroll */}
      <div className="relative z-10 max-w-3xl w-full px-4 sm:px-6 md:px-8 text-left space-y-10 overflow-y-scroll no-scrollbar pt-20 sm:pt-28">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold">Gaurav Darwesh</h1>
          <div className="flex flex-wrap gap-4 text-white mt-2">
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=gauravdarwesh155@gmail.com">mail/</a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank">in/</a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank">twitter/</a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank">instagram/</a>
          </div>
        </div>

        {/* About Section */}
        <p className="text-base sm:text-lg leading-relaxed mt-4">
          I am a Cambridge University graduate in Strategic Business and Management, 
          with a Bachelor of Engineering in Computer Science (AIML) from the University of Mumbai. 
          Currently working at Nasdaq, with prior experience at notable MNC like Jio. 
          Proficient in Jira, Salesforce, ServiceNow, Planhat, Power BI, and Excel, I specialize in developing 
          innovative solutions that drive business growth and operational efficiency.
        </p>

        {/* Education */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Education</h2>
  
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">University of Mumbai</h3>
              <span className="text-sm whitespace-nowrap italic">Dec 2021 – Jun 2025</span>
            </div>
            <p className="text-sm">
              B.E. in Computer Science & Engineering (AI & ML), 8.6 CGPA
            </p>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">University of Cambridge</h3>
              <span className="text-sm whitespace-nowrap italic">Oct 2023 – Jul 2024</span>
            </div>
            <p className="text-sm">
              Undergraduate Certificate in Strategic Business & Management
            </p>
          </div>
          
        </section>

        {/* Experience */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Experience</h2>

          <div className="mb-8">
            <h3 className="font-semibold">Nasdaq, Mumbai, India </h3>
            <span className="float-right text-sm whitespace-nowrap italic">July 2025 – Present</span>
            <p className="italic mb-3">
              Product Manager Analyst 
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>Monitoring and analyzing global regulatory updates across NAM and LATAM regions.</li>
              <li>Managing JIRA tickets for regulatory changes, requirements, and enhancements.</li>
              <li>Collaborating with cross-functional teams to interpret regulations and translate them into product requirements.</li>
              <li>Supporting weekly regulatory newsletters for internal and external stakeholders.</li>
              <li>Assisting pre-sales and sales teams by aligning client regulatory needs with solutions.</li>
              <li>Contributing to product enhancement initiatives to improve responsiveness to regulatory change.</li>
              <li>Building expertise in compliance frameworks such as Basel, EMIR, and SFTR.</li>
              <li>Ensuring accuracy in regulatory documentation and maintaining data integrity.</li>
              <li>Identifying and escalating potential regulatory risks to ensure proactive compliance.</li>
              <li>Enhancing workflows by supporting business analysis and automating regulatory tracking.</li>

            </ul>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold">Nasdaq, Mumbai, India</h3>
            <span className="float-right text-sm whitespace-nowrap">Jan 2025 – Jun 2025</span>
            <p className="italic mb-3">
              Client Success Operations Intern 
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>Led the Whitespace Project to identify upsell/cross-sell opportunities across Calypso, AxiomSL, and NTS product lines.</li>
              <li>Deployed organization-level NPS campaigns via Qualtrics for Calypso, AxiomSL (ControllerView), NTS, CapCloud, and RegCloud product lines to capture client feedback and inform strategy.</li>
              <li>Assisted with capturing global control times to provide smooth and relevant information flow.</li>
              <li>Contributed to Nasdaq Trade Surveillance (Phase-1) by vetting SUBS through JIRA, automating procedures and building visualizations weekly for global account review meetings.</li>
              <li>Utilized Planhat for customer success analytics and management.</li>
              <li>Leveraged Power BI/Salesforce for strategic data visualization and reporting.</li>
              <li>Partnered with global teams to streamline customer success operations.</li>
              <li>Analyzed client trends to optimize retention strategies.</li>
              <li>Assisted in automating workflows to enhance operational efficiency.</li>
              <li>Strengthened global stakeholder engagement for success execution.</li>


            </ul>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold">Jio Platforms Limited, Mumbai, India</h3>
            <span className="float-right text-sm whitespace-nowrap">Dec 2023 – Jan 2024</span>
            <p className="italic mb-3">
              Data Science Intern
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>Led the development of an AI-based system to improve indoor wireless network coverage, focusing on better planning and signal accuracy.</li>
              <li>Built a ray tracing simulation using the open-source Pylayers library to model how signals travel inside buildings.</li>
              <li>Created detailed visibility and interaction maps to represent indoor layouts and help place network access points more effectively.</li>
              <li>Used computer vision with OpenCV to detect walls and structures, measuring distances to improve coverage planning.</li>
              <li>Ran coverage simulations and visualized signal patterns to provide insights for enhancing 5G network design.</li>
              <li>Showed how ray tracing can be applied to real-world 5G network challenges through a working proof-of-concept.</li>
              <li>Worked closely with teams to share findings and support decision-making on Jio’s network improvement plans.</li>


            </ul>
          </div>

          

          <div className="mb-8">
            <h3 className="font-semibold">Fanatisch Digital Marketing Services, Mumbai, India</h3>
            <span className="float-right text-sm whitespace-nowrap">May 2023 – July 2023</span>
            <p className="italic mb-3">
              Marketing Intern 
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base leading-relaxed">
              <li>Curated engaging content ideas for Instagram handles of food companies under FDMS.</li>
              <li>Led a comprehensive campaign titled "Feast from the east" for a month, targeting food enthusiasts in Mumbai.</li>
              <li>Utilized Instagram and Google Ads to segment audiences based on culinary interests and online behavior.</li>
              <li>Developed a content calendar featuring daily recipes, cooking tips, and user-generated content to maintain engagement.</li>
              <li>Implemented A/B testing for ad creatives and landing pages to optimize performance.</li>
              <li>Increased followers by 25% across all Instagram handles.</li>
              <li>Achieved a 40% boost in engagement rates through targeted ads and interactive content.</li>

            </ul>
          </div>
        </section>

        {/* Recommendations */}
<section>
  <h2 className="text-xl sm:text-2xl font-semibold mb-3">Recommendations</h2>
  <div className="space-y-6">
    <div>
      <p>
        <strong>Ibrahim Carime</strong> — Senior Director, Customer Success Operations, Nasdaq  
      </p>
      <p className="text-sm text-white mt-1">
        Ibrahim mentored Gaurav during his internship at Nasdaq. He praised Gaurav’s
        motivation, curiosity, and strong engagement, describing him as a standout
        contributor who brought fresh energy and shows great potential for the future.
      </p>
    </div>
    <div>
      <p>
        <strong>Doug Williamson</strong> — Executive Finance Coach, University of Cambridge  
      </p>
      <p className="text-sm text-white mt-1">
        Doug taught Gaurav in the Finance & Accounting unit at Cambridge. He highlighted
        his ability to grasp complex finance topics, apply them to practical challenges,
        and deliver insightful analysis. Doug also commended Gaurav’s strong time and
        project management skills, confident he will add substantial value in any role.
      </p>
    </div>
    <div>
      <p>
        <strong>Sourav Raj</strong> — Data Scientist, Jio  
      </p>
      <p className="text-sm text-white mt-1">
        Sourav mentored Gaurav during an internship at Jio. He emphasized his flexibility,
        rapid learning, and proactive approach to problem-solving. Gaurav consistently
        delivered high-quality work on time, and Sourav noted he would be a valuable
        asset in any future position.
      </p>
    </div>
  </div>
</section>



        {/* Skills */}
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-3">Languages / Skills / Awards / Extracurriculars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
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
              <h3 className="font-semibold mb-2">Awards</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Student of The Year (2020-2021)</li>
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
