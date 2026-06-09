import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, HelpCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/auth-hook";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: React.ReactNode;
}

interface FAQGroup {
  category: string;
  color: string;
  items: FAQItem[];
}

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQ_GROUPS: FAQGroup[] = [
  {
    category: "Getting Started",
    color: "text-primary",
    items: [
      {
        q: "What is MaskedOn?",
        a: "MaskedOn is a social event-hosting platform where hosts create private events and hand-pick their guest list. Guests discover events, request entry, and build a social reputation that helps them get approved faster at future events.",
      },
      {
        q: "Is MaskedOn free to use?",
        a: "Yes — MaskedOn is completely free for guests. Hosts can list events for free. Ticket pricing is set by the host, and a mock payment system is used for demonstration. Real money payments are not processed at this time.",
      },
      {
        q: "Which cities is MaskedOn available in?",
        a: "MaskedOn is currently in early access across major Indian cities. Discovery is location-based, so events nearest to you will appear first in the feed.",
      },
      {
        q: "Do I need to verify my email?",
        a: "Yes. After registering, a verification email is sent to your address. Some features are restricted until your email is verified. Check your spam folder if you don't receive it within a few minutes.",
      },
    ],
  },
  {
    category: "Account & Profile",
    color: "text-accent",
    items: [
      {
        q: "Can I change my username or email?",
        a: "No — your username and email are permanent identifiers and cannot be changed. Your display name and bio can be updated anytime from Settings.",
      },
      {
        q: "How do I add a profile photo?",
        a: 'Go to your profile page and tap the camera icon on your avatar. Alternatively, visit the Photos section of your profile and upload images there.',
      },
      {
        q: "What happens if I delete my account?",
        a: "Deleting your account permanently removes all your personal information, profile photos, and event history within 30 days. This action cannot be undone. Ratings you've given to others remain in aggregate form but are anonymised.",
      },
      {
        q: "How do I block or report another user?",
        a: "Visit the user's public profile and scroll to the bottom — you'll find Block and Report options. Blocking prevents them from seeing your content and sending you friend requests. Reports are reviewed by our moderation team.",
      },
    ],
  },
  {
    category: "Events & Events",
    color: "text-hot",
    items: [
      {
        q: "How do I find events near me?",
        a: "Open the Discover tab to browse upcoming events. You can filter by city, date, price, and capacity. The feed also surfaces events from hosts and friends you follow.",
      },
      {
        q: "How do I request to join a event?",
        a: "On a event's detail page, tap 'Request Entry'. The host will review your profile and social rating before approving or declining. You'll receive a notification with the decision.",
      },
      {
        q: "Can I cancel my ticket after being approved?",
        a: "You can withdraw your request from the My Requests page if the event hasn't started yet. Refund policies (when real payments are introduced) will be determined by the host.",
      },
      {
        q: "How do I create a event?",
        a: 'Tap the + button in the Host Dashboard or use the "Create Event" button in the Discover section. Fill in the event details, set your capacity and ticket price (0 = free), and publish. Your event goes live immediately.',
      },
      {
        q: "What does 'event status' mean?",
        a: (
          <>
            Event status is calculated automatically based on timing:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Upcoming</strong> — event hasn't started yet</li>
              <li><strong>Ongoing</strong> — currently happening</li>
              <li><strong>Completed</strong> — ended naturally</li>
              <li><strong>Cancelled</strong> — cancelled by the host</li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    category: "Social Rating",
    color: "text-warning",
    items: [
      {
        q: "What is the social rating?",
        a: "Your social rating is a 1–5 star score earned from peers after events you attend. Hosts use it to vet guests — a higher score makes you more likely to be approved. It reflects how you conduct yourself at events.",
      },
      {
        q: "How is my rating calculated?",
        a: "Ratings are recency-weighted, meaning more recent reviews count more than older ones. This allows you to improve a low rating over time by being a great guest at future events.",
      },
      {
        q: "Why isn't my rating showing on my profile?",
        a: "A minimum of 3 ratings are required before your score is displayed publicly. This prevents single-review manipulation.",
      },
      {
        q: "Can I dispute a rating?",
        a: "You can report a rating that you believe violates our guidelines (e.g., fake, coerced, or discriminatory). We review all reports but do not remove ratings simply because they are negative.",
      },
      {
        q: "When can I rate other guests?",
        a: "The rating window opens after a event ends and stays open for 72 hours. You can only rate other verified attendees of the same event.",
      },
    ],
  },
  {
    category: "Privacy & Safety",
    color: "text-success",
    items: [
      {
        q: "Who can see my profile?",
        a: "Any registered MaskedOn user can view your public profile, including your display name, photos, and social rating. Your email address is never visible to other users.",
      },
      {
        q: "How do push notifications work?",
        a: "If you grant notification permission, we send alerts for event approvals, new friend requests, incoming messages, and rating reminders. You can disable these at any time through your device's notification settings.",
      },
      {
        q: "Is my event location shared publicly?",
        a: "The city is shown publicly in event listings. The exact address is only revealed to approved guests after their request is accepted — never before.",
      },
    ],
  },
  {
    category: "Technical",
    color: "text-text-muted",
    items: [
      {
        q: "The app feels slow or shows stale data. What should I do?",
        a: "Pull down to refresh on any feed or list page. If the issue persists, try closing and reopening the app. If the backend is on a free tier, it may occasionally take 30–60 seconds to wake up after inactivity.",
      },
      {
        q: "How do I report a bug?",
        a: (
          <>
            Use our{" "}
            <Link to="/bug-report" className="text-primary hover:underline">
              Bug Report page
            </Link>{" "}
            to send us a detailed description. The more context you provide (steps to reproduce, what you expected, what actually happened), the faster we can fix it.
          </>
        ),
      },
      {
        q: "Is MaskedOn available as a mobile app?",
        a: "MaskedOn is a Progressive Web App (PWA) that works in any browser. Native Android and iOS apps are in development — stay tuned for announcements.",
      },
    ],
  },
];

// ─── Accordion Item ───────────────────────────────────────────────────────────

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-primary/[0.07] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left gap-3 tap-active"
        aria-expanded={isOpen}
      >
        <span className="text-text text-sm font-semibold leading-snug">{item.q}</span>
        <ChevronDown
          className={`w-4 h-4 text-text-dim shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="text-text-muted text-sm leading-relaxed pb-4 pr-7">{item.a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FAQPage() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? (user ? "/settings" : "/");
  const [openKey, setOpenKey] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10 md:pt-8">

        <Link to={from} className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Help & FAQ</h1>
              <p className="text-text-muted text-xs">Answers to common questions</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {FAQ_GROUPS.map((group, gi) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }}
              className="glass-panel rounded-2xl p-5"
            >
              <h2 className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-3 ${group.color}`}>
                {group.category}
              </h2>
              {group.items.map((item, ii) => (
                <AccordionItem
                  key={`${gi}-${ii}`}
                  item={item}
                  isOpen={openKey === `${gi}-${ii}`}
                  onToggle={() => toggle(`${gi}-${ii}`)}
                />
              ))}
            </motion.div>
          ))}
        </div>

        {/* Still need help? */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 glass-panel rounded-2xl p-5 text-center"
        >
          <p className="text-text font-semibold text-sm mb-1">Still have a question?</p>
          <p className="text-text-muted text-xs mb-4">We're happy to help — reach out to our team</p>
          <Link
            to="/contact"
            state={{ from: "/faq" }}
            className="btn-primary-luxe font-bold px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2"
          >
            Contact Us
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
