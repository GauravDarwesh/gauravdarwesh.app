import NavigationToggle from "@/components/NavigationToggle";

const Portfolio = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden">
      {/* Elegant Background with Overlay */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg"
          alt="Elegant background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-elegant opacity-50" />
        
        {/* Floating accent elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-accent/20 rounded-full blur-2xl animate-float-elegant" />
          <div className="absolute bottom-1/4 left-1/3 w-24 h-24 bg-primary/15 rounded-full blur-xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
      </div>

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Enhanced Content with better typography */}
      <div className="relative z-10 max-w-4xl w-full px-6 sm:px-8 md:px-12 text-left space-y-12 overflow-y-scroll scrollbar-hide pt-28 pb-32">
        {/* Elegant Header */}
        <div className="text-center mb-16">
          <h1 className="font-playfair text-4xl sm:text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6">
            Gaurav Darwesh
          </h1>
          <div className="flex flex-wrap gap-6 text-foreground/80 mt-4 justify-center font-inter text-sm">
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=gauravdarwesh155@gmail.com" 
               className="hover:text-primary transition-colors duration-300 hover:scale-105 transform">
              Email
            </a>
            <a href="https://linkedin.com/in/gauravdarwesh" target="_blank" 
               className="hover:text-primary transition-colors duration-300 hover:scale-105 transform">
              LinkedIn
            </a>
            <a href="https://twitter.com/gaurav11darwesh" target="_blank" 
               className="hover:text-primary transition-colors duration-300 hover:scale-105 transform">
              Twitter
            </a>
            <a href="https://www.threads.com/@allaboutgaurav" target="_blank" 
               className="hover:text-primary transition-colors duration-300 hover:scale-105 transform">
              Threads
            </a>
            <a href="https://instagram.com/allaboutgaurav" target="_blank" 
               className="hover:text-primary transition-colors duration-300 hover:scale-105 transform">
              Instagram
            </a>
          </div>
        </div>

        {/* Elegant About Section */}
        <div className="bg-glass-medium backdrop-blur-elegant rounded-elegant p-8 border border-card-border shadow-elegant-md">
          <p className="font-inter text-lg sm:text-xl leading-relaxed text-foreground/90">
            I am a <span className="text-primary font-semibold">Cambridge University</span> graduate in Strategic Business and Management, 
            with a Bachelor of Engineering in Computer Science (AIML) from the <span className="text-primary font-semibold">University of Mumbai</span>. 
            Currently working at <span className="text-accent font-semibold">Nasdaq</span>, with prior experience at notable MNC like <span className="text-accent font-semibold">Jio</span>. 
            Proficient in Jira, Salesforce, ServiceNow, Planhat, Power BI, and Excel, I specialize in developing 
            innovative solutions that drive business growth and operational efficiency.
          </p>
        </div>
      </div>

      {/* Enhanced scrollbar styling */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Portfolio;