import React, { useEffect, useRef, useState } from "react";
import petIdle from "@/assets/indian-cto-idle.webp";

export type PetAnimation =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

interface PetProps {
  animation?: PetAnimation;
  onInteract?: () => void;
}

const FRAME_COUNT = 6;
const FRAME_WIDTH = 256;
const FRAME_HEIGHT = 208;

const ROWS: Record<PetAnimation, number> = {
  idle: 0,
  "running-right": 1,
  "running-left": 2,
  waving: 3,
  jumping: 4,
  failed: 5,
  waiting: 6,
  running: 7,
  review: 8,
};

const FRAME_DURATION: Record<PetAnimation, number> = {
  idle: 240,
  "running-right": 105,
  "running-left": 105,
  waving: 130,
  jumping: 120,
  failed: 180,
  waiting: 220,
  running: 120,
  review: 135,
};

const LOOPING: Record<PetAnimation, boolean> = {
  idle: true,
  "running-right": false,
  "running-left": false,
  waving: true,
  jumping: false,
  failed: false,
  waiting: true,
  running: true,
  review: true,
};

const Pet: React.FC<PetProps> = ({ animation = "idle", onInteract }) => {
  const [visible, setVisible] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [travelOffset, setTravelOffset] = useState(0);

  const interactionLockRef = useRef(false);
  const animationTimerRef = useRef<number | null>(null);

  /*
   * Gentle entrance so the pet feels like it is emerging
   * from beside the search bar rather than simply appearing.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  /*
   * Sprite animation.
   *
   * The Indian CTO asset is a 6-column × 9-row atlas.
   * Each row represents one OpenPets animation state.
   */
  useEffect(() => {
    setCurrentFrame(0);

    if (animationTimerRef.current !== null) {
      window.clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    const duration = FRAME_DURATION[animation];
    const looping = LOOPING[animation];

    if (!looping) {
      let frame = 0;

      animationTimerRef.current = window.setInterval(() => {
        frame += 1;

        if (frame >= FRAME_COUNT) {
          if (animationTimerRef.current !== null) {
            window.clearInterval(animationTimerRef.current);
            animationTimerRef.current = null;
          }

          setCurrentFrame(FRAME_COUNT - 1);
          return;
        }

        setCurrentFrame(frame);
      }, duration);
    } else {
      animationTimerRef.current = window.setInterval(() => {
        setCurrentFrame((previous) => (previous + 1) % FRAME_COUNT);
      }, duration);
    }

    return () => {
      if (animationTimerRef.current !== null) {
        window.clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [animation]);

  /*
   * Clicking the pet makes him run away to a new location.
   *
   * The actual animation state is temporarily overridden here,
   * then we return control to the parent.
   */
  const handleInteraction = () => {
    if (interactionLockRef.current) return;

    interactionLockRef.current = true;

    setCurrentFrame(0);

    // Run toward the right.
    setTravelOffset((previous) => previous + 135);

    onInteract?.();

    window.setTimeout(() => {
      interactionLockRef.current = false;
    }, 1000);
  };

  /*
   * Reset travel position if parent changes animation back to
   * something other than the movement state.
   */
  useEffect(() => {
    if (animation !== "running-right" && animation !== "running-left") {
      setTravelOffset((previous) => {
        if (previous === 0) return previous;

        window.setTimeout(() => {
          setTravelOffset(0);
        }, 450);

        return previous;
      });
    }
  }, [animation]);

  const row = ROWS[animation];

  /*
   * The sprite is rendered as a background rather than an <img>
   * because this makes selecting an individual row/frame precise.
   */
  const backgroundPositionX = FRAME_COUNT <= 1 ? 0 : (currentFrame / (FRAME_COUNT - 1)) * 100;

  const backgroundPositionY = ROWS[animation] === 0 ? 0 : (row / (Object.keys(ROWS).length - 1)) * 100;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-auto select-none relative w-[88px] h-[82px]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        onClick={handleInteraction}
        className="absolute inset-0 cursor-pointer"
        style={{
          transform: `
            translateX(${travelOffset}px)
            translateY(${visible ? 0 : 28}px)
            scale(${visible ? 1 : 0.82})
          `,
          opacity: visible ? 1 : 0,
          transition: "transform 900ms cubic-bezier(0.16,1,0.3,1), opacity 650ms ease",
          willChange: "transform, opacity",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: `${FRAME_WIDTH}px`,
            height: `${FRAME_HEIGHT}px`,

            /*
             * Scale the original 256×208 frame down to the visual
             * size required by the search bar.
             */
            transform: "translate(-50%, -50%) scale(0.36)",

            transformOrigin: "center",

            backgroundImage: `url(${petIdle})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${FRAME_COUNT * 100}% 900%`,
            backgroundPosition: `${backgroundPositionX}% ${backgroundPositionY}%`,

            imageRendering: "pixelated",

            transition: "filter 250ms ease, transform 350ms cubic-bezier(0.16,1,0.3,1)",

            filter: animation === "failed" ? "drop-shadow(0 0 5px rgba(255,255,255,0.35))" : "none",
          }}
        />
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .pet-motion-safe {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Pet;
