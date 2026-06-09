import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import symbolImg from "../assets/symbol.png";
import nameImg from "../assets/name.png";
import nameLightImg from "../assets/name_lighttheme.png";
import { useTheme } from "../context/use-theme";

// ─── Timing constants (ms) ───────────────────────────────────────────────────
const T_HOLD   = 950;   // logo finishes entering → glow / tagline appear
const T_EXIT   = 2500;  // start zoom-through exit
const T_DONE   = 3700;  // unmount + render app

// ─── Easing curves ───────────────────────────────────────────────────────────
const SPRING_IN  = [0.34, 1.56, 0.64, 1] as const;   // overshoot spring
const EASE_ZOOM  = [0.42, 0, 1, 1]       as const;   // fast ease-in for zoom

// ─── Particle dot data (static, pre-seeded for perf) ─────────────────────────
const PARTICLES = [
  { x: 12, delay: 0.0, dur: 3.2, size: 2 },
  { x: 28, delay: 0.4, dur: 4.1, size: 1.5 },
  { x: 45, delay: 0.8, dur: 3.7, size: 2 },
  { x: 63, delay: 0.2, dur: 4.5, size: 1 },
  { x: 78, delay: 1.1, dur: 3.0, size: 2.5 },
  { x: 90, delay: 0.6, dur: 3.9, size: 1.5 },
  { x: 35, delay: 1.4, dur: 4.2, size: 1 },
  { x: 55, delay: 0.9, dur: 3.5, size: 2 },
];

// ─── Types ───────────────────────────────────────────────────────────────────
type Phase = "enter" | "hold" | "exit";

interface Props {
  onComplete: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("enter");
  const { theme } = useTheme();
  const isLight = theme === "light";

  const palette = isLight
    ? {
        bg: "#edf0fa",
        radial: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(21,88,194,0.12) 0%, rgba(13,71,161,0.08) 45%, transparent 72%)",
        leftOrb: "radial-gradient(circle, rgba(21,88,194,0.18), transparent 70%)",
        rightOrb: "radial-gradient(circle, rgba(13,71,161,0.2), transparent 70%)",
        particleA: "rgba(21,88,194,0.45)",
        particleB: "rgba(13,71,161,0.45)",
        halo: "rgba(21,88,194,0.35)",
        symbolShadow: "drop-shadow(0 0 10px rgba(21,88,194,0.28))",
        nameShadow: "drop-shadow(0 0 8px rgba(13,71,161,0.18))",
        tagline: "rgba(12,25,41,0.7)",
        progressTrack: "rgba(12,25,41,0.08)",
        topLine: "linear-gradient(90deg, transparent 0%, rgba(21,88,194,0.55) 30%, rgba(13,71,161,0.5) 70%, transparent 100%)",
      }
    : {
        bg: "#080c15",
        radial: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(78,216,255,0.13) 0%, rgba(74,171,255,0.09) 45%, transparent 72%)",
        leftOrb: "radial-gradient(circle, rgba(74,171,255,0.22), transparent 70%)",
        rightOrb: "radial-gradient(circle, rgba(78,216,255,0.25), transparent 70%)",
        particleA: "rgba(74,171,255,0.55)",
        particleB: "rgba(78,216,255,0.55)",
        halo: "rgba(78,216,255,0.45)",
        symbolShadow: "drop-shadow(0 0 12px rgba(78,216,255,0.4))",
        nameShadow: "drop-shadow(0 0 8px rgba(74,171,255,0.25))",
        tagline: "rgba(138,172,202,0.7)",
        progressTrack: "rgba(255,255,255,0.06)",
        topLine: "linear-gradient(90deg, transparent 0%, rgba(78,216,255,0.6) 30%, rgba(74,171,255,0.6) 70%, transparent 100%)",
      };

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), T_HOLD);
    const t2 = setTimeout(() => setPhase("exit"), T_EXIT);
    const t3 = setTimeout(onComplete,             T_DONE);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const isHold = phase === "hold" || phase === "exit";
  const isExit = phase === "exit";

  // ── Logo group variants: spring-in → hold → zoom-through ──────────────────
  const logoAnimate =
    isExit  ? { scale: 3.8, opacity: 0, y: -20 } :
    isHold  ? { scale: 1,   opacity: 1, y: 0    } :
              { scale: 1,   opacity: 1, y: 0    };

  const logoTransition =
    isExit  ? { duration: 1.15, ease: EASE_ZOOM } :
              { duration: 0.75, ease: SPRING_IN  };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: palette.bg }}
      animate={{ opacity: isExit ? 0 : 1 }}
      transition={{ duration: 0.65, delay: isExit ? 0.5 : 0, ease: "easeIn" }}
    >
      {/* ── Deep radial gradient ─────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHold ? 1 : 0 }}
        transition={{ duration: 1.4 }}
        style={{
          background: palette.radial,
        }}
      />

      {/* ── Left violet orb ──────────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 220, height: 220,
          top: "18%", left: "8%",
          background: palette.leftOrb,
          filter: "blur(32px)",
        }}
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: isHold ? 1 : 0, x: isHold ? 0 : -30, y: [0, -18, 0] }}
        transition={{
          opacity: { duration: 1.0 },
          x:       { duration: 1.0 },
          y:       { duration: 5.5, repeat: Infinity, ease: "easeInOut" },
        }}
      />

      {/* ── Right cyan orb ───────────────────────────────────────────────── */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 180, height: 180,
          bottom: "20%", right: "8%",
          background: palette.rightOrb,
          filter: "blur(28px)",
        }}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: isHold ? 1 : 0, x: isHold ? 0 : 30, y: [0, 22, 0] }}
        transition={{
          opacity: { duration: 1.0, delay: 0.2 },
          x:       { duration: 1.0, delay: 0.2 },
          y:       { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
        }}
      />

      {/* ── Floating particles (night club vibe) ─────────────────────────── */}
      {isHold && PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size, height: p.size,
            left: `${p.x}%`, bottom: "0%",
            background: i % 2 === 0 ? palette.particleA : palette.particleB,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -900, opacity: [0, 0.8, 0] }}
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* ── Main logo group ───────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-col items-center gap-5 relative z-10"
        initial={{ scale: 0.45, opacity: 0, y: 0 }}
        animate={logoAnimate}
        transition={logoTransition}
      >
        {/* Symbol with pulsing glow halo */}
        <div className="relative flex items-center justify-center">
          {/* Halo */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 96, height: 96,
              background: palette.halo,
              filter: "blur(22px)",
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: isHold ? [0.45, 0.75, 0.45] : 0,
              scale:   isHold ? [1, 1.2, 1]         : 0.7,
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.img
            src={symbolImg}
            alt=""
            className="w-[72px] h-[72px] object-contain relative z-10"
            style={{ filter: palette.symbolShadow }}
          />
        </div>

        {/* Brand name */}
        <motion.img
          src={theme === "light" ? nameLightImg : nameImg}
          alt="MaskedOn"
          className="object-contain"
          style={{ width: 200, filter: palette.nameShadow }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.55, ease: "easeOut" }}
        />

        {/* Tagline */}
        <motion.p
          className="text-[11px] tracking-[0.32em] uppercase font-medium"
          style={{ color: palette.tagline }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHold ? 1 : 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
        >
          Get Your Social Life Approved
        </motion.p>
      </motion.div>

      {/* ── Bottom progress bar ───────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full overflow-hidden"
        style={{ width: 88, height: 2, background: palette.progressTrack }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHold ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #D4A853, #9B6DFF)",
            transformOrigin: "left",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isExit ? 1 : isHold ? 0.72 : 0 }}
          transition={{
            duration: isExit ? 0.4 : 1.6,
            ease: "easeOut",
          }}
        />
      </motion.div>

      {/* ── Thin top accent line ──────────────────────────────────────────── */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: palette.topLine,
        }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: isHold ? 0.7 : 0, scaleX: isHold ? 1 : 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </motion.div>
  );
}
