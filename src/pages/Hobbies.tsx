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
<div className="relative z-10 max-w-3xl w-full text-left space-y-6 pt-27">
  {/* Header */}
  <div>
    <h1 className="text-3xl font-bold">Gaurav Darwesh</h1>
    <div className="flex flex-wrap gap-4 text-blue-600 mt-2">
      <a href="mailto:contact@gauravdarwesh.com">email</a>
      <a href="https://linkedin.com/in/gauravdarwesh" target="_blank">linkedin</a>
      <a href="https://twitter.com/gaurav11darwesh" target="_blank">twitter</a>
      <a href="https://instagram.com/allaboutgaurav" target="_blank">instagram</a>
      <a href="https://tally.so/r/wgl6zM" target="_blank">book a meeting</a>
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
      </div>
    </div>
  );
};

export default About;
