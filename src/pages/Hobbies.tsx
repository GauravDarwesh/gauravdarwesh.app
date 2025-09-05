import NavigationToggle from "@/components/NavigationToggle";
import { useState, useEffect } from "react";

const Portfolio = () => {
  const [activeSection, setActiveSection] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const sections = ['intro', 'education', 'experience', 'recommendations', 'skills'];

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Dynamic cursor follower */}
      <div 
        className="fixed w-32 h-32 pointer-events-none z-50 mix-blend-difference opacity-30"
        style={{
          left: mousePos.x - 64,
          top: mousePos.y - 64,
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)',
          transition: 'all 0.1s ease-out'
        }}
      />

      {/* Floating geometric shapes */}
      <div className="fixed inset-0 pointer-events-none z-5">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse opacity-20"
            style={{
              left: `${20 + i * 15}%`,
              top: `${10 + i * 12}%`,
              width: `${30 + i * 10}px`,
              height: `${30 + i * 10}px`,
              backgroundColor: `hsl(${220 + i * 30}, 70%, 60%)`,
              clipPath: i % 2 === 0 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'circle(50%)',
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i}s`
            }}
          />
        ))}
      </div>

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Side navigation dots */}
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 z-30 space-y-4">
        {sections.map((section, index) => (
          <button
            key={section}
            onClick={() => setActiveSection(index)}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
              activeSection === index 
                ? 'bg-white border-white scale-125' 
                : 'bg-transparent border-white/50 hover:border-white'
            }`}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl w-full px-4 sm:px-6 md:px-8 text-left overflow-y-scroll no-scrollbar pt-20 sm:pt-28">
        
        {/* Header - Glitch style */}
        <div className="mb-20 relative">
          <div className="relative overflow-hidden">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-white relative">
              <span className="inline-block animate-pulse">G</span>
              <span className="inline-block" style={{animationDelay: '0.1s'}}>a</span>
              <span className="inline-block animate-pulse" style={{animationDelay: '0.2s'}}>u</span>
              <span className="inline-block" style={{animationDelay: '0.3s'}}>r</span>
              <span className="inline-block animate-pulse" style={{animationDelay: '0.4s'}}>a</span>
              <span className="inline-block" style={{animationDelay: '0.5s'}}>v</span>
              <span className="mx-4 text-6xl animate-spin-slow inline-block">★</span>
              <span className="inline-block animate-pulse" style={{animationDelay: '0.6s'}}>D</span>
              <span className="inline-block" style={{animationDelay: '0.7s'}}>a</span>
              <span className="inline-block animate-pulse" style={{animationDelay: '0.8s'}}>r</span>
              <span className="inline-block" style={{animationDelay: '0.9s'}}>w</span>
              <span className="inline-block animate-pulse" style={{animationDelay: '1s'}}>e</span>
              <span className="inline-block" style={{animationDelay: '1.1s'}}>s</span>
              <span className="inline-block animate-pulse" style={{animationDelay: '1.2s'}}>h</span>
            </h1>
          </div>
          
          {/* Abstract social links */}
          <div className="flex flex-wrap gap-6 mt-8">
            {[
              { url: "https://mail.google.com/mail/?view=cm&fs=1&to=gauravdarwesh155@gmail.com", label: "MAIL", shape: "◈" },
              { url: "https://linkedin.com/in/gauravdarwesh", label: "LINKED", shape: "◉" },
              { url: "https://twitter.com/gaurav11darwesh", label: "TWEET", shape: "◇" },
              { url: "https://instagram.com/allaboutgaurav", label: "VISUAL", shape: "◎" }
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                className="group relative overflow-hidden px-6 py-3 text-white border border-white/30 hover:border-white transition-all duration-300 backdrop-blur-sm"
                style={{
                  clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
                  transform: `rotate(${i * 2 - 3}deg)`
                }}
              >
                <span className="absolute inset-0 bg-white/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                <span className="relative flex items-center gap-2 text-sm font-mono">
                  <span className="text-lg">{link.shape}</span>
                  {link.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* About Section - Morphing container */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent backdrop-blur-sm transform skew-y-1" />
          <div className="relative p-8 border-l-4 border-white/50">
            <div className="text-lg leading-relaxed text-white/90 font-light">
              <span className="text-2xl font-black text-white">⟨ </span>
              I am a <span className="text-white font-semibold underline decoration-wavy">Cambridge University</span> graduate in Strategic Business and Management, 
              with a Bachelor of Engineering in Computer Science (AIML) from the University of Mumbai. 
              Currently working at <span className="text-white font-semibold">Nasdaq</span>, with prior experience at notable MNC like Jio. 
              Proficient in Jira, Salesforce, ServiceNow, Planhat, Power BI, and Excel, I specialize in developing 
              innovative solutions that drive business growth and operational efficiency.
              <span className="text-2xl font-black text-white"> ⟩</span>
            </div>
          </div>
        </div>

        {/* Education - Grid layout */}
        <section className="mb-20">
          <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm">01</span>
            EDUCATION
            <div className="flex-1 h-px bg-gradient-to-r from-white/50 to-transparent" />
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group relative overflow-hidden p-6 backdrop-blur-sm border border-white/20 hover:border-white/50 transition-all duration-300"
                 style={{clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'}}>
              <div className="absolute inset-0 bg-white/5 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <div className="relative">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-lg">University of Mumbai</h3>
                  <span className="text-xs text-white/70 font-mono bg-black/20 px-2 py-1">2021→2025</span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  B.E. in Computer Science & Engineering (AI & ML)
                  <span className="block mt-1 text-white font-semibold">8.6 CGPA ◆</span>
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden p-6 backdrop-blur-sm border border-white/20 hover:border-white/50 transition-all duration-300"
                 style={{clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'}}>
              <div className="absolute inset-0 bg-white/5 transform translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <div className="relative">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white text-lg">University of Cambridge</h3>
                  <span className="text-xs text-white/70 font-mono bg-black/20 px-2 py-1">2023→2024</span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  Undergraduate Certificate in Strategic Business & Management
                  <span className="block mt-1 text-white font-semibold">◈ Excellence</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Experience - Timeline */}
        <section className="mb-20">
          <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm">02</span>
            EXPERIENCE
            <div className="flex-1 h-px bg-gradient-to-r from-white/50 to-transparent" />
          </h2>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-white via-white/50 to-transparent" />
            
            {/* Nasdaq Current */}
            <div className="relative mb-16 pl-20">
              <div className="absolute left-6 top-6 w-4 h-4 bg-white rounded-full animate-pulse" />
              <div className="group hover:transform hover:scale-105 transition-all duration-300">
                <div className="backdrop-blur-sm bg-white/5 border border-white/20 p-6 relative overflow-hidden"
                     style={{clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))'}}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-white text-xl">NASDAQ</h3>
                        <p className="text-white/80 font-mono text-sm">Product Manager Analyst</p>
                      </div>
                      <span className="text-xs font-mono bg-black/30 text-white px-3 py-1 backdrop-blur-sm">2025→NOW</span>
                    </div>
                    <div className="space-y-2 text-sm text-white/80 leading-relaxed">
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Monitoring and analyzing global regulatory updates across NAM and LATAM regions.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Managing JIRA tickets for regulatory changes, requirements, and enhancements.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Collaborating with cross-functional teams to interpret regulations and translate them into product requirements.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Supporting weekly regulatory newsletters for internal and external stakeholders.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Assisting pre-sales and sales teams by aligning client regulatory needs with solutions.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Contributing to product enhancement initiatives to improve responsiveness to regulatory change.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Building expertise in compliance frameworks such as Basel, EMIR, and SFTR.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Ensuring accuracy in regulatory documentation and maintaining data integrity.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Identifying and escalating potential regulatory risks to ensure proactive compliance.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Enhancing workflows by supporting business analysis and automating regulatory tracking.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Nasdaq Intern */}
            <div className="relative mb-16 pl-20">
              <div className="absolute left-6 top-6 w-4 h-4 bg-white/70 rounded-full" />
              <div className="group hover:transform hover:scale-105 transition-all duration-300">
                <div className="backdrop-blur-sm bg-white/5 border border-white/20 p-6 relative overflow-hidden"
                     style={{clipPath: 'polygon(30px 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%, 0 30px)'}}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-white text-xl">NASDAQ</h3>
                        <p className="text-white/80 font-mono text-sm">Client Success Operations Intern</p>
                      </div>
                      <span className="text-xs font-mono bg-black/30 text-white px-3 py-1 backdrop-blur-sm">JAN→JUN 2025</span>
                    </div>
                    <div className="space-y-2 text-sm text-white/80 leading-relaxed">
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Led the Whitespace Project to identify upsell/cross-sell opportunities across Calypso, AxiomSL, and NTS product lines.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Deployed organization-level NPS campaigns via Qualtrics for Calypso, AxiomSL (ControllerView), NTS, CapCloud, and RegCloud product lines to capture client feedback and inform strategy.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Assisted with capturing global control times to provide smooth and relevant information flow.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Contributed to Nasdaq Trade Surveillance (Phase-1) by vetting SUBS through JIRA, automating procedures and building visualizations weekly for global account review meetings.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Utilized Planhat for customer success analytics and management.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Leveraged Power BI/Salesforce for strategic data visualization and reporting.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Partnered with global teams to streamline customer success operations.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Analyzed client trends to optimize retention strategies.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Assisted in automating workflows to enhance operational efficiency.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Strengthened global stakeholder engagement for success execution.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Jio */}
            <div className="relative mb-16 pl-20">
              <div className="absolute left-6 top-6 w-4 h-4 bg-white/50 rounded-full" />
              <div className="group hover:transform hover:scale-105 transition-all duration-300">
                <div className="backdrop-blur-sm bg-white/5 border border-white/20 p-6 relative overflow-hidden"
                     style={{clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'}}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-white text-xl">JIO PLATFORMS</h3>
                        <p className="text-white/80 font-mono text-sm">Data Science Intern</p>
                      </div>
                      <span className="text-xs font-mono bg-black/30 text-white px-3 py-1 backdrop-blur-sm">DEC 2023→JAN 2024</span>
                    </div>
                    <div className="space-y-2 text-sm text-white/80 leading-relaxed">
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Led the development of an AI-based system to improve indoor wireless network coverage, focusing on better planning and signal accuracy.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Built a ray tracing simulation using the open-source Pylayers library to model how signals travel inside buildings.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Created detailed visibility and interaction maps to represent indoor layouts and help place network access points more effectively.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Used computer vision with OpenCV to detect walls and structures, measuring distances to improve coverage planning.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Ran coverage simulations and visualized signal patterns to provide insights for enhancing 5G network design.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Showed how ray tracing can be applied to real-world 5G network challenges through a working proof-of-concept.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Worked closely with teams to share findings and support decision-making on Jio's network improvement plans.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fanatisch */}
            <div className="relative mb-16 pl-20">
              <div className="absolute left-6 top-6 w-4 h-4 bg-white/30 rounded-full" />
              <div className="group hover:transform hover:scale-105 transition-all duration-300">
                <div className="backdrop-blur-sm bg-white/5 border border-white/20 p-6 relative overflow-hidden"
                     style={{clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'}}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-white text-xl">FANATISCH DIGITAL</h3>
                        <p className="text-white/80 font-mono text-sm">Marketing Intern</p>
                      </div>
                      <span className="text-xs font-mono bg-black/30 text-white px-3 py-1 backdrop-blur-sm">MAY→JUL 2023</span>
                    </div>
                    <div className="space-y-2 text-sm text-white/80 leading-relaxed">
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Curated engaging content ideas for Instagram handles of food companies under FDMS.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Led a comprehensive campaign titled "Feast from the east" for a month, targeting food enthusiasts in Mumbai.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Utilized Instagram and Google Ads to segment audiences based on culinary interests and online behavior.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Developed a content calendar featuring daily recipes, cooking tips, and user-generated content to maintain engagement.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Implemented A/B testing for ad creatives and landing pages to optimize performance.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Increased followers by 25% across all Instagram handles.</div>
                      <div className="flex items-start gap-2"><span className="text-white">▪</span>Achieved a 40% boost in engagement rates through targeted ads and interactive content.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recommendations - Testimonial Cards */}
        <section className="mb-20">
          <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm">03</span>
            TESTIMONIALS
            <div className="flex-1 h-px bg-gradient-to-r from-white/50 to-transparent" />
          </h2>
          
          <div className="space-y-8">
            {[
              {
                name: "Ibrahim Carime",
                role: "Senior Director, Customer Success Operations, Nasdaq",
                text: "Ibrahim mentored Gaurav during his internship at Nasdaq. He praised Gaurav's motivation, curiosity, and strong engagement, describing him as a standout contributor who brought fresh energy and shows great potential for the future."
              },
              {
                name: "Doug Williamson",
                role: "Executive Finance Coach, University of Cambridge",
                text: "Doug taught Gaurav in the Finance & Accounting unit at Cambridge. He highlighted his ability to grasp complex finance topics, apply them to practical challenges, and deliver insightful analysis. Doug also commended Gaurav's strong time and project management skills, confident he will add substantial value in any role."
              },
              {
                name: "Sourav Raj",
                role: "Data Scientist, Jio",
                text: "Sourav mentored Gaurav during an internship at Jio. He emphasized his flexibility, rapid learning, and proactive approach to problem-solving. Gaurav consistently delivered high-quality work on time, and Sourav noted he would be a valuable asset in any future position."
              }
            ].map((testimonial, i) => (
              <div key={i} className="group relative">
                <div className="backdrop-blur-sm bg-white/5 border border-white/20 p-8 relative overflow-hidden transform hover:scale-[1.02] transition-all duration-300"
                     style={{clipPath: `polygon(${i % 2 === 0 ? '0 10px, calc(100% - 10px) 0, 100% calc(100% - 10px), 10px 100%, 0 calc(100% - 10px)' : '10px 0, 100% 0, calc(100% - 10px) calc(100% - 10px), 0 100%'})`}}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative">
                    <div className="mb-4">
                      <h3 className="text-xl font-black text-white">{testimonial.name}</h3>
                      <p className="text-white/70 text-sm font-mono">{testimonial.role}</p>
                    </div>
                    <div className="text-white/90 text-sm leading-relaxed">
                      <span className="text-2xl font-black text-white">"</span>
                      {testimonial.text}
                      <span className="text-2xl font-black text-white">"</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills - Matrix Layout */}
        <section className="mb-20">
          <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-4">
            <span className="w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm">04</span>
            CAPABILITIES
            <div className="flex-1 h-px bg-gradient-to-r from-white/50 to-transparent" />
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: "Languages", items: ["English", "Marathi", "Hindi", "Japanese"], icon: "◈" },
              { title: "Skills", items: ["Business Strategy", "Data Analytics & Visualization", "Project Management", "Technical Leadership", "Strategic Planning", "AI Dev Solutions"], icon: "◉" },
              { title: "Awards", items: ["Student of The Year (2020-2021)"], icon: "◇" },
              { title: "Extracurriculars", items: ["President – CSI (2024–2025)", "Technical Lead – AIMSA (2024–2025)", "Media Head – AIMSA (2023–2024)", "Core Team – GDSC (2023–2024)"], icon: "◎" }
            ].map((category, i) => (
              <div key={i} className="group relative">
                <div className="backdrop-blur-sm bg-white/5 border border-white/20 p-6 h-full relative overflow-hidden transform hover:scale-105 transition-all duration-300"
                     style={{clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)'}}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl text-white">{category.icon}</span>
                      <h3 className="font-black text-white text-lg">{category.title}</h3>
                    </div>
                    <div className="space-y-2 flex-1">
                      {category.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-white/80">
                          <span className="w-1 h-1 bg-white rounded-full"></span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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