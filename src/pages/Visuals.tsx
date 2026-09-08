import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import NavigationToggle from "@/components/NavigationToggle";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import MarqueeAlongSvgPath from "@/components/fancy/blocks/marquee-along-svg-path";

const path =
  "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5";

const collections = [
  {
    title: "Japan 2025 Collection",
    location: "Japan",
    year: "2025",
    items: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/A6AE9E26-5645-4F8A-BC54-E8A5B6311D7C.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/D3FD6C99-BF7F-4001-9E8A-3F1F3B25666D.JPG",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6477.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6513.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6529.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Japan%202025/IMG_6530.jpg",
    ],
  },
  {
    title: "Japan 2024 Collection",
    location: "Japan",
    year: "2024",
    items: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1497.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1554.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1833.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_1899.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2068.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2138.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2301.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2622.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/DSC_2779.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_2267.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_2370.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_4885.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_4892.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/JPN-2024/IMG_4894.jpg",
    ],
  },
  {
    title: "Europe 2016 Collection",
    location: "Europe",
    year: "2016",
    items: [
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160614_135031.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160616_115817.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160616_124214.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160617_171820.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160617_172510.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160618_143958.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160618_145139.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160618_152220.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160619_121351.jpg",
      "https://zdrcjhohalgzhlbufwcl.supabase.co/storage/v1/object/public/Europe%202016/IMG_20160623_102110.jpg",
    ],
  },
];

const Visuals = () => {
  const [currentCollection, setCurrentCollection] = useState(0);

  const [activeImage, setActiveImage] = useState<{
    src: string;
    index: number;
  } | null>(null);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const wasDraggedRef = useRef(false);

  const collection = collections[currentCollection];

  const collectionLabel = useMemo(() => {
    return `${collection.location} — ${collection.year}`;
  }, [collection]);

  /*
   * Lock page scrolling while the image viewer is open.
   */
  useEffect(() => {
    if (activeImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [activeImage]);

  /*
   * Escape key closes the image viewer.
   */
  useEffect(() => {
    if (!activeImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeImage]);

  const nextCollection = () => {
    setCurrentCollection((current) => (current === collections.length - 1 ? 0 : current + 1));
  };

  const prevCollection = () => {
    setCurrentCollection((current) => (current === 0 ? collections.length - 1 : current - 1));
  };

  const openImage = (src: string, index: number) => {
    /*
     * Ignore click generated after the marquee has actually
     * been dragged.
     */
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }

    setActiveImage({
      src,
      index,
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    wasDraggedRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;

    const distance = Math.sqrt(
      Math.pow(event.clientX - dragStartRef.current.x, 2) + Math.pow(event.clientY - dragStartRef.current.y, 2),
    );

    if (distance > 8) {
      wasDraggedRef.current = true;
    }
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  return (
    <div
      className="site-page min-h-screen w-full relative overflow-hidden"
      onContextMenu={(event) => event.preventDefault()}
    >
      <Helmet>
        <title>Visuals — Photography by Gaurav Darwesh</title>

        <meta
          name="description"
          content="Photo collections from Gaurav Darwesh's travels, including Japan and Europe."
        />

        <link rel="canonical" href="https://gauravdarwesh.app/visuals" />

        <meta property="og:title" content="Visuals — Photography by Gaurav Darwesh" />

        <meta property="og:description" content="Photo collections from Gaurav Darwesh's travels." />

        <meta property="og:url" content="https://gauravdarwesh.app/visuals" />
      </Helmet>

      <h1 className="sr-only">Visuals — photography collections by Gaurav Darwesh</h1>

      {/* Background */}
      <div className="site-background orange-bg fixed inset-0 pointer-events-none select-none" aria-hidden="true" />

      {/* Navigation */}
      <NavigationToggle
        isModalOpen={!!activeImage}
        onCloseModal={() => setActiveImage(null)}
        isBlurred={!!activeImage}
      />

      {/* Main content */}
      <main className="relative z-10 min-h-screen w-full flex flex-col">
        {/* Header */}
        <div className="pt-24 sm:pt-28 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            {/* Collection label */}
            <div
              className="
                h-9 px-4
                rounded-full
                bg-white/10
                hover:bg-white/15
                border border-white/20
                backdrop-blur-md
                text-white/90
                text-[12px]
                tracking-wide
                flex items-center
                shadow-lg
                transition-all duration-300
                select-none
              "
            >
              {collectionLabel}
            </div>

            {/* Collection navigation */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevCollection}
                className="
                  flex items-center justify-center
                  w-9 h-9
                  rounded-full
                  bg-white/10
                  hover:bg-white/20
                  backdrop-blur-md
                  border border-white/20
                  text-white
                  transition-all duration-300
                  hover:scale-105
                  shadow-lg
                "
                aria-label="Previous collection"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={nextCollection}
                className="
                  flex items-center justify-center
                  w-9 h-9
                  rounded-full
                  bg-white/10
                  hover:bg-white/20
                  backdrop-blur-md
                  border border-white/20
                  text-white
                  transition-all duration-300
                  hover:scale-105
                  shadow-lg
                "
                aria-label="Next collection"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Marquee section */}
        <div className="flex-1 min-h-0 flex items-center justify-center px-0 sm:px-4">
          <div
            className="
              relative
              w-full
              h-[62vh]
              sm:h-[68vh]
              lg:h-[72vh]
              overflow-hidden
            "
          >
            {/* Soft glass frame */}
            <div
              className="
                absolute inset-x-4 sm:inset-x-6 lg:inset-x-10
                inset-y-8 sm:inset-y-10
                rounded-[2rem]
                bg-white/[0.035]
                border border-white/[0.10]
                backdrop-blur-[2px]
                pointer-events-none
              "
            />

            <MarqueeAlongSvgPath
              key={currentCollection}
              path={path}
              viewBox="0 0 996 330"
              baseVelocity={7}
              slowdownOnHover={true}
              draggable={true}
              repeat={2}
              dragSensitivity={0.1}
              responsive
              grabCursor
              className="absolute inset-0 w-full h-full scale-[1.02]"
            >
              {collection.items.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => openImage(src, index)}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  aria-label={`Open ${collectionLabel} image ${index + 1}`}
                  className="
                    group
                    relative
                    block
                    w-24
                    sm:w-28
                    md:w-32
                    lg:w-36
                    h-[210px]
                    sm:h-[250px]
                    md:h-[275px]
                    lg:h-[300px]
                    flex-shrink-0
                    rounded-[18px]
                    overflow-hidden
                    border
                    border-white/20
                    bg-white/10
                    shadow-2xl
                    cursor-pointer
                    focus:outline-none
                  "
                >
                  <img
                    src={src}
                    alt={`${collectionLabel} — image ${index + 1}`}
                    draggable={false}
                    loading="lazy"
                    className="
                      absolute inset-0
                      w-full h-full
                      object-cover
                      select-none
                      transition-transform
                      duration-500
                      ease-out
                      group-hover:scale-[1.06]
                    "
                  />

                  {/* Image glass overlay */}
                  <div
                    className="
                      absolute inset-0
                      bg-gradient-to-t
                      from-black/35
                      via-transparent
                      to-white/[0.04]
                      opacity-70
                      group-hover:opacity-90
                      transition-opacity duration-300
                    "
                  />

                  {/* Hover frame */}
                  <div
                    className="
                      absolute inset-1.5
                      rounded-[14px]
                      border border-white/0
                      group-hover:border-white/30
                      transition-all duration-300
                    "
                  />
                </button>
              ))}
            </MarqueeAlongSvgPath>

            {/* Bottom hint */}
            <div
              className="
                absolute
                bottom-10
                left-1/2
                -translate-x-1/2
                pointer-events-none
              "
            >
              <div
                className="
                  px-4 h-8
                  rounded-full
                  bg-black/10
                  border border-white/10
                  backdrop-blur-md
                  flex items-center
                  text-[11px]
                  text-white/55
                  whitespace-nowrap
                  shadow-lg
                "
              >
                Drag to explore · Click an image to open
              </div>
            </div>
          </div>
        </div>

        {/* Collection counter */}
        <div className="pb-8 sm:pb-10 flex justify-center">
          <div
            className="
              h-8 px-3
              rounded-full
              bg-white/10
              border border-white/15
              backdrop-blur-md
              text-white/55
              text-[11px]
              flex items-center
            "
          >
            {String(currentCollection + 1).padStart(2, "0")} / {String(collections.length).padStart(2, "0")}
          </div>
        </div>
      </main>

      {/* Full-screen image viewer */}
      {activeImage && (
        <div
          className="
            fixed inset-0
            z-[60]
            bg-black/60
            backdrop-blur-xl
            flex
            items-center
            justify-center
            p-4
            sm:p-6
            lg:p-10
          "
          onClick={() => setActiveImage(null)}
        >
          {/* Blurred image ambience */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url("${activeImage.src}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
              filter: "blur(55px)",
              transform: "scale(1.08)",
            }}
          />

          {/* Viewer */}
          <div
            className="
              relative
              z-10
              w-full
              max-w-7xl
              h-[88vh]
              sm:h-[90vh]
              rounded-[1.5rem]
              sm:rounded-[2rem]
              bg-white/[0.055]
              border border-white/20
              backdrop-blur-xl
              shadow-2xl
              overflow-hidden
              flex flex-col
            "
            onClick={(event) => event.stopPropagation()}
          >
            {/* Top bar */}
            <div
              className="
                absolute
                top-0
                left-0
                right-0
                z-20
                p-4
                sm:p-5
                flex
                items-start
                justify-between
                pointer-events-none
              "
            >
              {/* Description */}
              <div
                className="
                  pointer-events-auto
                  flex items-center
                  h-9
                  px-4
                  rounded-full
                  bg-black/20
                  border border-white/15
                  backdrop-blur-xl
                  text-white/85
                  text-[12px]
                  shadow-lg
                "
              >
                {collectionLabel}
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={() => setActiveImage(null)}
                className="
                  pointer-events-auto
                  flex items-center justify-center
                  w-9 h-9
                  rounded-full
                  bg-black/20
                  hover:bg-white/15
                  border border-white/15
                  backdrop-blur-xl
                  text-white/90
                  transition-all duration-300
                  hover:scale-105
                  shadow-lg
                "
                aria-label="Close image viewer"
              >
                <X size={17} />
              </button>
            </div>

            {/* Image */}
            <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center p-3 sm:p-5 lg:p-8">
              <img
                src={activeImage.src}
                alt={`${collectionLabel} — image ${activeImage.index + 1}`}
                draggable={false}
                className="
                  max-w-full
                  max-h-full
                  w-auto
                  h-auto
                  object-contain
                  rounded-xl
                  sm:rounded-2xl
                  shadow-2xl
                  select-none
                "
              />
            </div>

            {/* Bottom metadata */}
            <div
              className="
                absolute
                bottom-0
                left-0
                right-0
                z-20
                p-4
                sm:p-5
                flex
                justify-center
                pointer-events-none
              "
            >
              <div
                className="
                  px-4
                  h-8
                  rounded-full
                  bg-black/20
                  border border-white/10
                  backdrop-blur-xl
                  text-white/55
                  text-[11px]
                  flex items-center
                  shadow-lg
                "
              >
                {String(activeImage.index + 1).padStart(2, "0")} / {String(collection.items.length).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visuals;
