import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSiteMusic } from "@/components/SiteMusicProvider";

const MusicControl: React.FC = () => {
  const { isPlaying, toggleMusic } = useSiteMusic();

  return (
    <button
      type="button"
      onClick={() => void toggleMusic()}
      aria-label={isPlaying ? "Mute background music" : "Play background music"}
      aria-pressed={isPlaying}
      title={isPlaying ? "Mute music" : "Play music"}
      className={`gdx-music-control ${isPlaying ? "is-playing" : ""}`}
    >
      <span className="gdx-music-icon gdx-music-icon-muted" aria-hidden="true">
        <VolumeX />
      </span>

      <span className="gdx-music-icon gdx-music-icon-playing" aria-hidden="true">
        <Volume2 />
      </span>

      <span className="gdx-music-state" aria-hidden="true" />
    </button>
  );
};

export default MusicControl;
