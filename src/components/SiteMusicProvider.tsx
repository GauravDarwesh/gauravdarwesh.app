import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type SiteMusicContextType = {
  isPlaying: boolean;
  volume: number;
  playMusic: () => Promise<boolean>;
  pauseMusic: () => void;
  toggleMusic: () => Promise<void>;
  setVolume: (volume: number) => void;
};

const SiteMusicContext = createContext<SiteMusicContextType | null>(null);

const MUSIC_SRC = "/music/the-velvet-hour.mp3";
const MUSIC_PREFERENCE_KEY = "gdx_site_music_preference";

export const SiteMusicProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.18);

  useEffect(() => {
    const audio = new Audio(MUSIC_SRC);

    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.18;

    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    /*
     * If the visitor previously enabled music, try to resume it.
     * Browsers may still block this until another interaction.
     */
    const savedPreference = localStorage.getItem(
      MUSIC_PREFERENCE_KEY,
    );

    if (savedPreference === "on") {
      void audio.play().catch(() => {
        /*
         * Autoplay blocked.
         * The next user interaction can call playMusic().
         */
      });
    }

    return () => {
      audio.pause();
      audio.src = "";

      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);

      audioRef.current = null;
    };
  }, []);

  const playMusic = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current;

    if (!audio) return false;

    try {
      await audio.play();

      localStorage.setItem(MUSIC_PREFERENCE_KEY, "on");

      setIsPlaying(true);

      return true;
    } catch (error) {
      console.warn("Background music could not start:", error);
      return false;
    }
  }, []);

  const pauseMusic = useCallback(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();

    localStorage.setItem(MUSIC_PREFERENCE_KEY, "off");

    setIsPlaying(false);
  }, []);

  const toggleMusic = useCallback(async () => {
    if (audioRef.current?.paused) {
      await playMusic();
    } else {
      pauseMusic();
    }
  }, [pauseMusic, playMusic]);

  const setVolume = useCallback((nextVolume: number) => {
    const safeVolume = Math.min(1, Math.max(0, nextVolume));

    setVolumeState(safeVolume);

    if (audioRef.current) {
      audioRef.current.volume = safeVolume;
    }
  }, []);

  return (
    <SiteMusicContext.Provider
      value={{
        isPlaying,
        volume,
        playMusic,
        pauseMusic,
        toggleMusic,
        setVolume,
      }}
    >
      {children}
    </SiteMusicContext.Provider>
  );
};

export const useSiteMusic = () => {
  const context = useContext(SiteMusicContext);

  if (!context) {
    throw new Error(
      "useSiteMusic must be used inside SiteMusicProvider",
    );
  }

  return context;
};
