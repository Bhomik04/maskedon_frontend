import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Compass, SquarePen, User, LogIn, UserPlus, X, Inbox } from "lucide-react";
import { useAuth } from "../context/auth-hook";
import { useState } from "react";

const tabs = [
  { to: "/",            label: "Feed",    icon: Home,      end: true,  requiresAuth: true  },
  { to: "/post",        label: "Post",    icon: SquarePen, end: false, requiresAuth: true  },
  { to: "/events",     label: "Events",  icon: Compass,   end: false, special: true, requiresAuth: false },
  { to: "/access-hub", label: "Access", icon: Inbox,    end: false, requiresAuth: true  },
  { to: "/profile/me",  label: "Profile", icon: User,      end: false, requiresAuth: true  },
] as const;

export default function BottomTabNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Highlight Profile tab for /profile/me and /settings
  function isProfileActive() {
    return location.pathname === "/profile/me" || location.pathname.startsWith("/settings");
  }

  // Highlight Events tab for all /events/* routes (not /events/create which is now via /post)
  function isEventsActive() {
    return location.pathname.startsWith("/events");
  }

  // Highlight Post tab for /post
  function isPostActive() {
    return location.pathname === "/post";
  }

  return (
    <>
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {/* Frosted glass backdrop */}
      <div className="absolute inset-0 bottom-nav-glass backdrop-blur-2xl" />

      <div className="relative mx-auto max-w-lg px-3 pt-1.5 pb-1">
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isProfileTab = tab.to === "/profile/me";
            const isEventsTab  = tab.to === "/events";
            const isPostTab    = tab.to === "/post";
            const needsAuth = !user && tab.requiresAuth;
            return (
              <li key={tab.to}>
                {needsAuth ? (
                  // Guest: intercept click and show auth prompt
                  <button
                    type="button"
                    aria-label={tab.label}
                    onClick={() => setShowAuthPrompt(true)}
                    className={`w-full flex flex-col items-center justify-center py-1.5 text-[10px] font-semibold text-text-dim tap-active`}
                  >
                    <div className="relative p-1.5">
                      <Icon className="relative z-10 w-[22px] h-[22px]" strokeWidth={1.7} />
                    </div>
                    <span className="leading-none tracking-wide mt-0.5">{tab.label}</span>
                  </button>
                ) : (
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  aria-label={tab.label}
                  className={({ isActive: navIsActive }) => {
                    const isActive = isProfileTab ? isProfileActive()
                      : isEventsTab  ? isEventsActive()
                      : isPostTab    ? isPostActive()
                      : navIsActive;
                    return `flex flex-col items-center justify-center py-1.5 text-[10px] font-semibold transition-colors tap-active ${
                      'special' in tab && tab.special
                        ? "text-primary"
                        : isActive
                          ? "text-primary"
                          : "text-text-dim"
                    }`;
                  }}
                >
                  {({ isActive: navIsActive }) => {
                    const isActive = isProfileTab ? isProfileActive()
                      : isEventsTab  ? isEventsActive()
                      : isPostTab    ? isPostActive()
                      : navIsActive;
                    return (
                    <>
                      {'special' in tab && tab.special ? (
                        <div className={`w-11 h-11 rounded-[14px] flex items-center justify-center -mt-5 transition-all ${
                          isActive
                            ? "bg-gradient-to-br from-primary to-hot shadow-lg shadow-primary/25 scale-105"
                            : "bg-gradient-to-br from-primary/80 to-accent/80 shadow-md shadow-primary/15"
                        }`}>
                          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                      ) : isProfileTab && user ? (
                        <div className="relative p-1">
                          {isActive && (
                            <motion.div
                              layoutId="bottom-tab-active"
                              className="absolute inset-0 bg-primary/10 rounded-xl"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <div className={`relative z-10 w-[24px] h-[24px] rounded-full overflow-hidden transition-all ${
                            isActive ? "ring-[1.5px] ring-primary ring-offset-1 ring-offset-transparent" : ""
                          }`}>
                            {user.avatar_url
                              ? <img src={user.avatar_url} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-white">{(user.display_name ?? "?").charAt(0).toUpperCase()}</div>
                            }
                          </div>
                        </div>
                      ) : (
                        <div className="relative p-1.5">
                          {isActive && (
                            <motion.div
                              layoutId="bottom-tab-active"
                              className="absolute inset-0 bg-primary/10 rounded-xl"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <Icon className={`relative z-10 w-[22px] h-[22px] transition-colors ${isActive ? "text-primary" : ""}`} strokeWidth={isActive ? 2.2 : 1.7} />
                        </div>
                      )}
                      <span className={`leading-none tracking-wide ${'special' in tab && tab.special ? "mt-1.5 font-semibold" : "mt-0.5"}`}>
                        {tab.label}
                      </span>
                    </>
                  )}}
                </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>

    {/* Auth prompt modal — shown when guest taps a protected tab */}
    <AnimatePresence>
      {showAuthPrompt && (
        <motion.div
          key="auth-prompt-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAuthPrompt(false)}
        >
          <motion.div
            key="auth-prompt-sheet"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4 mb-24 glass-panel rounded-3xl p-6 space-y-4 border border-border"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-lg font-black text-text">Join MaskedOn</p>
                <p className="text-sm text-text-muted">Log in or create an account to access this feature</p>
              </div>
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="p-1 rounded-lg text-text-dim hover:text-text tap-active"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => { setShowAuthPrompt(false); navigate("/auth/login"); }}
              className="btn-primary-luxe w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Log In
            </button>
            <button
              onClick={() => { setShowAuthPrompt(false); navigate("/auth/register"); }}
              className="btn-secondary-luxe w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </button>
            <button
              onClick={() => setShowAuthPrompt(false)}
              className="w-full text-text-dim text-sm font-semibold py-1"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

