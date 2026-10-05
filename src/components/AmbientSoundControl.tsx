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
  const isMinimalRef = useRef(isMinimal);
  const hasMountedRef = useRef(false);

  isMinimalRef.current = isMinimal;

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

  const ensurePlayback = useCallback(async (minimal: boolean, duration: number) => {
    const glassAudio = glassAudioRef.current;
    const minimalAudio = minimalAudioRef.current;
    if (!glassAudio || !minimalAudio || document.hidden) return false;

    // Start both tracks in the same browser-activation task. Mobile browsers can
    // consume the activation before a second play() call if the first is awaited.
    const glassPlay = glassAudio.paused ? glassAudio.play() : Promise.resolve();
    const minimalPlay = minimalAudio.paused ? minimalAudio.play() : Promise.resolve();
    const results = await Promise.allSettled([glassPlay, minimalPlay]);

    const activeAudio = isMinimalRef.current ? minimalAudio : glassAudio;
    if (activeAudio.paused) return false;

    applyThemeMix(isMinimalRef.current, duration);
    return results.some((result) => result.status === "fulfilled");
  }, [applyThemeMix]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    void ensurePlayback(isMinimal, THEME_CROSSFADE_DURATION_MS);
  }, [ensurePlayback, isMinimal]);

  useEffect(() => {
    const glassAudio = glassAudioRef.current;
    const minimalAudio = minimalAudioRef.current;
    if (!glassAudio || !minimalAudio) return;

    glassAudio.volume = 0;
    minimalAudio.volume = 0;
    void ensurePlayback(isMinimalRef.current, FADE_IN_DURATION_MS);

    const unlockPlayback = () => {
      if (glassAudio.paused || minimalAudio.paused) {
        void ensurePlayback(isMinimalRef.current, FADE_IN_DURATION_MS);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearFades();
        glassAudio.pause();
        minimalAudio.pause();
      } else {
        void ensurePlayback(isMinimalRef.current, FADE_IN_DURATION_MS);
      }
    };

    document.addEventListener("pointerdown", unlockPlayback, { passive: true, capture: true });
    document.addEventListener("touchstart", unlockPlayback, { passive: true, capture: true });
    document.addEventListener("keydown", unlockPlayback);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearFades();
      document.removeEventListener("pointerdown", unlockPlayback, { capture: true });
      document.removeEventListener("touchstart", unlockPlayback, { capture: true });
      document.removeEventListener("keydown", unlockPlayback);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [clearFades, ensurePlayback]);

  return (
    <div aria-hidden="true">
      <audio ref={glassAudioRef} src={ambientSound.url} loop preload="auto" autoPlay playsInline />
      <audio ref={minimalAudioRef} src={minimalPianoSound.url} loop preload="auto" autoPlay playsInline />
    </div>
  );
};

export default AmbientSoundControl;