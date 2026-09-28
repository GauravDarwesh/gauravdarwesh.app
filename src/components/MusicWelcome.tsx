import React, { useEffect, useState } from "react";
import { Music2, X } from "lucide-react";
import { useSiteMusic } from "@/components/SiteMusicProvider";

const SESSION_PROMPT_KEY = "gdx_music_prompt_shown";

const MusicWelcome: React.FC = () => {
  const { playMusic } = useSiteMusic();

  const [visible, setVisible] = useState(false);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(
      SESSION_PROMPT_KEY,
    );

    if (alreadyShown) return;

    const timer = window.setTimeout(() => {
      setVisible(true);

      sessionStorage.setItem(
        SESSION_PROMPT_KEY,
        "true",
      );
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const handlePlay = async () => {
    setAnswering(true);

    const started = await playMusic();

    if (started) {
      setVisible(false);
      return;
    }

    setAnswering(false);
  };

  const handleDecline = () => {
    localStorage.setItem(
      "gdx_site_music_preference",
      "off",
    );

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60]
                 w-[min(460px,92vw)]"
    >
      <div
        className="rounded-2xl border border-white/20
                   bg-black/20 backdrop-blur-xl
                   shadow-2xl px-5 py-4"
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0
                       items-center justify-center
                       rounded-full bg-white/10"
          >
            <Music2 className="h-4 w-4 text-white" />
          </div>

          <div className="flex-1">
            <p className="text-white text-sm leading-relaxed">
              Hey — would you like some music while you
              explore?
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handlePlay}
                disabled={answering}
                className="rounded-full
                           bg-white/90
                           px-4 py-2
                           text-sm text-black
                           transition hover:bg-white
                           disabled:opacity-50"
              >
                {answering
                  ? "Starting..."
                  : "Play The Velvet Hour"}
              </button>

              <button
                onClick={handleDecline}
                disabled={answering}
                className="rounded-full
                           border border-white/20
                           bg-white/10
                           px-4 py-2
                           text-sm text-white
                           transition hover:bg-white/20
                           disabled:opacity-50"
              >
                No thanks
              </button>
            </div>
          </div>

          <button
            onClick={handleDecline}
            disabled={answering}
            className="text-white/50 transition hover:text-white"
            aria-label="Close music prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MusicWelcome;
