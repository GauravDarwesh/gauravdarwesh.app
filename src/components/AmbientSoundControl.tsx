import { useCallback, useEffect, useRef } from "react";
import ambientSound from "@/assets/gdx-warm-ambient-seamless.wav.asset.json";
import minimalPianoSound from "@/assets/gdx-minimal-piano-seamless.wav.asset.json";
import { useSiteTheme } from "@/components/SiteThemeProvider";

const AMBIENT_VOLUME = 0.12;
const MINIMAL_VOLUME = 0.1;
const FADE_IN_DURATION_MS = 1100;
const THEME_CROSSFADE_DURATION_MS = 1400;

const AmbientSoundControl = () => {
  const { isMinimal } = useSiteTheme();
  const glassAudioRef = useRef<HTMLAudioElement | null>(null);
  const minimalAudioRef = useRef<HTMLAudioElement | null>(null);
  const glassFadeFrameRef = useRef<number | null>(null);
  const minimalFadeFrameRef = useRef<number | null>(null);

  const clearFades = useCallback(() => {
    if (glassFadeFrameRef.current !== null) {
      window.cancelAnimationFrame(glassFadeFrameRef.current);
      glassFadeFrameRef.current = null;
    }
    if (minimalFadeFrameRef.current !== null) {
      window.cancelAnimationFrame(minimalFadeFrameRef.current);
      minimalFadeFrameRef.current = null;
    }
  }, []);

  const fadeVolume = useCallback(
    (audio: HTMLAudioElement | null, frameRef: React.MutableRefObject<number | null>, target: number, duration: number) => {
      if (!audio) return;

      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      const initial = audio.volume;
      const startedAt = performance.now();

      const updateVolume = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
        audio.volume = initial + (target - initial) * eased;

        if (progress >= 1) {
          frameRef.current = null;
          return;
        }

        frameRef.current = window.requestAnimationFrame(updateVolume);
      };

      frameRef.current = window.requestAnimationFrame(updateVolume);
    },
    [],
  );

  const applyThemeMix = useCallback((minimal: boolean, duration: number) => {
    fadeVolume(glassAudioRef.current, glassFadeFrameRef, minimal ? 0 : AMBIENT_VOLUME, duration);
    fadeVolume(minimalAudioRef.current, minimalFadeFrameRef, minimal ? MINIMAL_VOLUME : 0, duration);
  }, [fadeVolume]);

  const startPlayback = useCallback(async (minimal: boolean) => {
    const glassAudio = glassAudioRef.current;
    const minimalAudio = minimalAudioRef.current;
    if (!glassAudio || !minimalAudio || document.hidden) return false;

    clearFades();
    glassAudio.volume = 0;
    minimalAudio.volume = 0;

    try {
      await Promise.all([glassAudio.play(), minimalAudio.play()]);
      applyThemeMix(minimal, FADE_IN_DURATION_MS);
      return true;
    } catch {
      return false;
    }
  }, [applyThemeMix, clearFades]);

  useEffect(() => {
    const glassAudio = glassAudioRef.current;
    const minimalAudio = minimalAudioRef.current;
    if (!glassAudio || !minimalAudio) return;

    if (glassAudio.paused || minimalAudio.paused) {
      void startPlayback(isMinimal);
      return;
    }

    applyThemeMix(isMinimal, THEME_CROSSFADE_DURATION_MS);
  }, [applyThemeMix, isMinimal, startPlayback]);

  useEffect(() => {
    void startPlayback(isMinimal);

    const unlockPlayback = () => {
      if (glassAudioRef.current?.paused || minimalAudioRef.current?.paused) void startPlayback(isMinimal);
    };

    const handleVisibility = () => {
      const glassAudio = glassAudioRef.current;
      const minimalAudio = minimalAudioRef.current;
      if (!glassAudio || !minimalAudio) return;

      if (document.hidden) {
        clearFades();
        glassAudio.pause();
        minimalAudio.pause();
      } else {
        void startPlayback(isMinimal);
      }
    };

    document.addEventListener("pointerdown", unlockPlayback, { passive: true });
    document.addEventListener("keydown", unlockPlayback);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearFades();
      document.removeEventListener("pointerdown", unlockPlayback);
      document.removeEventListener("keydown", unlockPlayback);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [clearFades, isMinimal, startPlayback]);

  return (
    <div aria-hidden="true">
      <audio ref={glassAudioRef} src={ambientSound.url} loop preload="auto" />
      <audio ref={minimalAudioRef} src={minimalPianoSound.url} loop preload="auto" />
    </div>
  );
};

export default AmbientSoundControl;