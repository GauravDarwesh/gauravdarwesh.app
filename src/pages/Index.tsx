import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import SearchBar from "@/components/SearchBar";
import NavigationToggle from "@/components/NavigationToggle";

const ANIM_MS = 3000;

const Index = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!(window as any).__indexAnimationPlayed) {
      setAnimate(true);
      (window as any).__indexAnimationPlayed = true;
      const t = setTimeout(() => setAnimate(false), ANIM_MS);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div
      className={`site-page h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden ${
        animate ? "animate-slowFadeIn" : ""
      }`}
    >
      <Helmet>
        <title>Gaurav Darwesh — Portfolio</title>
        <meta
          name="description"
          content="Product Manager Analyst specializing in Applied AI, enterprise workflow automation, and analytics. Explore Gaurav Darwesh’s portfolio, writing, and photography."
        />
        <link rel="canonical" href="https://gauravdarwesh.app/" />

        {/* Favicons */}
        <link
          rel="icon"
          type="image/png"
          sizes="96x96"
          href="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/favicon-96x96.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="96x96"
          href="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/favicon-96x96.png"
        />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Gaurav Darwesh — Portfolio" />
        <meta
          property="og:description"
          content="Product Manager Analyst specializing in Applied AI, enterprise workflow automation, and analytics. Explore Gaurav Darwesh’s portfolio, writing, and photography."
        />
        <meta property="og:url" content="https://gauravdarwesh.app/" />
        <meta
          property="og:image"
          content="https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/bcg/favicon-96x96.png"
        />
      </Helmet>

      <h1 className="sr-only">Gaurav Darwesh — Portfolio</h1>

      {/* Background */}
      <div className="site-background orange-bg fixed inset-0 z-0" aria-hidden="true" />

      {/* Navigation Toggle */}
      <div className="relative z-20">
        <NavigationToggle />
      </div>

      {/* Search Bar */}
      <div className="fixed top-6 inset-x-0 flex justify-center z-10">
        <SearchBar />
      </div>
    </div>
  );
};

export default Index;
