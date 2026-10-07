import { useCallback, useEffect, useRef } from "react";
import ambientSound from "@/assets/gdx-warm-ambient.mp3.asset.json";
import minimalPianoSound from "@/assets/gdx-minimal-piano-seamless.mp3.asset.json";
import { useSiteTheme } from "@/components/SiteThemeProvider";

const AMBIENT_VOLUME = 0.2;
const MINIMAL_VOLUME = 0.18;
const FADE_STEP_MS = 50;
const FADE_STEP = 0.05;

type AudioPlayer = {
  element: HTMLAudioElement;
  source: "ambient" | "minimal";
};

const AmbientSoundControl = () => {
  const { isMinimal } = useSiteTheme();
  const isMinimalRef = useRef(isMinimal);
  const playerRef = useRef<AudioPlayer | null>(null);
  const preferredVolumeRef = useRef(isMinimal ? MINIMAL_VOLUME : AMBIENT_VOLUME);
  const mountedRef = useRef(true);
  const sourceSwapInProgressRef = useRef(false);

  isMinimalRef.current = isMinimal;
  preferredVolumeRef.current = isMinimal ? MINIMAL_VOLUME : AMBIENT_VOLUME;

  const createPlayer = useCallback((src: string, type: AudioPlayer["source"]) => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.playsInline = true;
    audio.volume = 0;
    audio.setAttribute("aria-hidden", "true");
    audio.style.position = "fixed";
    audio.style.width = "1px";
    audio.style.height = "1px";
    audio.style.opacity = "0";
    audio.style.pointerEvents = "none";
    audio.style.left = "-9999px";
    document.body.appendChild(audio);
    return { element: audio, source: type } satisfies AudioPlayer;
  }, []);

  const fadeTo = useCallback((audio: HTMLAudioElement, target: number, durationMs: number) => {
    const start = audio.volume;
    const delta = target - start;
    if (Math.abs(delta) < 0.001 || durationMs <= 0) {
      audio.volume = target;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
      let step = 0;

      const tick = () => {
        step += 1;
        audio.volume = Math.min(1, Math.max(0, start + delta * (step / steps)));

        if (step >= steps || Math.abs(audio.volume - target) < 0.001) {
          audio.volume = target;
          resolve();
          return;
        }

        window.setTimeout(tick, FADE_STEP_MS);
      };

      tick();
    });
  }, []);

  const playCurrent = useCallback(() => {
    const player = playerRef.current;
    if (!player || document.hidden) return;

    // Keep play() directly inside the original user-input call path.
    void player.element.play().catch(() => undefined);
  }, []);

  const ensurePlaying = useCallback(() => {
    const player = playerRef.current;
    if (!player || document.hidden) return;

    if (player.element.paused) {
      void player.element.play().catch(() => undefined);
    }
  }, []);

  const switchTrack = useCallback(
    async (minimal: boolean) => {
      const current = playerRef.current;
      if (!current || sourceSwapInProgressRef.current) return;

      const targetSource = minimal ? "minimal" : "ambient";
      if (current.source === targetSource) {
        ensurePlaying();
        await fadeTo(current.element, minimal ? MINIMAL_VOLUME : AMBIENT_VOLUME, 1400);
        return;
      }

      sourceSwapInProgressRef.current = true;

      try {
        const targetUrl = minimal ? minimalPianoSound.url : ambientSound.url;
        const targetVolume = minimal ? MINIMAL_VOLUME : AMBIENT_VOLUME;

        await fadeTo(current.element, 0, 500);
        current.element.pause();
        current.element.currentTime = 0;
        current.element.src = targetUrl;
        current.element.load();

        // The same HTMLAudioElement keeps the mobile browser's authorization
        // after the first successful user-initiated play.
        const playPromise = current.element.play();
        await playPromise.catch(() => undefined);

        if (mountedRef.current) {
          await fadeTo(current.element, targetVolume, 900);
          current.source = targetSource;
        }
      } finally {
        sourceSwapInProgressRef.current = false;
      }
    },
    [ensurePlaying, fadeTo],
  );

  useEffect(() => {
    mountedRef.current = true;

    const initialMinimal = isMinimalRef.current;
    const player = createPlayer(
      initialMinimal ? minimalPianoSound.url : ambientSound.url,
      initialMinimal ? "minimal" : "ambient",
    );

    player.element.volume = 0;
    playerRef.current = player;

    const handleUserActivation = () => {
      playCurrent();
      ensurePlaying();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        player.element.pause();
        return;
      }

      ensurePlaying();
    };

    const handlePageReady = () => {
      ensurePlaying();
    };

    document.addEventListener("pointerup", handleUserActivation, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchend", handleUserActivation, {
      capture: true,
      passive: true,
    });
    document.addEventListener("click", handleUserActivation, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", handleUserActivation, {
      capture: true,
    });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageReady);
    window.addEventListener("load", handlePageReady);

    // Desktop browsers may allow audible autoplay. Mobile browsers will reject
    // this call until the first user activation, which is expected.
    void player.element.play().catch(() => undefined);

    if (initialMinimal) {
      preferredVolumeRef.current = MINIMAL_VOLUME;
    } else {
      preferredVolumeRef.current = AMBIENT_VOLUME;
    }

    return () => {
      mountedRef.current = false;
      document.removeEventListener("pointerup", handleUserActivation, {
        capture: true,
      });
      document.removeEventListener("touchend", handleUserActivation, {
        capture: true,
      });
      document.removeEventListener("click", handleUserActivation, {
        capture: true,
      });
      document.removeEventListener("keydown", handleUserActivation, {
        capture: true,
      });
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageReady);
      window.removeEventListener("load", handlePageReady);

      player.element.pause();
      player.element.removeAttribute("src");
      player.element.load();
      player.element.remove();
      playerRef.current = null;
    };
  }, [createPlayer, ensurePlaying, playCurrent]);

  useEffect(() => {
    void switchTrack(isMinimal);
  }, [isMinimal, switchTrack]);

  return null;
};

export default AmbientSoundControl;
