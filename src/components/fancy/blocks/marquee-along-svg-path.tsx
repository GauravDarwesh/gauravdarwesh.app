import React, { useEffect, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";

interface MarqueeAlongSvgPathProps {
  path: string;
  viewBox?: string;
  baseVelocity?: number;
  slowdownOnHover?: boolean;
  draggable?: boolean;
  dragSensitivity?: number;
  repeat?: number;
  responsive?: boolean;
  grabCursor?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Renders children repeatedly along an SVG path, animating them
 * continuously with optional hover slowdown and drag control.
 */
const MarqueeAlongSvgPath: React.FC<MarqueeAlongSvgPathProps> = ({
  path,
  viewBox = "0 0 100 100",
  baseVelocity = 5,
  slowdownOnHover = false,
  draggable = false,
  dragSensitivity = 0.1,
  repeat = 1,
  responsive = true,
  grabCursor = false,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const [pathLength, setPathLength] = useState(0);
  const [scale, setScale] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const progress = useMotionValue(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dragStartX = useRef(0);
  const dragStartProgress = useRef(0);

  const items = React.Children.toArray(children);
  const total = items.length * Math.max(1, repeat);

  /* Measure the path and container scaling. */
  useEffect(() => {
    const measure = () => {
      if (pathRef.current) {
        setPathLength(pathRef.current.getTotalLength());
      }

      if (responsive && containerRef.current) {
        const [, , vbWidth] = viewBox.split(" ").map(Number);
        const width = containerRef.current.clientWidth;

        if (vbWidth) setScale(width / vbWidth);
      }
    };

    measure();

    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, [path, viewBox, responsive]);

  useAnimationFrame((_, delta) => {
    if (!pathLength || !pathRef.current || isDragging) return;

    const speed = isHovered && slowdownOnHover ? baseVelocity * 0.25 : baseVelocity;

    progress.set(progress.get() + (speed * delta) / 1000 / 100);

    render();
  });

  const render = () => {
    const p = pathRef.current;

    if (!p || !pathLength) return;

    const base = progress.get();

    itemRefs.current.forEach((el, index) => {
      if (!el) return;

      const offset = (((base + index / total) % 1) + 1) % 1;
      const point = p.getPointAtLength(offset * pathLength);

      el.style.transform = `translate3d(${point.x * scale}px, ${point.y * scale}px, 0) translate(-50%, -50%)`;
    });
  };

  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathLength, scale, total]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!draggable) return;

    setIsDragging(true);
    dragStartX.current = event.clientX;
    dragStartProgress.current = progress.get();
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!draggable || !isDragging) return;

    const delta = (event.clientX - dragStartX.current) * dragSensitivity;

    progress.set(dragStartProgress.current + delta / 100);

    render();
  };

  const endDrag = () => setIsDragging(false);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ cursor: grabCursor ? (isDragging ? "grabbing" : "grab") : undefined, touchAction: "pan-y" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <svg viewBox={viewBox} className="absolute inset-0 w-full h-full pointer-events-none opacity-0" aria-hidden="true">
        <path ref={pathRef} d={path} fill="none" />
      </svg>

      <motion.div className="absolute inset-0">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="absolute top-0 left-0 will-change-transform"
          >
            {items[index % items.length]}
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default MarqueeAlongSvgPath;
