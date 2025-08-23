import { useEffect, useRef, useState } from "react";
import SearchBar from "@/components/SearchBar";

/** ⬇️ Paste your Supabase public image URLs here */
const IMAGE_URLS = [
  // "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Personal%20Website%20Background%20Images/adamantiums204.jpg",
  // "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Personal%20Website%20Background%20Images/magicpattern-87PP9Zd7MNo-unsplash.jpg",
  // "https://"https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Personal%20Website%20Background%20Images/magicpattern-8h_tctpq4h0-unsplash.jpg",
];

const randNot = (max: number, not: number) => {
  if (max <= 1) return 0;
  let r = Math.floor(Math.random() * max);
  while (r === not) r = Math.floor(Math.random() * max);
  return r;
};

/** Crossfading background that swaps images at an interval */
const BackgroundSlideshow = ({ intervalMs = 8000 }: { intervalMs?: number }) => {
  const [showA, setShowA] = useState(true);
  const [imgA, setImgA] = useState<string | null>(IMAGE_URLS[0] ?? null);
  const [imgB, setImgB] = useState<string | null>(IMAGE_URLS[1] ?? IMAGE_URLS[0] ?? null);
  const currentIndexRef = useRef(0);

  // Preload images once
  useEffect(() => {
    IMAGE_URLS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (IMAGE_URLS.length === 0) return;

    const t = setInterval(() => {
      const nextIndex = randNot(IMAGE_URLS.length, currentIndexRef.current);
      const nextUrl = IMAGE_URLS[nextIndex];

      if (showA) {
        setImgB(nextUrl);
      } else {
        setImgA(nextUrl);
      }

      currentIndexRef.current = nextIndex;
      setShowA((s) => !s);
    }, intervalMs);

    return () => clearInterval(t);
  }, [intervalMs, showA]);

  return (
    <>
      {/* Layer A */}
      {imgA && (
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            showA ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${imgA})` }}
        />
      )}
      {/* Layer B */}
      {imgB && (
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            showA ? "opacity-0" : "opacity-100"
          }`}
          style={{ backgroundImage: `url(${imgB})` }}
        />
      )}
    </>
  );
};

const TypewriterText = () => {
  const [text, setText] = useState("");
  const fullText = "<//GDx>";

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setText(fullText.slice(0, i + 1));
      i++;
      if (i === fullText.length) clearInterval(id);
    }, 150);
    return () => clearInterval(id);
  }, []);

  return (
    <h1
      className="text-6xl tracking-wider text-white drop-shadow-lg"
      style={{
        fontFamily: "'Boldonse', sans-serif",
        transform: "scaleY(1.5) scaleX(1.5)",
      }}
    >
      {text}
    </h1>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Rotating backgrounds */}
      <BackgroundSlideshow intervalMs={8000} />

      {/* Animated Text (positioned a bit higher than middle—adjust top as you like) */}
      <div className="absolute top-1/4">
        <TypewriterText />
      </div>

      {/* Search Bar */}
      <SearchBar />
    </div>
  );
};

export default Index;
