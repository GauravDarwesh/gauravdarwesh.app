import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";

const ANIM_MS = 3000;

const Index = () => {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!(window as any).__indexAnimationPlayed) {
      setAnimate(true);
      (window as any).__indexAnimationPlayed = true;

      const t = setTimeout(() => {
        setAnimate(false);
      }, ANIM_MS);

      return () => clearTimeout(t);
    }
  }, []);

  return (
    <div
      className={`site-page h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden ${
        animate ? "animate-blurReveal" : ""
      }`}
    >
      <Helmet>
        <title>Gaurav Darwesh — Portfolio</title>

        <meta
          name="description"
          content="Product Manager Analyst specializing in Applied AI, enterprise workflow automation, and analytics. Explore Gaurav Darwesh’s portfolio, writing, and photography."
        />

        <link rel="canonical" href="https://gauravdarwesh.app/" />

        {/* Blur Reveal Animation */}
        <style>
          {`
            @keyframes blurReveal {
              0% {
                opacity: 0;
                filter: blur(18px);
              }

              45% {
                opacity: 0.65;
                filter: blur(9px);
              }

              75% {
                opacity: 0.92;
                filter: blur(3px);
              }

              100% {
                opacity: 1;
                filter: blur(0);
              }
            }

            .animate-blurReveal {
              animation: blurReveal ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)
                both;
              will-change: opacity, filter;
            }

            @media (prefers-reduced-motion: reduce) {
              .animate-blurReveal {
                animation: none;
                opacity: 1;
                filter: none;
              }
            }
          `}
        </style>

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

      {/* Navigation Toggle */}
      <div className="relative z-20">
        <NavigationToggle />
      </div>
    </div>
  );
};

export default Index;
