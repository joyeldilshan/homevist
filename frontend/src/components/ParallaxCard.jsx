import React, { useState, useRef } from "react";
import { use3DParallax } from "../hooks/use3DParallax";

export default function ParallaxCard({
  children,
  style = {},
  className = "",
  maxRotation = 6,
  scale = 1.015,
  onClick,
  glowColor = "rgba(229, 62, 62, 0.08)",
  glowRadius = 160,
  ...props
}) {
  const { ref, style: parallaxStyle, onMouseMove, onMouseLeave } = use3DParallax({
    maxRotation,
    scale,
  });

  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e) => {
    onMouseMove(e);
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCoords({ x, y });
    setHovering(true);
  };

  const handleMouseLeave = () => {
    onMouseLeave();
    setHovering(false);
  };

  const combinedStyle = {
    ...style,
    ...parallaxStyle,
    position: "relative",
    background: hovering
      ? `radial-gradient(circle ${glowRadius}px at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%), #fff`
      : style.background || "#fff",
    transition: hovering
      ? "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.25s, box-shadow 0.25s"
      : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.25s, box-shadow 0.25s, background 0.4s",
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={combinedStyle}
      {...props}
    >
      {/* Glowing spotlight border overlay */}
      {hovering && (
        <div
          style={{
            position: "absolute",
            inset: -1.5,
            borderRadius: "inherit",
            padding: 1.5,
            background: `radial-gradient(circle ${glowRadius + 20}px at ${coords.x}px ${coords.y}px, var(--red, #E53E3E), transparent 60%)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}
      {/* Card Content wrapper to make sure it floats on top of the glowing border */}
      <div style={{ position: "relative", zIndex: 2, height: "100%", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
