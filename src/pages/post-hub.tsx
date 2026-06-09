import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ImagePlus, PartyPopper, ChevronRight } from "lucide-react";

export default function PostHubPage() {
  const navigate = useNavigate();

  const options = [
    {
      icon: ImagePlus,
      title: "Share a Photo",
      description: "Post a moment to your feed or attach it to a past event you attended.",
      gradient: "from-primary/20 to-accent/10",
      border: "border-primary/20",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      action: () => navigate("/create-post"),
    },
    {
      icon: PartyPopper,
      title: "Host an Event",
      description: "Create a new event, set the vibe, invite guests and manage your event.",
      gradient: "from-hot/15 to-orange-500/10",
      border: "border-hot/20",
      iconColor: "text-hot",
      iconBg: "bg-hot/10",
      action: () => navigate("/events/create"),
    },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-1"
        >
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Create</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="text-2xl font-bold text-text"
        >
          What would you like to do?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="text-text-muted text-sm mt-1"
        >
          Share a moment or start something unforgettable.
        </motion.p>
      </div>

      {/* Cards */}
      <div className="flex-1 px-4 space-y-4">
        {options.map((opt, i) => {
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              onClick={opt.action}
              className={`w-full text-left rounded-2xl border ${opt.border} bg-gradient-to-br ${opt.gradient} p-5 glass-panel tap-active group transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]`}
            >
              <div className="flex items-start gap-4">
                <div className={`${opt.iconBg} rounded-xl p-3 shrink-0`}>
                  <Icon className={`w-6 h-6 ${opt.iconColor}`} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="font-bold text-text text-[15px] mb-1">{opt.title}</p>
                  <p className="text-text-muted text-sm leading-relaxed">{opt.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-text-dim shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Bottom hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-text-dim text-[11px] px-8 py-8"
      >
        Only attendees & hosts can post event photos.{"\n"}Anyone can share to their personal feed.
      </motion.p>
    </div>
  );
}
