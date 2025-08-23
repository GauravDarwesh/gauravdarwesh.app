import { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";

const TypewriterText = () => {
  const [text, setText] = useState("");
  const fullText = "<//GDx>";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i === fullText.length) {
        clearInterval(interval);
      }
    }, 150); // typing speed
    return () => clearInterval(interval);
  }, []);

  return (
    <h1
      className="text-6xl tracking-wider text-white drop-shadow-lg"
      style={{
        fontFamily: "'Boldonse', sans-serif", // your chosen font
        transform: "scaleY(1.5) scaleX(1.5)", // stretch height only
      }}
    >
      {text}
    </h1>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`,
        }}
      />

      {/* Animated Text */}
      <div className="absolute top-1/4 left-1/3"> {/* pushes text higher than center */}
        <TypewriterText />
      </div>

      {/* Search Bar */}
      <SearchBar />
    </div>
  );
};

export default Index;
