import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ambientSound from "@/assets/gdx-warm-ambient-seamless.wav.asset.json";

const STORAGE_KEY = "gdx-ambient-sound";
const AMBIENT_VOLUME = 0.12;
const FADE_IN_DURATION_MS = 1100;
const FADE_OUT_DURATION_MS = 1400;

const AmbientSoundControl = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const desiredPlayingRef = useRef(true);
  const [isPlaying, setIsPlaying] = useState(false);

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
    if (!audio || !desiredPlayingRef.current || document.hidden) return false;

    clearFade();
    audio.volume = 0;

    try {
      await audio.play();
      setIsPlaying(true);
      fadeVolume(AMBIENT_VOLUME, FADE_IN_DURATION_MS);
      return true;
    } catch {
      setIsPlaying(false);
      return false;
    }
  }, [clearFade, fadeVolume]);

  const pausePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    fadeVolume(0, FADE_OUT_DURATION_MS, () => {
      audio.pause();
      setIsPlaying(false);
    });
  }, [fadeVolume]);

  useEffect(() => {
    const storedPreference = window.localStorage.getItem(STORAGE_KEY);
    desiredPlayingRef.current = storedPreference !== "paused";

    if (desiredPlayingRef.current) void startPlayback();

    const unlockPlayback = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-ambient-sound-control]")) return;
      if (desiredPlayingRef.current && audioRef.current?.paused) void startPlayback();
    };

    const handleVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        clearFade();
        audio.pause();
        setIsPlaying(false);
      } else if (desiredPlayingRef.current) {
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

  const togglePlayback = () => {
    if (isPlaying) {
      desiredPlayingRef.current = false;
      window.localStorage.setItem(STORAGE_KEY, "paused");
      pausePlayback();
      return;
    }

    desiredPlayingRef.current = true;
    window.localStorage.setItem(STORAGE_KEY, "playing");
    void startPlayback();
  };

  return (
    <>
      <audio ref={audioRef} src={ambientSound.url} loop preload="auto" aria-hidden="true" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-ambient-sound-control
        aria-label={isPlaying ? "Pause ambient sound" : "Play ambient sound"}
        aria-pressed={isPlaying}
        title={isPlaying ? "Pause ambient sound" : "Play ambient sound"}
        onClick={togglePlayback}
        className={`ambient-sound-control ${isPlaying ? "is-playing" : "is-paused"}`}
      >
        <span className="ambient-sound-bars" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
      </Button>
    </>
  );
};

export default AmbientSoundControl;