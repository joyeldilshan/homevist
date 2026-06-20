import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import * as THREE from "three";

export default function Home() {
  const navigate = useNavigate();

  const [active, setActive] = useState("hero");
  const [open, setOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const heroRef = useRef(null);
  const dnaCanvasRef = useRef(null);
  const bloodCanvasRef = useRef(null);

  const { scrollY, scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  // Parallax transforms
  const heroY = useTransform(scrollY, [0, 800], [0, 300]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 0.85]);
  const gridY = useTransform(scrollY, [0, 3000], [0, -500]);
  const glowY = useTransform(scrollY, [0, 3000], [0, 800]);

  const sections = ["hero", "about", "features", "process", "stats", "reviews", "team", "faq", "contact"];

  // Scroll tracking
  useEffect(() => {
    const onScroll = () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          setActive(id);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mouse tracking for parallax cursor
  useEffect(() => {
    const onMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ============== 3D DNA HELIX ==============
  useEffect(() => {
    const canvas = dnaCanvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // DNA Helix construction
    const dnaGroup = new THREE.Group();
    const helixPoints = 60;
    const helixRadius = 2;
    const helixHeight = 18;

    for (let i = 0; i < helixPoints; i++) {
      const t = i / helixPoints;
      const angle = t * Math.PI * 6;
      const y = (t - 0.5) * helixHeight;

      // Strand 1 sphere
      const sphere1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xff2d55,
          emissive: 0xff2d55,
          emissiveIntensity: 0.4,
          metalness: 0.3,
          roughness: 0.4,
        })
      );
      sphere1.position.set(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius);
      dnaGroup.add(sphere1);

      // Strand 2 sphere
      const sphere2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x0078ff,
          emissive: 0x0078ff,
          emissiveIntensity: 0.4,
          metalness: 0.3,
          roughness: 0.4,
        })
      );
      sphere2.position.set(Math.cos(angle + Math.PI) * helixRadius, y, Math.sin(angle + Math.PI) * helixRadius);
      dnaGroup.add(sphere2);

      // Connecting rung every 3 spheres
      if (i % 3 === 0) {
        const rungGeometry = new THREE.CylinderGeometry(0.04, 0.04, helixRadius * 2, 8);
        const rung = new THREE.Mesh(
          rungGeometry,
          new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.4 })
        );
        rung.position.set(0, y, 0);
        rung.rotation.z = Math.PI / 2;
        rung.rotation.y = -angle;
        dnaGroup.add(rung);
      }
    }

    scene.add(dnaGroup);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const point1 = new THREE.PointLight(0xff2d55, 2, 30);
    point1.position.set(8, 5, 8);
    scene.add(point1);
    const point2 = new THREE.PointLight(0x0078ff, 2, 30);
    point2.position.set(-8, -5, 8);
    scene.add(point2);

    camera.position.z = 12;

    let animationId;
    let mouseX = 0, mouseY = 0;

    const updateMouse = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", updateMouse);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      dnaGroup.rotation.y += 0.006;
      dnaGroup.rotation.x += (mouseY * 0.3 - dnaGroup.rotation.x) * 0.05;
      dnaGroup.rotation.z += (mouseX * 0.2 - dnaGroup.rotation.z) * 0.05;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!canvas.clientWidth) return;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", updateMouse);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  // ============== 3D BLOOD CELLS ==============
  useEffect(() => {
    const canvas = bloodCanvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const cellsGroup = new THREE.Group();

    // Red blood cells (donut shape — biconcave-ish)
    for (let i = 0; i < 18; i++) {
      const cell = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.32, 16, 32),
        new THREE.MeshStandardMaterial({
          color: 0xff2d55,
          emissive: 0xcc0033,
          emissiveIntensity: 0.25,
          metalness: 0.2,
          roughness: 0.5,
        })
      );
      cell.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6
      );
      cell.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      cell.userData = {
        speedX: (Math.random() - 0.5) * 0.008,
        speedY: (Math.random() - 0.5) * 0.008,
        rotSpeed: (Math.random() - 0.5) * 0.015,
      };
      cellsGroup.add(cell);
    }

    // White blood cells (lumpy spheres)
    for (let i = 0; i < 5; i++) {
      const cell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.55, 1),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xeeeeee,
          emissiveIntensity: 0.1,
          metalness: 0.3,
          roughness: 0.7,
        })
      );
      cell.position.set(
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6
      );
      cell.userData = {
        speedX: (Math.random() - 0.5) * 0.006,
        speedY: (Math.random() - 0.5) * 0.006,
        rotSpeed: (Math.random() - 0.5) * 0.012,
      };
      cellsGroup.add(cell);
    }

    scene.add(cellsGroup);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(5, 5, 5);
    scene.add(dir);
    const pinkLight = new THREE.PointLight(0xff2d55, 1.5, 25);
    pinkLight.position.set(-5, 3, 5);
    scene.add(pinkLight);

    camera.position.z = 10;

    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      cellsGroup.children.forEach((cell) => {
        cell.position.x += cell.userData.speedX;
        cell.position.y += cell.userData.speedY;
        cell.rotation.x += cell.userData.rotSpeed;
        cell.rotation.y += cell.userData.rotSpeed * 0.7;

        // bounce off invisible walls
        if (cell.position.x > 8 || cell.position.x < -8) cell.userData.speedX *= -1;
        if (cell.position.y > 6 || cell.position.y < -6) cell.userData.speedY *= -1;
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!canvas.clientWidth) return;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  // ============== DATA ==============
  const features = [
    { icon: "🩸", title: "Home Blood Collection", desc: "Certified phlebotomists arrive at your doorstep with sterile, single-use equipment." },
    { icon: "⚡", title: "2-Hour Reports", desc: "Verified digital reports delivered with barcode authentication in record time." },
    { icon: "🔒", title: "Lab-Grade Security", desc: "End-to-end encrypted records. HIPAA-aligned data handling, always." },
    { icon: "📱", title: "Real-Time Tracking", desc: "Live phlebotomist tracking, instant updates, complete transparency." },
    { icon: "🧬", title: "200+ Test Panels", desc: "From full blood count to advanced hormone profiles — all from home." },
    { icon: "🏥", title: "Accredited Labs", desc: "Samples processed at NABL & ISO 15189 certified diagnostic centers." },
  ];

  const process = [
    { step: "01", title: "Book Your Test", desc: "Pick a test panel and time slot in under 60 seconds." },
    { step: "02", title: "We Arrive", desc: "Your certified phlebotomist arrives with sterile equipment." },
    { step: "03", title: "Sample Collected", desc: "Quick, painless collection in the comfort of your home." },
    { step: "04", title: "Get Reports", desc: "Digital report with barcode verification within hours." },
  ];

  const stats = [
    { value: "15K+", label: "Happy Patients" },
    { value: "4.9★", label: "Average Rating" },
    { value: "2h", label: "Report Turnaround" },
    { value: "200+", label: "Test Panels" },
  ];

  const reviews = [
    { name: "Anjali R.", role: "Patient, Jaffna", text: "The phlebotomist was so professional and gentle. I got my results before lunch. This is the future of healthcare.", stars: 5 },
    { name: "Dr. Suresh M.", role: "Cardiologist", text: "I recommend HemoVisit to all my elderly patients. The accuracy matches any premier lab I've worked with.", stars: 5 },
    { name: "Priya K.", role: "Patient, Colombo", text: "Booked at 8 AM, results by noon. Clean interface, kind staff, fair pricing. Couldn't ask for more.", stars: 5 },
  ];

  const team = [
    { name: "Dr. Ravi Kumaran", role: "Chief Pathologist", icon: "🔬" },
    { name: "Miss. Helan", role: "Head of Phlebotomy", icon: "💉" },
    { name: "Arjun Devanesan", role: "Technology Lead", icon: "💻" },
    { name: "Mr. Mark John", role: "Quality Assurance", icon: "📋" },
  ];

  const faqs = [
    { q: "How early can I book a slot?", a: "You can book up to 7 days in advance. Same-day slots are also available subject to phlebotomist availability." },
    { q: "Are the phlebotomists certified?", a: "Every phlebotomist on our platform is licensed, background-verified, and trained to international standards." },
    { q: "What if my report is delayed?", a: "We guarantee 4-hour turnaround for standard panels. Any delay beyond that and the test is on us." },
    { q: "Do you cover my area?", a: "We currently operate across Jaffna, Colombo, Kandy, and Galle, with expansion planned across the island." },
  ];

  return (
    <div className="app">
      {/* ================= BACKGROUNDS ================= */}
      <motion.div className="grid" style={{ y: gridY }} />
      <motion.div className="glow" style={{ y: glowY }} />
      <div
        className="cursor-glow"
        style={{
          transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`,
        }}
      />

      {/* ================= PROGRESS BAR ================= */}
      <motion.div className="progress" style={{ scaleX: smoothProgress }} />

      <style>{`
        * {
          margin:0; padding:0; box-sizing:border-box;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        }

        html { scroll-behavior: smooth; }

        .app {
          background: #fafbfd;
          color: #0b0f1a;
          overflow-x: hidden;
          position: relative;
        }

        /* Apple soft grid — parallax */
        .grid {
          position: fixed;
          inset: -100px;
          background-image:
            linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 70px 70px;
          opacity: 0.6;
          z-index: 1;
        }

        /* radial color glow — parallax */
        .glow {
          position: fixed;
          inset: -200px;
          background:
            radial-gradient(circle at 20% 20%, rgba(255,45,85,0.12), transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(0,120,255,0.08), transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(255,107,107,0.06), transparent 50%);
          z-index: 1;
          animation: floatGlow 8s ease-in-out infinite alternate;
        }

        @keyframes floatGlow {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }

        /* Mouse-tracking aurora */
        .cursor-glow {
          position: fixed;
          top: 50%; left: 50%;
          width: 600px; height: 600px;
          margin: -300px 0 0 -300px;
          background: radial-gradient(circle, rgba(255,45,85,0.08), transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
          transition: transform 0.4s ease-out;
        }

        /* Scroll progress */
        .progress {
          position: fixed;
          top: 0; left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #ff2d55, #ff6b6b);
          transform-origin: 0%;
          z-index: 2000;
        }

        /* ================= NAVBAR ================= */
        .nav {
          position: fixed;
          top: 0;
          width: 100%;
          height: 72px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 22px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.06);
          z-index: 1000;
        }

        .brand {
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ff2d55;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .brand-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #ff2d55;
          box-shadow: 0 0 12px #ff2d55;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .btn {
          padding: 10px 18px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #ff2d55, #ff6b6b);
          color: white;
          box-shadow: 0 4px 16px rgba(255,45,85,0.3);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255,45,85,0.4);
        }

        .btn-ghost {
          background: transparent;
          border: 1.5px solid rgba(0,0,0,0.12);
          color: #0b0f1a;
        }

        .btn-ghost:hover {
          border-color: #ff2d55;
          color: #ff2d55;
        }

        /* ================= HAMBURGER ================= */
        .hamburger {
          font-size: 20px;
          cursor: pointer;
          padding: 10px 14px;
          border-radius: 10px;
          transition: background 0.2s;
        }

        .hamburger:hover { background: rgba(0,0,0,0.05); }

        /* ================= SLIDE MENU ================= */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(6px);
          z-index: 1200;
        }

        .sidebar {
          position: fixed;
          top: 0; left: 0;
          height: 100%;
          width: 320px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(25px);
          border-right: 1px solid rgba(0,0,0,0.08);
          padding: 90px 18px;
          z-index: 1300;
        }

        .menu-item {
          padding: 14px 16px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(0,0,0,0.65);
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .menu-item:hover, .menu-item.active {
          background: rgba(255,45,85,0.08);
          color: #ff2d55;
        }

        .menu-item .arrow { opacity: 0; transition: opacity 0.2s; }
        .menu-item:hover .arrow { opacity: 1; }

        /* ================= SECTIONS ================= */
        section {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 120px 6vw;
          position: relative;
          z-index: 10;
        }

        .container {
          width: 100%;
          max-width: 1200px;
        }

        .eyebrow {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 50px;
          background: rgba(255,45,85,0.08);
          color: #ff2d55;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 20px;
          border: 1px solid rgba(255,45,85,0.15);
        }

        h1 {
          font-size: 80px;
          font-weight: 900;
          letter-spacing: -2px;
          line-height: 1.05;
        }

        h2 {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: -1px;
          margin-bottom: 14px;
        }

        h3 {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        p {
          color: rgba(0,0,0,0.6);
          line-height: 1.7;
          font-size: 15px;
        }

        .lead {
          font-size: 18px;
          color: rgba(0,0,0,0.55);
          max-width: 600px;
        }

        /* ================= HERO ================= */
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }

        .dna-canvas {
          width: 100%;
          height: 600px;
        }

        /* ================= ABOUT — split layout ================= */
        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .blood-canvas {
          width: 100%;
          height: 500px;
          border-radius: 26px;
          background: linear-gradient(135deg, rgba(255,45,85,0.04), rgba(255,107,107,0.02));
          border: 1px solid rgba(0,0,0,0.06);
        }

        /* ================= FEATURES GRID ================= */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 50px;
        }

        .feature-card {
          padding: 32px 28px;
          border-radius: 20px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.3s;
          cursor: pointer;
        }

        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(255,45,85,0.12);
          border-color: rgba(255,45,85,0.2);
        }

        .feature-icon {
          font-size: 36px;
          margin-bottom: 18px;
          display: inline-block;
        }

        /* ================= PROCESS TIMELINE ================= */
        .process-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 50px;
          position: relative;
        }

        .process-line {
          position: absolute;
          top: 40px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ff2d55 20%, #ff2d55 80%, transparent);
          opacity: 0.3;
        }

        .process-card {
          text-align: center;
          padding: 20px;
          position: relative;
          z-index: 2;
        }

        .process-num {
          width: 80px; height: 80px;
          margin: 0 auto 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d55, #ff6b6b);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 22px;
          box-shadow: 0 10px 30px rgba(255,45,85,0.3);
        }

        /* ================= STATS ================= */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 30px;
          margin-top: 50px;
        }

        .stat-card {
          text-align: center;
          padding: 40px 20px;
        }

        .stat-value {
          font-size: 64px;
          font-weight: 900;
          background: linear-gradient(135deg, #ff2d55, #ff6b6b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -2px;
        }

        .stat-label {
          color: rgba(0,0,0,0.5);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 6px;
        }

        /* ================= REVIEWS ================= */
        .review-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 50px;
        }

        .review-card {
          padding: 32px 28px;
          border-radius: 20px;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.3s;
        }

        .review-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.06);
        }

        .review-stars {
          color: #ffb300;
          font-size: 16px;
          margin-bottom: 12px;
        }

        .review-text {
          font-size: 15px;
          color: rgba(0,0,0,0.75);
          font-style: italic;
          line-height: 1.7;
          margin-bottom: 20px;
        }

        .review-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .review-avatar {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff2d55, #ff6b6b);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
        }

        /* ================= TEAM ================= */
        .team-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-top: 50px;
        }

        .team-card {
          text-align: center;
          padding: 32px 20px;
          border-radius: 20px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.3s;
        }

        .team-card:hover {
          transform: translateY(-6px);
          background: rgba(255,255,255,0.9);
        }

        .team-icon {
          font-size: 48px;
          width: 90px; height: 90px;
          margin: 0 auto 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,45,85,0.1), rgba(255,107,107,0.05));
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,45,85,0.15);
        }

        /* ================= FAQ ================= */
        .faq-list {
          margin-top: 40px;
        }

        .faq-item {
          padding: 24px 28px;
          border-radius: 16px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(0,0,0,0.06);
          margin-bottom: 14px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .faq-item:hover {
          border-color: rgba(255,45,85,0.2);
          background: rgba(255,255,255,0.9);
        }

        .faq-q {
          font-weight: 700;
          font-size: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faq-toggle {
          color: #ff2d55;
          font-size: 22px;
          font-weight: 300;
          transition: transform 0.3s;
        }

        .faq-item.open .faq-toggle { transform: rotate(45deg); }

        .faq-a {
          color: rgba(0,0,0,0.6);
          line-height: 1.7;
          margin-top: 12px;
          font-size: 14px;
        }

        /* ================= CONTACT ================= */
        .contact-card {
          padding: 60px 50px;
          border-radius: 26px;
          background: linear-gradient(135deg, #0b0f1a, #1a1d2e);
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .contact-card::before {
          content: '';
          position: absolute;
          top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(255,45,85,0.2), transparent 50%);
          animation: floatGlow 6s ease-in-out infinite alternate;
        }

        .contact-card > * { position: relative; z-index: 1; }

        .contact-card h2 { color: white; }
        .contact-card p { color: rgba(255,255,255,0.6); }

        .contact-row {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .contact-item {
          color: rgba(255,255,255,0.85);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ================= FOOTER ================= */
        .footer {
          padding: 50px 6vw 30px;
          border-top: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(10px);
          z-index: 10;
          position: relative;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .footer p { font-size: 13px; }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 1000px) {
          h1 { font-size: 56px; }
          h2 { font-size: 38px; }
          .hero-grid, .about-grid { grid-template-columns: 1fr; }
          .dna-canvas { height: 420px; }
          .features-grid, .review-grid, .team-grid { grid-template-columns: repeat(2, 1fr); }
          .process-grid, .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .process-line { display: none; }
        }

        @media (max-width: 600px) {
          h1 { font-size: 40px; letter-spacing: -1px; }
          h2 { font-size: 30px; }
          .stat-value { font-size: 48px; }
          .features-grid, .review-grid, .team-grid { grid-template-columns: 1fr; }
          .process-grid, .stats-grid { grid-template-columns: 1fr; }
          .sidebar { width: 280px; }
          section { padding: 100px 5vw; }
          .contact-card { padding: 40px 24px; }
        }
      `}</style>

      {/* ================= NAV ================= */}
      <div className="nav">
        <div className="hamburger" onClick={() => setOpen(true)}>☰</div>
        <div className="brand">
          <span className="brand-dot" />
          HEMOVISIT
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>
          Book Now
        </button>
      </div>

      {/* ================= SLIDE MENU ================= */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="overlay"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="sidebar"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              {sections.map((s) => (
                <div
                  key={s}
                  className={`menu-item ${active === s ? "active" : ""}`}
                  onClick={() => scrollTo(s)}
                >
                  {s}
                  <span className="arrow">→</span>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= HERO ================= */}
      <section id="hero" ref={heroRef}>
        <motion.div
          className="container hero-grid"
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        >
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="eyebrow">Apple-Grade Medical UX</div>
            <h1>
              Hospital. <br />
              <span style={{ color: "#ff2d55" }}>At Home.</span>
            </h1>
            <p className="lead" style={{ marginTop: 24 }}>
              A premium home blood testing system designed with precision,
              clarity, and intelligence. Certified phlebotomists. Verified reports.
              All in your pocket.
            </p>
            <div style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                Start Experience →
              </button>
              <button className="btn btn-ghost" onClick={() => scrollTo("about")}>
                Learn More
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <canvas ref={dnaCanvasRef} className="dna-canvas" />
          </motion.div>
        </motion.div>
      </section>

      {/* ================= ABOUT ================= */}
      <section id="about">
        <div className="container about-grid">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <canvas ref={bloodCanvasRef} className="blood-canvas" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="eyebrow">What We Do</div>
            <h2>Medical Intelligence, Reimagined.</h2>
            <p className="lead" style={{ marginBottom: 20 }}>
              Every drop tells a story. We make sure that story reaches you fast,
              accurate, and clear — without ever leaving home.
            </p>
            <p>
              HemoVisit connects you with NABL-certified labs and trained phlebotomists
              across Sri Lanka. From routine blood work to advanced diagnostic panels,
              we deliver hospital-grade results with the convenience of a tap.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center" }}
          >
            <div className="eyebrow">Features</div>
            <h2>Everything you need.<br />Nothing you don't.</h2>
            <p className="lead" style={{ margin: "0 auto" }}>
              Six pillars holding up the smoothest home diagnostics experience in the region.
            </p>
          </motion.div>

          <div className="features-grid">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="feature-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROCESS ================= */}
      <section id="process">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center" }}
          >
            <div className="eyebrow">How It Works</div>
            <h2>Four steps. One report.</h2>
          </motion.div>

          <div className="process-grid">
            <div className="process-line" />
            {process.map((p, i) => (
              <motion.div
                key={p.step}
                className="process-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <div className="process-num">{p.step}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section id="stats">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center" }}
          >
            <div className="eyebrow">By the Numbers</div>
            <h2>Trusted across the island.</h2>
          </motion.div>

          <div className="stats-grid">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="stat-card"
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, type: "spring" }}
              >
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= REVIEWS ================= */}
      <section id="reviews">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center" }}
          >
            <div className="eyebrow">Reviews</div>
            <h2>What patients say.</h2>
          </motion.div>

          <div className="review-grid">
            {reviews.map((r, i) => (
              <motion.div
                key={r.name}
                className="review-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="review-stars">{"★".repeat(r.stars)}</div>
                <p className="review-text">"{r.text}"</p>
                <div className="review-meta">
                  <div className="review-avatar">{r.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)" }}>{r.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TEAM ================= */}
      <section id="team">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center" }}
          >
            <div className="eyebrow">The Team</div>
            <h2>Behind every report.</h2>
          </motion.div>

          <div className="team-grid">
            {team.map((t, i) => (
              <motion.div
                key={t.name}
                className="team-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="team-icon">{t.icon}</div>
                <h3>{t.name}</h3>
                <p style={{ fontSize: 13 }}>{t.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq">
        <div className="container" style={{ maxWidth: 800 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: "center" }}
          >
            <div className="eyebrow">FAQ</div>
            <h2>Common questions.</h2>
          </motion.div>

          <div className="faq-list">
            {faqs.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <section id="contact">
        <div className="container">
          <motion.div
            className="contact-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="eyebrow" style={{ background: "rgba(255,45,85,0.15)" }}>Get In Touch</div>
            <h2>Ready when you are.</h2>
            <p style={{ maxWidth: 500, margin: "10px auto 0" }}>
              Book your first home blood test today, or reach out with any question.
              We typically reply within an hour.
            </p>

            <div className="contact-row">
              <div className="contact-item">✉️ support@hemovisit.com</div>
              <div className="contact-item">📞 +44 7565 20619</div>
              <div className="contact-item">📍 Jaffna, Sri Lanka</div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 36, padding: "14px 32px", fontSize: 15 }}
              onClick={() => navigate("/login")}
            >
              Book Your Test →
            </button>
          </motion.div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <div className="footer-content">
          <div className="brand">
            <span className="brand-dot" />
            HEMOVISIT
          </div>
          <p>© 2026 HemoVisit. Built with care in Jaffna.</p>
        </div>
      </footer>
    </div>
  );
}

// ============== FAQ ITEM (collapsible) ==============
function FaqItem({ q, a, delay }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className={`faq-item ${open ? "open" : ""}`}
      onClick={() => setOpen(!open)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="faq-q">
        {q}
        <span className="faq-toggle">+</span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            className="faq-a"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {a}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}