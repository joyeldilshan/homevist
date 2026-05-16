import { useEffect, useRef } from "react";

export default function LabBackground({ opacity = 0.45 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    /* ── Red Blood Cells ── */
    const rbcs = Array.from({ length: 18 }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 12 + 8,
      dx:    (Math.random() - 0.5) * 0.4,
      dy:    (Math.random() - 0.5) * 0.4,
      rot:   Math.random() * Math.PI * 2,
      drot:  (Math.random() - 0.5) * 0.008,
      phase: Math.random() * Math.PI * 2,
      op:    Math.random() * 0.35 + 0.25,
    }));

    /* ── Floating dots (platelets) ── */
    const dots = Array.from({ length: 40 }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      r:     Math.random() * 2.5 + 1,
      dx:    (Math.random() - 0.5) * 0.5,
      dy:    (Math.random() - 0.5) * 0.5,
      op:    Math.random() * 0.3 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));

    /* ── Syringes ── */
    const syringes = Array.from({ length: 4 }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      angle: (Math.random() - 0.5) * 1.2,
      scale: 0.55 + Math.random() * 0.45,
      vx:    (Math.random() - 0.5) * 0.2,
      vy:    (Math.random() - 0.5) * 0.2,
      vr:    (Math.random() - 0.5) * 0.003,
      op:    0.18 + Math.random() * 0.15,
    }));

    /* ── Test tubes ── */
    const tubes = Array.from({ length: 6 }, () => ({
      x:     Math.random() * window.innerWidth,
      y:     Math.random() * window.innerHeight,
      phase: Math.random() * Math.PI * 2,
      spd:   0.007 + Math.random() * 0.006,
      vx:    (Math.random() - 0.5) * 0.18,
      vy:    (Math.random() - 0.5) * 0.18,
      op:    0.2 + Math.random() * 0.2,
      liq:   0.4 + Math.random() * 0.4,
    }));

    // ── Draw helpers ───────────────────────────────────────────
    const drawRBC = (x, y, r, rot, op) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = op;
      // Outer ellipse
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle   = "rgba(220,38,38,0.14)";
      ctx.strokeStyle = "rgba(220,38,38,0.55)";
      ctx.lineWidth   = 1.2;
      ctx.fill();
      ctx.stroke();
      // Inner depression
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.5, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220,38,38,0.07)";
      ctx.fill();
      // Rim highlight
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.18, r * 0.75, r * 0.18, 0, 0, Math.PI);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth   = 0.7;
      ctx.stroke();
      ctx.restore();
    };

    const drawSyringe = (sx, sy, angle, scale, op) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.globalAlpha = op;
      const W = 18, L = 70;
      // Barrel
      ctx.beginPath();
      ctx.roundRect(-W/2, -L/2, W, L, 4);
      ctx.strokeStyle = "rgba(220,38,38,0.45)";
      ctx.fillStyle   = "rgba(220,38,38,0.07)";
      ctx.lineWidth   = 1.5;
      ctx.fill();
      ctx.stroke();
      // Liquid inside
      ctx.beginPath();
      ctx.roundRect(-W/2+2.5, L/2 - L*0.55, W-5, L*0.5, 2);
      ctx.fillStyle = "rgba(220,38,38,0.25)";
      ctx.fill();
      // Graduation marks
      for (let i = 1; i < 5; i++) {
        const gy = -L/2 + 10 + i * (L * 0.35 / 5);
        ctx.beginPath();
        ctx.moveTo(-W/2 + 3, gy);
        ctx.lineTo(-W/2 + 10, gy);
        ctx.strokeStyle = "rgba(220,38,38,0.3)";
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }
      // Needle
      ctx.beginPath();
      ctx.moveTo(-2.5, L/2);
      ctx.lineTo(2.5,  L/2);
      ctx.lineTo(0.8,  L/2 + 26);
      ctx.lineTo(-0.8, L/2 + 26);
      ctx.closePath();
      ctx.fillStyle = "rgba(160,170,190,0.5)";
      ctx.fill();
      // Hub
      ctx.beginPath();
      ctx.roundRect(-W/2+2, L/2-6, W-4, 12, 3);
      ctx.fillStyle   = "rgba(220,38,38,0.18)";
      ctx.strokeStyle = "rgba(220,38,38,0.4)";
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
      // Plunger rod
      ctx.beginPath();
      ctx.rect(-2, -L/2 - 20, 4, 24);
      ctx.fillStyle = "rgba(220,38,38,0.3)";
      ctx.fill();
      // Plunger handle
      ctx.beginPath();
      ctx.roundRect(-W/2+1, -L/2 - 22, W-2, 10, 3);
      ctx.fillStyle   = "rgba(220,38,38,0.18)";
      ctx.strokeStyle = "rgba(220,38,38,0.4)";
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawTestTube = (tx, ty, liqFrac, phase, op) => {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(Math.sin(phase) * 0.12);
      ctx.globalAlpha = op;
      const W = 13, H2 = 40, rad = W/2;
      // Body
      ctx.beginPath();
      ctx.moveTo(-W/2, -H2/2);
      ctx.lineTo(-W/2,  H2/2 - rad);
      ctx.arc(0, H2/2 - rad, rad, Math.PI, 0);
      ctx.lineTo(W/2, -H2/2);
      ctx.fillStyle   = "rgba(220,38,38,0.06)";
      ctx.strokeStyle = "rgba(220,38,38,0.4)";
      ctx.lineWidth   = 1.2;
      ctx.fill();
      ctx.stroke();
      // Liquid
      const liqTop = H2/2 - rad - (H2 - rad*2) * liqFrac;
      ctx.beginPath();
      ctx.moveTo(-W/2 + 1.5, liqTop);
      ctx.lineTo(-W/2 + 1.5, H2/2 - rad);
      ctx.arc(0, H2/2 - rad, rad - 1.5, Math.PI, 0);
      ctx.lineTo(W/2 - 1.5, liqTop);
      ctx.closePath();
      ctx.fillStyle = "rgba(220,38,38,0.28)";
      ctx.fill();
      // Meniscus line
      ctx.beginPath();
      ctx.ellipse(0, liqTop, W/2 - 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220,38,38,0.18)";
      ctx.fill();
      // Cap
      ctx.beginPath();
      ctx.roundRect(-W/2 - 2, -H2/2 - 9, W+4, 11, 3);
      ctx.fillStyle   = "rgba(220,38,38,0.32)";
      ctx.strokeStyle = "rgba(220,38,38,0.45)";
      ctx.lineWidth   = 1;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawDNA = (hx, baseT) => {
      const H = canvas.height;
      const amp  = 32;
      const steps = 70;

      for (let s = 0; s < 2; s++) {
        const off = s === 0 ? 0 : Math.PI;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const p = i / steps;
          const y = p * H;
          const x = hx + Math.sin(p * Math.PI * 5.5 + baseT + off) * amp * (0.5 + p * 0.5);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0,   "rgba(220,38,38,0)");
        g.addColorStop(0.15,"rgba(220,38,38,0.55)");
        g.addColorStop(0.85,"rgba(220,38,38,0.55)");
        g.addColorStop(1,   "rgba(220,38,38,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth   = 1.4;
        ctx.stroke();
      }

      // Rungs + nodes
      for (let i = 1; i < steps - 1; i += 3) {
        const p  = i / steps;
        const y  = p * H;
        const sc = 0.5 + p * 0.5;
        const x1 = hx + Math.sin(p * Math.PI * 5.5 + baseT) * amp * sc;
        const x2 = hx + Math.sin(p * Math.PI * 5.5 + baseT + Math.PI) * amp * sc;
        const bright = Math.abs(Math.sin(p * Math.PI * 5.5 + baseT));
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.strokeStyle = `rgba(220,38,38,${0.07 + bright * 0.12})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
        if (bright > 0.7) {
          ctx.beginPath();
          ctx.arc(x1, y, 2.5 + bright * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(220,38,38,${0.35 + bright * 0.45})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x2, y, 2.5 + bright * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(252,129,129,${0.3 + bright * 0.35})`;
          ctx.fill();
        }
      }
    };

    // ── Main loop ───────────────────────────────────────────────
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.016;

      // DNA helices on left and right edges
      drawDNA(50,        t * 0.85);
      drawDNA(W - 50,    t * 0.7);

      // Platelets / dots
      dots.forEach(d => {
        d.x += d.dx; d.y += d.dy;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        const pulse = Math.sin(t * 1.5 + d.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220,38,38,${d.op * pulse})`;
        ctx.fill();
      });

      // Connection lines
      dots.slice(0, 25).forEach((a, i) => {
        dots.slice(i+1, 25).forEach(b => {
          const dist = Math.hypot(a.x-b.x, a.y-b.y);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(220,38,38,${0.05*(1-dist/100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      // Red blood cells
      rbcs.forEach(c => {
        c.x   += c.dx;  c.y   += c.dy;  c.rot += c.drot;
        if (c.x < -30)  c.x = W + 30;
        if (c.x > W+30) c.x = -30;
        if (c.y < -30)  c.y = H + 30;
        if (c.y > H+30) c.y = -30;
        const pulse = Math.sin(t * 0.9 + c.phase) * 0.08 + 0.92;
        drawRBC(c.x, c.y, c.r * pulse, c.rot, c.op);
      });

      // Syringes
      syringes.forEach(s => {
        s.x += s.vx; s.y += s.vy; s.angle += s.vr;
        if (s.x < -60 || s.x > W+60) s.vx *= -1;
        if (s.y < -80 || s.y > H+80) s.vy *= -1;
        drawSyringe(s.x, s.y, s.angle, s.scale, s.op);
      });

      // Test tubes
      tubes.forEach(tb => {
        tb.x += tb.vx; tb.y += tb.vy; tb.phase += tb.spd;
        if (tb.x < -30 || tb.x > W+30) tb.vx *= -1;
        if (tb.y < -50 || tb.y > H+50) tb.vy *= -1;
        const bob = Math.sin(tb.phase) * 7;
        drawTestTube(tb.x, tb.y + bob, tb.liq, tb.phase, tb.op);
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "fixed",
        top:           0,
        left:          0,
        width:         "100vw",
        height:        "100vh",
        pointerEvents: "none",
        zIndex:        0,
        opacity,
      }}
    />
  );
}