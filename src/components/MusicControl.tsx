import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSiteMusic } from "@/components/SiteMusicProvider";
import { useSiteTheme } from "@/components/SiteThemeProvider";

const MusicControl: React.FC = () => {
  const { isPlaying, toggleMusic } = useSiteMusic();
  const { isMinimal } = useSiteTheme();

  const handleToggle = async () => {
    await toggleMusic();
  };

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      aria-label={
        isPlaying ? "Mute background music" : "Play background music"
      }
      aria-pressed={isPlaying}
      title={isPlaying ? "Mute music" : "Play music"}
      className={`music-control ${
        isPlaying ? "music-control-playing" : ""
      } ${isMinimal ? "music-control-minimal" : "music-control-glass"}`}
    >
      <span className="music-control-halo" aria-hidden="true" />

      <span className="music-control-icon" aria-hidden="true">
        {isPlaying ? <Volume2 /> : <VolumeX />}
      </span>

      <span className="music-control-pulse" aria-hidden="true" />
    </button>
  );
};

export default MusicControl;
