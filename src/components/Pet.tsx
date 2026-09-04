import React from "react";
import petIdle from "@/assets/indian-cto-idle.webp";

/**
 * Indian CTO pixel pet (openpets.dev) — idle animation.
 * 6 frames, 256x208 each, played with CSS steps().
 */
const Pet: React.FC = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none relative w-[96px] h-[78px] overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        @keyframes pet-idle-frames {
          to { transform: translateX(-100%); }
        }
        @keyframes pet-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .pet-sprite-strip {
          animation: pet-idle-frames 1.4s steps(6) infinite;
          image-rendering: pixelated;
        }
        .pet-bob {
          animation: pet-bob 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pet-sprite-strip, .pet-bob { animation: none; }
        }
      `}</style>
      <div className="pet-bob w-full h-full">
        <img
          src={petIdle}
          alt=""
          draggable={false}
          className="pet-sprite-strip block h-full w-[600%] max-w-none pointer-events-none select-none"
        />
      </div>
    </div>
  );
};

export default Pet;
