import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, PartyPopper, Users, Star, ShieldCheck } from "lucide-react";

// --- Step Definitions ---------------------------------------------------------

interface Step {
  emoji: string;
  Icon?: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  body: string;
}

const STEPS: Step[] = [
  {
    emoji: "??",
    Icon: PartyPopper,
    iconColor: "text-hot",
    iconBg: "bg-gradient-to-br from-hot/20 to-primary/20",
    title: "Welcome to MaskedOn",
    subtitle: "The social platform for event lovers",
    body: "Discover exclusive events, connect with your crew, and build your nightlife reputation — all in one place.",
  },
  {
    emoji: "??",
    iconColor: "text-primary",
    iconBg: "bg-gradient-to-br from-primary/20 to-accent/20",
    title: "Find Your Vibe",
    subtitle: "Exclusive events, curated for you",
    body: "Browse events near you, see which friends are going, and request to join with a single tap. Hosts personally review every request.",
  },
  {
    emoji: "?",
    Icon: Star,
    iconColor: "text-warning",
    iconBg: "bg-gradient-to-br from-warning/20 to-hot/10",
    title: "Your Reputation",
    subtitle: "Ratings that actually matter",
    body: "After every event, attendees rate the crowd. Build a high social rating to unlock more exclusive events with lower entry requirements.",
  },
  {
    emoji: "??",
    Icon: Users,
    iconColor: "text-accent",
    iconBg: "bg-gradient-to-br from-accent/20 to-primary/10",
    title: "Build Your Crew",
    subtitle: "Connect with people you vibe with",
    body: "Add friends, see where they're headed, and get personalised event picks based on who you know. Your social circle shapes your feed.",
  },
  {
    emoji: "???",
    Icon: ShieldCheck,
    iconColor: "text-success",
    iconBg: "bg-gradient-to-br from-success/20 to-accent/10",
    title: "Safe & Gated",
    subtitle: "Hosts control the guest list",
    body: "No open events. Every guest request is approved by the host. Block anyone who makes you uncomfortable. Your safety is priority.",
  },
];

const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

// --- Onboarding Page ----------------------------------------------------------

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  function finish() {
    localStorage.setItem("maskedon-onboarding-done", "1");
    navigate("/", { replace: true });
  }

  function next() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  const current = STEPS[step];
  const { Icon } = current;

  return (
    <div className="min-h-screen bg-bg flex flex-col px-6 py-safe-top">
      {/* -- Top Bar --- */}
      <div className="flex items-center justify-between pt-6 mb-2">
        <button
          onClick={prev}
          aria-label="Previous step"
          className={`text-sm font-semibold text-text-muted hover:text-text transition tap-active ${step === 0 ? "invisible" : ""}`}
        >
          ? Back
        </button>
        <button
          onClick={finish}
          className="text-sm font-semibold text-text-muted hover:text-text transition tap-active"
        >
          Skip
        </button>
      </div>

      {/* -- Progress Bar --- */}
      <div className="flex items-center gap-1.5 mt-3 mb-10">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-400 ${
              i <= step ? "bg-primary" : "bg-surface-light"
            }`}
            style={{ flex: i === step ? 2 : 1 }}
          />
        ))}
      </div>

      {/* -- Slide Content --- */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={SPRING}
            className="flex flex-col items-center"
          >
            {/* Icon bubble */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...SPRING, delay: 0.08 }}
              className={`w-28 h-28 rounded-[2rem] ${current.iconBg} flex flex-col items-center justify-center mb-8 shadow-lg`}
            >
              <span className="text-5xl leading-none mb-1" role="img" aria-hidden>{current.emoji}</span>
              {Icon && <Icon className={`w-5 h-5 ${current.iconColor} opacity-70`} />}
            </motion.div>

            {/* Text */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.12 }}
              className="text-2xl font-black text-text mb-2 tracking-tight"
            >
              {current.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.16 }}
              className={`text-sm font-bold mb-4 ${current.iconColor}`}
            >
              {current.subtitle}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.2 }}
              className="text-text-muted text-sm leading-relaxed"
            >
              {current.body}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* -- Bottom Controls --- */}
      <div className="max-w-sm mx-auto w-full pb-10 pt-8 flex flex-col items-center gap-5">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`rounded-full transition-all duration-300 tap-active ${
                i === step
                  ? "w-7 h-2.5 bg-primary"
                  : "w-2.5 h-2.5 bg-surface-light hover:bg-primary/30"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={next}
          whileTap={{ scale: 0.97 }}
          className="btn-primary-luxe w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
        >
          {isLast ? (
            <><Check className="w-5 h-5" /> Get Started</>
          ) : (
            <>Continue <ArrowRight className="w-5 h-5" /></>
          )}
        </motion.button>

        {/* Step counter */}
        <p className="text-text-dim text-xs">
          {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
