import { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import { supabase } from "@/lib/supabaseClient";


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
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1
      className="text-6xl tracking-wider text-white drop-shadow-lg"
      style={{
        fontFamily: "'Boldonse', sans-serif",
        transform: "scaleY(1.5) scaleX(1.5)", // stretched look
      }}
    >
      {text}
    </h1>
  );
};

const Index = () => {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      // Fetch all images inside your bucket
      const { data, error } = await supabase.storage
        .from("Personal Website Background Images")
        .list();

      if (error) {
        console.error("Error fetching images:", error.message);
        return;
      }

      if (data && data.length > 0) {
        // Pick one image randomly
        const randomImage = data[Math.floor(Math.random() * data.length)].name;
        const { data: publicUrlData } = supabase.storage
          .from("Personal Website Background Images")
          .getPublicUrl(randomImage);

        setBackgroundUrl(publicUrlData.publicUrl);
      }
    };

    fetchImages();
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-fadeInSlow"
        style={{
          backgroundImage: backgroundUrl
            ? `url(${backgroundUrl})`
            : `url(/lovable-uploads/4746d648-205c-482c-8ba1-3482e03c242f.png)`,
        }}
      />

      {/* Animated Text */}
      <div className="absolute top-1/4">
        <TypewriterText />
      </div>

      {/* Search Bar */}
      <SearchBar />
    </div>
  );
};

export default Index;
