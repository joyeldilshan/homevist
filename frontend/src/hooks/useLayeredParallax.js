import { useState, useRef, useEffect } from "react";

export function useLayeredParallax() {
  const containerRef = useRef(null);
  const [offsets, setOffsets] = useState({ x: 0, y: 0, hovering: false });
  const isTouchRef = useRef(false);

  useEffect(() => {
    // Detect touch device to avoid jumpy hover states
    const detectTouch = () => {
      isTouchRef.current = true;
    };
    window.addEventListener("touchstart", detectTouch, { passive: true });
    return () => window.removeEventListener("touchstart", detectTouch);
  }, []);

  const handleMouseMove = (e) => {
    if (isTouchRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Normalized coordinates from -1 to 1 representing position relative to center
    const px = ((x / rect.width) - 0.5) * 2;
    const py = ((y / rect.height) - 0.5) * 2;

    setOffsets({ x: px, y: py, hovering: true });
  };

  const handleMouseLeave = () => {
    if (isTouchRef.current) return;
    setOffsets({ x: 0, y: 0, hovering: false });
  };

  /**
   * Generates dynamic transform and transition styles for a layer based on depth.
   * 
   * @param {number} depth - Positive for foreground (moves with mouse), negative for background (moves opposite).
   * @returns {object} Inline styling object.
   */
  const getLayerStyle = (depth) => {
    const { x, y, hovering } = offsets;

    if (isTouchRef.current) {
      return {
        transform: "none",
        transition: "transform 0.5s ease",
      };
    }

    const transition = hovering
      ? "transform 0.15s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s"
      : "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s";

    // Dynamic translations based on depth
    const tx = (x * depth * 12).toFixed(1);
    const ty = (y * depth * 12).toFixed(1);
    
    // Dynamic 3D tilt rotations
    const rx = -(y * depth * 3).toFixed(1);
    const ry = (x * depth * 3).toFixed(1);

    // Apply translation, Z-depth and rotation in perspective space
    return {
      transform: `perspective(1000px) translate3d(${tx}px, ${ty}px, ${depth * 8}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
      transition,
    };
  };

  return {
    containerRef,
    hovering: offsets.hovering,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    getLayerStyle,
  };
}
