import { useState, useRef, useEffect } from "react";

export function use3DParallax(options = {}) {
  const { maxRotation = 8, scale = 1.02 } = options;
  const [style, setStyle] = useState({});
  const ref = useRef(null);
  const isTouchRef = useRef(false);

  useEffect(() => {
    // Detect touch device to avoid jumpy hover states on tap
    const detectTouch = () => {
      isTouchRef.current = true;
    };
    window.addEventListener("touchstart", detectTouch, { passive: true });
    return () => window.removeEventListener("touchstart", detectTouch);
  }, []);

  const handleMouseMove = (e) => {
    if (isTouchRef.current || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top;  // y position within the element

    // Normalized position from -0.5 to 0.5
    const px = (x / rect.width) - 0.5;
    const py = (y / rect.height) - 0.5;

    // Calculate rotation angles
    const rotateX = -(py * maxRotation * 2).toFixed(2);
    const rotateY = (px * maxRotation * 2).toFixed(2);

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`,
      transition: "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)",
    });
  };

  const handleMouseLeave = () => {
    if (isTouchRef.current) return;
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
    });
  };

  return {
    ref,
    style,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };
}
