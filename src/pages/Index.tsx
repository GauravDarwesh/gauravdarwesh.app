import { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const Index = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Only trigger animation if not already visited in this session
    if (!sessionStorage.getItem("visited")) {
      setAnimate(true);
      sessionStorage.setItem("visited", "true");

      // Remove animation class after it finishes
      setTimeout(() => setAnimate(false), 3000); // match animation duration
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className={`fixed inset-0 bg-cover bg-center bg-no-repeat ${
          animate ? "animate-slowFadeIn" : ""
        }`}
        style={{
          backgroundImage: `url(https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/orange.jpg)`,
        }}
      />

      {/* Navigation Toggle */}
      <NavigationToggle />

      {/* Search Bar */}
      <div className="fixed relative z-10">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
