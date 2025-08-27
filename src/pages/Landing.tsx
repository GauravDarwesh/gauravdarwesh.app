import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const Landing = () => {
  const navigate = useNavigate();
  const [fade, setFade] = useState("opacity-0");

  useEffect(() => {
    setTimeout(() => setFade("opacity-100"), 50);
  }, []);

  const handleContinue = () => {
    setFade("opacity-0");
    setTimeout(() => navigate("/home"), 500); // matches fade-out duration
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col items-center justify-between relative overflow-hidden transition-opacity duration-500 ${fade}`}
    >
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Translucent overlay */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Centered Title */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white">
          Gaurav Darwesh<span className="align-super text-xl">™</span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-white/80 max-w-xl">
          Clarity in Complexity — Simplifying insights, one step at a time.
        </p>
      </div>

      {/* Bottom Button */}
      <div className="relative z-10 mb-16">
        <Button
          onClick={handleContinue}
          className="bg-white text-black hover:bg-white/90 px-10 py-4 text-lg font-medium rounded-full transition-all duration-300 hover:scale-105 shadow-lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Landing;
