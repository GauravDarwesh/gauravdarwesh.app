import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Landing = () => {
  const navigate = useNavigate();
  const [fade, setFade] = useState("opacity-0");

  useEffect(() => {
    // Smooth fade in
    setTimeout(() => setFade("opacity-100"), 100);

    // After 3 seconds, fade out and navigate
    setTimeout(() => {
      setFade("opacity-0");
      setTimeout(() => navigate("/home"), 2000); // matches fade-out duration
    }, 3000);
  }, [navigate]);

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden transition-opacity duration-2000 ${fade}`}
    >
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Translucent overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Centered Title */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white/70 drop-shadow-lg tracking-wide">
          Gaurav Darwesh<span className="align-super text-xl text-white/50">™</span>
        </h1>

        <p className="mt-6 text-lg md:text-2xl text-white/60 max-w-2xl leading-relaxed">
          Meet <span className="font-semibold text-white/80">GDx</span> — 
          your AI-powered virtual PA, answering on behalf of Gaurav.  
        </p>
      </div>
    </div>
  );
};

export default Landing;
