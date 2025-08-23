import { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";

const translations = [
  "GD-AI", // English
  "جي دي-إيه آي", // Arabic
  "जीडी-एआई", // Hindi
  "GD-人工知能", // Japanese
  "GD-인공지능", // Korean
  "GD-Искусственный интеллект", // Russian
  "GD-IA", // French (Intelligence Artificielle)
  "GD-KI", // German (Künstliche Intelligenz)
  "GD-IA", // Spanish (Inteligencia Artificial)
  "GD-IA", // Portuguese
  "GD-IA", // Italian
  "GD-ΚΝ", // Greek (Τεχνητή Νοημοσύνη)
  "GD-YZ", // Turkish (Yapay Zeka)
  "GD-כָּתוּב", // Hebrew
  "GD-ปัญญาประดิษฐ์", // Thai
  "GD-Trí tuệ nhân tạo", // Vietnamese
  "GD-Kecerdasan Buatan", // Indonesian
  "GD-Интелигенција", // Serbian
  "GD-人工智能", // Simplified Chinese
  "GD-人工智慧", // Traditional Chinese
];

const RotatingText = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % translations.length);
    }, 2500); // change every 2.5s
    return () => clearInterval(interval);
  }, []);

  return (
    <h1
      key={index}
      className="text-6xl text-white drop-shadow-lg transition-opacity duration-1000 ease-in-out"
      style={{
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      {translations[index]}
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

      {/* Rotating Text */}
      <div className="relative -mt-32">
        <RotatingText />
      </div>

      {/* Search Bar */}
      <SearchBar />
    </div>
  );
};

export default Index;
