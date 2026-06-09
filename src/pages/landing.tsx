import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Star,
  ShieldCheck,
  Users,
  Ticket,
  PartyPopper,
  Search,
  UserCheck,
  Camera,
  ChevronRight,
  Lock,
  TrendingUp,
  Globe,
} from "lucide-react";

// --- Helpers ------------------------------------------------------------------

function FadeUp({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Feature card -------------------------------------------------------------

interface FeatureProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, iconColor, iconBg, title, description }: FeatureProps) {
  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/20 transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <h3 className="text-text font-bold text-base mb-1.5">{title}</h3>
        <p className="text-text-muted text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// --- Step card ----------------------------------------------------------------

function StepCard({
  num,
  icon: Icon,
  title,
  description,
  color,
}: {
  num: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0"
          style={{ background: color }}
        >
          {num}
        </div>
        {num < 3 && <div className="w-px flex-1 mt-2 bg-primary/10" style={{ minHeight: 40 }} />}
      </div>
      <div className="pb-8 pt-1.5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-text-muted" />
          <h3 className="text-text font-bold text-base">{title}</h3>
        </div>
        <p className="text-text-muted text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// --- Stat pill ----------------------------------------------------------------

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-6 py-4">
      <p className="text-3xl font-black brand-gradient-text tracking-tight">{value}</p>
      <p className="text-text-muted text-xs mt-0.5">{label}</p>
    </div>
  );
}

// --- Page ---------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ======================================================
          NAVBAR (minimal, landing-specific)
          ====================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <span className="font-black text-lg text-text tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              masked<span className="brand-gradient-text">On</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-text-muted hover:text-text transition">Features</a>
            <a href="#how-it-works" className="text-text-muted hover:text-text transition">How it works</a>
            <a href="#ratings" className="text-text-muted hover:text-text transition">Reputation</a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/auth/login"
              className="text-sm font-semibold text-text-muted hover:text-text transition px-3 py-1.5 rounded-xl tap-active"
            >
              Sign in
            </Link>
            <Link
              to="/auth/register"
              className="btn-primary-luxe text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              Join free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================
          HERO
          ====================================================== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 text-center overflow-hidden">

        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px] bg-primary" />
          <div className="absolute top-2/3 left-1/4 w-[300px] h-[300px] rounded-full opacity-10 blur-[100px] bg-accent" />
          <div className="absolute top-1/2 right-1/4 w-[200px] h-[200px] rounded-full opacity-10 blur-[80px] bg-hot" />
        </div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-2 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-text-muted text-xs font-semibold tracking-wide">India's first event social network</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6 max-w-3xl mx-auto"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          Events you
          <br />
          <span className="brand-gradient-text">actually get into.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="text-text-muted text-lg md:text-xl max-w-lg mx-auto mb-10 leading-relaxed"
        >
          Discover curated house events. Build your social reputation. Hosts pick guests they trust — earn your spot with a great track record.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            to="/auth/register"
            className="btn-primary-luxe font-bold px-8 py-3.5 rounded-2xl text-base flex items-center justify-center gap-2"
          >
            <PartyPopper className="w-4.5 h-4.5" />
            Get started — it's free
          </Link>
          <Link
            to="/auth/login"
            className="btn-secondary-luxe font-bold px-8 py-3.5 rounded-2xl text-base flex items-center justify-center gap-2"
          >
            Sign in
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Social proof numbers */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-14 glass-panel rounded-2xl flex flex-wrap items-stretch divide-x divide-primary/10 max-w-xl mx-auto"
        >
          <StatPill value="500+" label="Events hosted" />
          <StatPill value="4.8★" label="Avg. host rating" />
          <StatPill value="10K+" label="Attendees" />
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-text-dim text-[11px] uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-primary/40 to-transparent"
          />
        </motion.div>
      </section>

      {/* ======================================================
          FEATURES
          ====================================================== */}
      <section id="features" className="px-4 py-20 max-w-5xl mx-auto">
        <FadeUp className="text-center mb-12">
          <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3">Why MaskedOn</p>
          <h2 className="text-3xl md:text-4xl font-black text-text tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            Your social life, <span className="brand-gradient-text">upgraded</span>
          </h2>
          <p className="text-text-muted mt-3 max-w-md mx-auto text-sm leading-relaxed">
            Everything you need to host standout events or be an in-demand guest.
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              delay: 0,
              icon: ShieldCheck,
              iconColor: "text-success",
              iconBg: "bg-success/10",
              title: "Host-controlled guest lists",
              description:
                "Hosts review every applicant's profile and social rating before approving. No randos — only verified, trusted guests.",
            },
            {
              delay: 0.05,
              icon: Star,
              iconColor: "text-warning",
              iconBg: "bg-warning/10",
              title: "Social reputation system",
              description:
                "After every event, attendees rate each other 1–5 stars. Your score follows you, opening doors to better experiences.",
            },
            {
              delay: 0.1,
              icon: Ticket,
              iconColor: "text-accent",
              iconBg: "bg-accent/10",
              title: "Digital tickets",
              description:
                "Approved? Get a unique QR code ticket for entry. No paper, no confusion — just tap to show at the door.",
            },
            {
              delay: 0.15,
              icon: Camera,
              iconColor: "text-hot",
              iconBg: "bg-hot/10",
              title: "Photo-driven profiles",
              description:
                "Build a visual social identity with event photos. Your profile tells your social story at a glance.",
            },
            {
              delay: 0.2,
              icon: Users,
              iconColor: "text-primary",
              iconBg: "bg-primary/10",
              title: "Friends & social graph",
              description:
                "Connect with people you meet at events. Follow their social journey and get first access to new experiences.",
            },
            {
              delay: 0.25,
              icon: Lock,
              iconColor: "text-text-muted",
              iconBg: "bg-surface-light",
              title: "Block & report tools",
              description:
                "Encounter someone problematic? Block them instantly. Reports go to moderators for swift action — safety first.",
            },
          ].map((f) => (
            <FadeUp key={f.title} delay={f.delay}>
              <FeatureCard
                icon={f.icon}
                iconColor={f.iconColor}
                iconBg={f.iconBg}
                title={f.title}
                description={f.description}
              />
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ======================================================
          HOW IT WORKS
          ====================================================== */}
      <section id="how-it-works" className="px-4 py-20 bg-surface/20">
        <div className="max-w-3xl mx-auto">
          <FadeUp className="text-center mb-14">
            <p className="text-accent text-xs font-bold uppercase tracking-[0.2em] mb-3">The flow</p>
            <h2 className="text-3xl md:text-4xl font-black text-text tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              From discovery to <span className="brand-gradient-text">live moments</span>
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Guest flow */}
            <FadeUp delay={0.05}>
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Users className="w-4 h-4 text-accent" />
                  </div>
                  <h3 className="text-text font-bold text-base">As a guest</h3>
                </div>
                <div>
                  <StepCard
                    num={1}
                    icon={Search}
                    title="Discover events near you"
                    description="Browse upcoming events in your city. Filter by date, vibe, or price."
                    color="var(--color-primary)"
                  />
                  <StepCard
                    num={2}
                    icon={UserCheck}
                    title="Request to join"
                    description="Tap 'Request entry'. The host reviews your profile and social rating to decide."
                    color="var(--color-accent)"
                  />
                  <StepCard
                    num={3}
                    icon={Ticket}
                    title="Get your digital ticket"
                    description="Approved! Your QR ticket appears instantly. Show it at the door and enjoy."
                    color="var(--color-hot)"
                  />
                </div>
              </div>
            </FadeUp>

            {/* Host flow */}
            <FadeUp delay={0.1}>
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <PartyPopper className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="text-text font-bold text-base">As a host</h3>
                </div>
                <div>
                  <StepCard
                    num={1}
                    icon={PartyPopper}
                    title="Create your event"
                    description="Set your venue, date, capacity, ticket price, and vibe. Your event goes live instantly."
                    color="var(--color-primary)"
                  />
                  <StepCard
                    num={2}
                    icon={UserCheck}
                    title="Vet your guest list"
                    description="Review each request — see profiles, photos, and social ratings. Approve or decline with one tap."
                    color="var(--color-accent)"
                  />
                  <StepCard
                    num={3}
                    icon={TrendingUp}
                    title="Build your host reputation"
                    description="After the event, guests rate the experience. Great events grow your host score and fill your next one faster."
                    color="var(--color-hot)"
                  />
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ======================================================
          REPUTATION / RATINGS SECTION
          ====================================================== */}
      <section id="ratings" className="px-4 py-20 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">

          {/* Text */}
          <FadeUp>
            <p className="text-warning text-xs font-bold uppercase tracking-[0.2em] mb-3">Reputation</p>
            <h2 className="text-3xl md:text-4xl font-black text-text tracking-tight mb-5" style={{ fontFamily: "Outfit, sans-serif" }}>
              Your social score
              <br />
              <span className="brand-gradient-text">opens doors</span>
            </h2>
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              After every event, hosts and fellow guests rate each other on a 1–5 star scale. Ratings are recency-weighted so recent good behavior matters most. A high score makes hosts say yes faster — and unlocks more exclusive experiences.
            </p>
            <ul className="space-y-3">
              {[
                { icon: Star, text: "Stars earned after each event you attend", color: "text-warning" },
                { icon: TrendingUp, text: "Recency-weighted — recent events count more", color: "text-success" },
                { icon: Globe, text: "Publicly visible on your profile", color: "text-accent" },
                { icon: ShieldCheck, text: "Min. 3 ratings required to display", color: "text-primary" },
              ].map(({ icon: Icon, text, color }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-text-muted">
                  <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                  {text}
                </li>
              ))}
            </ul>
          </FadeUp>

          {/* Visual card */}
          <FadeUp delay={0.1}>
            <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
              {/* bg glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-warning/10 blur-3xl pointer-events-none" aria-hidden />

              {/* Profile preview */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-hot/15 flex items-center justify-center text-2xl font-black text-text shrink-0">
                  R
                </div>
                <div>
                  <p className="text-text font-bold text-sm">Riya S.</p>
                  <p className="text-text-muted text-xs">Mumbai, India</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= 4 ? "text-warning fill-warning" : "text-text-dim"}`}
                      />
                    ))}
                    <span className="text-text-muted text-[11px] ml-1">4.8 · 24 ratings</span>
                  </div>
                </div>
              </div>

              {/* Rating breakdown */}
              <div className="space-y-2.5">
                {[
                  { label: "Punctual", pct: 95, color: "var(--color-success)" },
                  { label: "Respectful", pct: 100, color: "var(--color-primary)" },
                  { label: "Vibe", pct: 88, color: "var(--color-accent)" },
                  { label: "Would invite again", pct: 92, color: "var(--color-hot)" },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-text-dim text-[11px] w-32 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-surface-light rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <span className="text-text-muted text-[11px] w-7 text-right shrink-0">{pct}%</span>
                  </div>
                ))}
              </div>

              {/* Recent events */}
              <div className="mt-5 pt-4 border-t border-primary/[0.07]">
                <p className="text-text-dim text-[11px] uppercase tracking-wider mb-3">Recent events</p>
                <div className="space-y-2">
                  {[
                    { name: "Techno Basement", stars: 5 },
                    { name: "Terrace Vibes Vol.3", stars: 5 },
                    { name: "Garden House Rave", stars: 4 },
                  ].map(({ name, stars }) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-text-muted text-xs truncate">{name}</span>
                      <div className="flex items-center gap-0.5 ml-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-2.5 h-2.5 ${s <= stars ? "text-warning fill-warning" : "text-text-dim"}`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ======================================================
          FINAL CTA
          ====================================================== */}
      <section className="px-4 py-24">
        <FadeUp>
          <div className="max-w-2xl mx-auto text-center glass-panel rounded-3xl p-10 relative overflow-hidden">
            {/* glows */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 left-1/4 w-40 h-24 rounded-full bg-hot/8 blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-40 h-24 rounded-full bg-accent/8 blur-3xl" />
            </div>

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-black text-text tracking-tight mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
                Ready to get on the
                <br />
                <span className="brand-gradient-text">guest list?</span>
              </h2>
              <p className="text-text-muted text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                Join MaskedOn for free. Build your reputation, discover events, and connect with people who know how to have a good time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/auth/register"
                  className="btn-primary-luxe font-bold px-8 py-3.5 rounded-2xl text-base flex items-center justify-center gap-2"
                >
                  <PartyPopper className="w-4.5 h-4.5" />
                  Create your account
                </Link>
                <Link
                  to="/auth/login"
                  className="btn-secondary-luxe font-bold px-8 py-3.5 rounded-2xl text-base flex items-center justify-center gap-2"
                >
                  I already have an account
                </Link>
              </div>
              <p className="text-text-dim text-xs mt-5">No credit card required · Free forever for guests</p>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ======================================================
          FOOTER
          ====================================================== */}
      <footer className="border-t border-primary/[0.07] px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <span className="text-text-muted text-sm font-semibold">
              masked<span className="text-primary">On</span>
            </span>
          </div>
          <p className="text-text-dim text-xs">Â© {new Date().getFullYear()} MaskedOn. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-text-dim">
            <Link to="/auth/login" className="hover:text-text-muted transition">Sign in</Link>
            <Link to="/auth/register" className="hover:text-text-muted transition">Register</Link>
            <Link to="/privacy" className="hover:text-text-muted transition">Privacy</Link>
            <Link to="/terms" className="hover:text-text-muted transition">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
