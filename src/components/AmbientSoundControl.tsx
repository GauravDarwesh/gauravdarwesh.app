import { useCallback, useEffect, useRef } from "react";
import ambientSound from "@/assets/gdx-warm-ambient-seamless.wav.asset.json";

const AMBIENT_VOLUME = 0.12;
const FADE_IN_DURATION_MS = 1100;

const AmbientSoundControl = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);

  const clearFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }, []);

  const fadeVolume = useCallback(
    (target: number, duration: number, onComplete?: () => void) => {
      const audio = audioRef.current;
      if (!audio) return;

      clearFade();
      const initial = audio.volume;
      const startedAt = performance.now();

      const updateVolume = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
        audio.volume = initial + (target - initial) * eased;

        if (progress >= 1) {
          clearFade();
          onComplete?.();
          return;
        }

        fadeFrameRef.current = window.requestAnimationFrame(updateVolume);
      };

      fadeFrameRef.current = window.requestAnimationFrame(updateVolume);
    },
    [clearFade],
  );

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || document.hidden) return false;

    clearFade();
    audio.volume = 0;

    try {
      await audio.play();
      fadeVolume(AMBIENT_VOLUME, FADE_IN_DURATION_MS);
      return true;
    } catch {
      return false;
    }
  }, [clearFade, fadeVolume]);

  useEffect(() => {
    void startPlayback();

    const unlockPlayback = () => {
      if (audioRef.current?.paused) void startPlayback();
    };

    const handleVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        clearFade();
        audio.pause();
      } else {
        void startPlayback();
      }
    };

    document.addEventListener("pointerdown", unlockPlayback, { passive: true });
    document.addEventListener("keydown", unlockPlayback);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearFade();
      document.removeEventListener("pointerdown", unlockPlayback);
      document.removeEventListener("keydown", unlockPlayback);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [clearFade, startPlayback]);

  return <audio ref={audioRef} src={ambientSound.url} loop preload="auto" aria-hidden="true" />;
};

export default AmbientSoundControl;