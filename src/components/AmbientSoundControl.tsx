import { useCallback, useEffect, useRef } from "react";
import ambientSound from "@/assets/gdx-warm-ambient.mp3.asset.json";
import minimalPianoSound from "@/assets/gdx-minimal-piano-seamless.mp3.asset.json";
import { useSiteTheme } from "@/components/SiteThemeProvider";

const AMBIENT_VOLUME = 0.2;
const MINIMAL_VOLUME = 0.18;
const FADE_IN_SECONDS = 1.1;
const THEME_CROSSFADE_SECONDS = 1.4;

type AudioGraph = {
  context: AudioContext;
  ambientGain: GainNode;
  minimalGain: GainNode;
  sourcesStarted: boolean;
};

const AmbientSoundControl = () => {
  const { isMinimal } = useSiteTheme();
  const isMinimalRef = useRef(isMinimal);
  const graphRef = useRef<AudioGraph | null>(null);
  const buffersRef = useRef<AudioBuffer[] | null>(null);
  const loadingRef = useRef<Promise<AudioBuffer[]> | null>(null);
  const mountedRef = useRef(true);

  isMinimalRef.current = isMinimal;

  const setThemeMix = useCallback((minimal: boolean, durationSeconds: number) => {
    const graph = graphRef.current;
    if (!graph) return;

    const now = graph.context.currentTime;
    const ambientTarget = minimal ? 0 : AMBIENT_VOLUME;
    const minimalTarget = minimal ? MINIMAL_VOLUME : 0;

    [
      [graph.ambientGain.gain, ambientTarget],
      [graph.minimalGain.gain, minimalTarget],
    ].forEach(([parameter, target]) => {
      const gain = parameter as AudioParam;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(target as number, now + durationSeconds);
    });
  }, []);

  const loadBuffers = useCallback((context: AudioContext) => {
    if (buffersRef.current) return Promise.resolve(buffersRef.current);
    if (loadingRef.current) return loadingRef.current;

    loadingRef.current = Promise.all(
      [ambientSound.url, minimalPianoSound.url].map(async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Unable to load soundtrack: ${response.status}`);
        return context.decodeAudioData(await response.arrayBuffer());
      }),
    );

    loadingRef.current.then((buffers) => {
      buffersRef.current = buffers;
    }).catch(() => {
      loadingRef.current = null;
    });

    return loadingRef.current;
  }, []);

  const startSources = useCallback(async () => {
    const graph = graphRef.current;
    if (!graph || graph.sourcesStarted) return;

    const buffers = await loadBuffers(graph.context);
    if (!mountedRef.current || graphRef.current !== graph || graph.sourcesStarted) return;

    const ambientSource = graph.context.createBufferSource();
    const minimalSource = graph.context.createBufferSource();
    ambientSource.buffer = buffers[0];
    minimalSource.buffer = buffers[1];
    ambientSource.loop = true;
    minimalSource.loop = true;
    ambientSource.connect(graph.ambientGain);
    minimalSource.connect(graph.minimalGain);
    graph.sourcesStarted = true;
    ambientSource.start();
    minimalSource.start();
    setThemeMix(isMinimalRef.current, FADE_IN_SECONDS);
  }, [loadBuffers, setThemeMix]);

  const resumePlayback = useCallback(() => {
    const graph = graphRef.current;
    if (!graph || document.hidden) return;

    // Calling resume synchronously inside the original touch is essential on iOS.
    void graph.context.resume().catch(() => undefined);
    void startSources().catch(() => undefined);
  }, [startSources]);

  useEffect(() => {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;

    mountedRef.current = true;
    const context = new AudioContextConstructor();
    const ambientGain = context.createGain();
    const minimalGain = context.createGain();
    ambientGain.gain.value = 0;
    minimalGain.gain.value = 0;
    ambientGain.connect(context.destination);
    minimalGain.connect(context.destination);
    graphRef.current = { context, ambientGain, minimalGain, sourcesStarted: false };

    // Decode and schedule both loops immediately, even while a browser keeps the
    // context suspended. This lets autoplay-capable browsers begin without waiting
    // for a click and leaves only the context resume for restricted mobile browsers.
    resumePlayback();

    const handlePageReady = () => resumePlayback();
    const handleContextState = () => {
      if (context.state === "interrupted") resumePlayback();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        void context.suspend();
      } else {
        resumePlayback();
      }
    };

    document.addEventListener("pointerdown", resumePlayback, { capture: true, passive: true });
    document.addEventListener("touchstart", resumePlayback, { capture: true, passive: true });
    document.addEventListener("keydown", resumePlayback, { capture: true });
    document.addEventListener("visibilitychange", handleVisibility);
    context.addEventListener("statechange", handleContextState);
    window.addEventListener("load", handlePageReady);
    window.addEventListener("pageshow", handlePageReady);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("pointerdown", resumePlayback, { capture: true });
      document.removeEventListener("touchstart", resumePlayback, { capture: true });
      document.removeEventListener("keydown", resumePlayback, { capture: true });
      document.removeEventListener("visibilitychange", handleVisibility);
      context.removeEventListener("statechange", handleContextState);
      window.removeEventListener("load", handlePageReady);
      window.removeEventListener("pageshow", handlePageReady);
      graphRef.current = null;
      void context.close();
    };
  }, [resumePlayback]);

  useEffect(() => {
    resumePlayback();
    setThemeMix(isMinimal, THEME_CROSSFADE_SECONDS);
  }, [isMinimal, resumePlayback, setThemeMix]);

  return null;
};

export default AmbientSoundControl;