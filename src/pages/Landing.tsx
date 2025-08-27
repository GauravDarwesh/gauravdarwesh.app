import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden animate-fadeInSlow">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Translucent overlay */}
      <div className="fixed inset-0 bg-black/20" />

      {/* Welcome text and button */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
            Welcome to Gaurav Darwesh
          </h1>
          <span className="text-2xl md:text-3xl text-white/90">™</span>
        </div>

        <Button 
          onClick={handleContinue}
          className="bg-white text-black hover:bg-white/90 px-8 py-3 text-lg font-medium rounded-full transition-all duration-300 hover:scale-105"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Landing;