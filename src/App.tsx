import { BrowserRouter, HashRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate, Link, useParams } from "react-router-dom";
import { useState, useEffect, useRef, Component, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "./components/splash-screen";
import { AuthProvider } from "./context/auth-context";
import { ThemeProvider } from "./context/theme-context";
import { useAuth } from "./context/auth-hook";
import { NotificationsProvider } from "./context/use-notifications-hook";
import { initCapacitor } from "./lib/capacitor";
import { Capacitor } from "@capacitor/core";
import { initPushNotifications } from "./lib/push-notifications";
import api from "./lib/api";
import Navbar from "./components/navbar";
import CrowdRatingGate from "./components/crowd-rating-gate";
import FeedPage from "./pages/feed";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import VerifyEmailPage from "./pages/verify-email";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import ProfilePage from "./pages/profile";
import SettingsPage from "./pages/settings";
import DiscoverPage from "./pages/discover";
import EventDetailPage from "./pages/event-detail";
import CreateEventPage from "./pages/create-event";
import EditEventPage from "./pages/edit-event";
import MyRequestsPage from "./pages/my-requests";
import DashboardPage from "./pages/dashboard";
import ManageRequestsPage from "./pages/manage-requests";
import RateCrowdPage from "./pages/rate-crowd";
import EventPhotosPage from "./pages/event-photos";
import UserPhotosPage from "./pages/user-photos";
import PhotoRedirectPage from "./pages/photo-redirect";
import NotificationsPage from "./pages/notifications";
import PublicProfilePage from "./pages/public-profile";
import SearchPage from "./pages/search";
import CreatePostPage from "./pages/create-post";
import PostHubPage from "./pages/post-hub";
import FriendsPage from "./pages/friends";
import AchievementsPage from "./pages/achievements";
import AttendeesPage from "./pages/attendees";
import DigitalTicketPage from "./pages/digital-ticket";
import ScanTicketPage from "./pages/scan-ticket";
import MyRatingsPage from "./pages/my-ratings";
import BlockedUsersPage from "./pages/blocked-users";
import PaymentHistoryPage from "./pages/payment-history";
import MyTicketsPage from "./pages/my-tickets";
import OnboardingPage from "./pages/onboarding";
import HostAnalyticsPage from "./pages/host-analytics";
import HostVerificationPage from "./pages/host-verification";
import PrivacyPolicyPage from "./pages/privacy";
import TermsPage from "./pages/terms";
import RefundPolicyPage from "./pages/refund";
import FAQPage from "./pages/faq";
import ContactPage from "./pages/contact";
import BugReportPage from "./pages/bug-report";
import ForceUpdateGate from "./components/force-update-gate";
import BottomTabNav from "./components/bottom-tab-nav.tsx";
import InAppBrowserGate from "./components/InAppBrowserGate";
import { UploadQueueProvider } from "./context/upload-queue";
import UploadProgressToast from "./components/upload-progress-toast";

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface PendingRatingEvent {
  id: string;
  title: string;
  date_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  location_name: string;
  location_city: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-text mb-2">Something went wrong</h1>
            <p className="text-text-muted text-sm mb-6">Something unexpected happened. Please go back and try again.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (Capacitor.isNativePlatform()) {
                  window.location.assign("/#/");
                } else {
                  window.location.assign("/");
                }
              }}
              className="btn-primary-luxe font-bold px-6 py-3 rounded-xl"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── 404 Page ─────────────────────────────────────────────────────────────────

function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black brand-gradient-text mb-4 leading-none">404</div>
        <h1 className="text-xl font-bold text-text mb-2">Page not found</h1>
        <p className="text-text-muted text-sm mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary-luxe font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2">
          Go Home
        </Link>
      </div>
    </div>
  );
}

// ─── Legacy Party Redirect ────────────────────────────────────────────────────

function PartyRedirect() {
  const { eventId } = useParams<{ eventId?: string }>();
  const location = useLocation();
  
  // Extract trailing path after /parties/:eventId (if any)
  const subPath = location.pathname.substring(9 + (eventId?.length || 0));
  const target = eventId ? `/events/${eventId}${subPath}${location.search}` : `/events${location.search}`;
  
  return <Navigate to={target} replace />;
}

// ─── Scroll Restoration (#21) ─────────────────────────────────────────────────

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

// ─── Home Route (Landing for guests, Feed for logged-in users) ───────────────

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // On native (Android/iOS), guests must log in first
  if (Capacitor.isNativePlatform() && !user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Web guests land on the events page
  return user ? <FeedPage /> : <Navigate to="/events" replace />;
}

// ─── Auth Guards ────────────────────────────────────────────────────────────────

/**
 * ProtectedRoute: Requires the user to be logged in.
 * Shows a full-screen spinner while the auth state is being resolved.
 * Redirects to /auth/login if not authenticated.
 */
function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-text-muted text-sm">Loading MaskedOn…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
}

/**
 * GuestOnlyRoute: Only accessible when NOT logged in.
 * Redirects already-authenticated users to the feed (/).
 */
function GuestOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Pending crowd ratings state
  const [pendingRatings, setPendingRatings] = useState<PendingRatingEvent[]>([]);
  const [pendingChecked, setPendingChecked] = useState(false);

  // Offline detection (#49)
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    function handleOnline() { setIsOffline(false); }
    function handleOffline() { setIsOffline(true); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize Capacitor native plugins on first mount.
  // Use a ref for location so the back button handler always sees the current path
  // without needing to re-register the listener on every navigation.
  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    initCapacitor(
      (path) => {
        if (typeof path === "number") {
          navigate(path);
          return;
        }
        navigate(path);
      },
      () => locationRef.current,
    );
  }, [navigate]);

  // Register push notification token whenever the user logs in
  useEffect(() => {
    if (user) {
      initPushNotifications();
    }
  }, [user]);

  // Check for pending crowd ratings whenever user changes
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const res = await api.get("/users/me/pending-ratings");
        if (!active) return;
        setPendingRatings(res.data.data.pending || []);
      } catch {
        if (!active) return;
        setPendingRatings([]);
      }
      if (active) {
        setPendingChecked(true);
      }
    })();
    return () => { active = false; };
  }, [user]);

  // Auto-redirect brand-new users (account < 24h, no onboarding flag) to onboarding
  useEffect(() => {
    if (
      user &&
      !localStorage.getItem("maskedon-onboarding-done") &&
      Date.now() - new Date(user.created_at).getTime() < 24 * 60 * 60 * 1000 &&
      location.pathname !== "/onboarding"
    ) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate, location.pathname]);

  // #22 — Hide navbar/bottom-tab on auth pages and onboarding
  const isAuthPage =
    location.pathname.startsWith("/auth") ||
    location.pathname === "/onboarding" ||
    (location.pathname === "/" && !user);

  // Public browsing pages — show nav even for guests
  const isPublicBrowsingPage =
    location.pathname.startsWith("/events") ||
    location.pathname === "/";

  // Show rating gate if user has pending crowd ratings
  const showRatingGate = user && pendingChecked && pendingRatings.length > 0;

  // Show bottom tab for logged-in users OR guests browsing public pages
  const showBottomTab = (user || isPublicBrowsingPage) && !isAuthPage && !showRatingGate;

  return (
    <div className="premium-shell min-h-screen text-text">
      <ScrollToTop />
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-error/90 text-white text-xs font-semibold text-center py-2 px-4 backdrop-blur-sm">
          No internet connection — some features may not work
        </div>
      )}
      {!isAuthPage && !showRatingGate && <Navbar />}
      {showRatingGate && (
        <CrowdRatingGate
          pendingEvents={pendingRatings}
          onAllRated={() => { setPendingRatings([]); }}
        />
      )}
        <main role="main" className={`relative z-10 ${!isAuthPage && user ? "pb-24 md:pb-0" : ""} ${!isAuthPage && !user && isPublicBrowsingPage ? "pb-24 md:pb-0" : ""} ${showRatingGate ? "hidden" : ""}`}>
        <Routes>
        {/* ── Home: Landing (guest) or Feed (logged in) ── */}
        <Route path="/"                               element={<HomeRoute />} />

        {/* ── Public informational pages ── */}
        <Route path="/privacy"                        element={<PrivacyPolicyPage />} />
        <Route path="/terms"                          element={<TermsPage />} />
        <Route path="/refund"                         element={<RefundPolicyPage />} />
        <Route path="/faq"                            element={<FAQPage />} />
        <Route path="/contact"                        element={<ContactPage />} />
        <Route path="/bug-report"                     element={<BugReportPage />} />

        {/* ── Guest-only (login / register) ── */}
        <Route element={<GuestOnlyRoute />}>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* ── Public: Events browsing (guests + logged in) ── */}
        <Route path="/events"                        element={<DiscoverPage />} />
        <Route path="/events/:eventId"               element={<EventDetailPage />} />

        {/* ── Protected (requires login) ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/events/create"                 element={<CreateEventPage />} />
          <Route path="/events/:eventId/edit"            element={<EditEventPage />} />
          <Route path="/events/:eventId/rate"          element={<RateCrowdPage />} />
          <Route path="/events/:eventId/photos"        element={<EventPhotosPage />} />
          <Route path="/access-hub"                      element={<MyRequestsPage />} />
          <Route path="/my-requests"                    element={<MyRequestsPage />} />
          <Route path="/events/:eventId/ticket" element={<DigitalTicketPage />} />
          <Route path="/events/:eventId/scan-ticket" element={<ScanTicketPage />} />
          <Route path="/my-ratings"                    element={<MyRatingsPage />} />
          <Route path="/blocked-users"                 element={<BlockedUsersPage />} />
          <Route path="/payment-history"               element={<PaymentHistoryPage />} />
          <Route path="/my-tickets"                    element={<MyTicketsPage />} />
          <Route path="/friends"                        element={<FriendsPage />} />
          <Route path="/achievements"                   element={<AchievementsPage />} />
          <Route path="/dashboard/:eventId/attendees"   element={<AttendeesPage />} />
          <Route path="/dashboard"                      element={<DashboardPage />} />
          <Route path="/dashboard/:eventId/requests"   element={<ManageRequestsPage />} />
          <Route path="/profile/me"                     element={<ProfilePage />} />
          <Route path="/profile/me/photos"              element={<UserPhotosPage />} />
          <Route path="/profile/:userId"                element={<PublicProfilePage />} />
          <Route path="/profile/:userId/photos"         element={<UserPhotosPage />} />
          <Route path="/photos/:photoId"               element={<PhotoRedirectPage />} />
          <Route path="/notifications"                  element={<NotificationsPage />} />
          <Route path="/search"                         element={<SearchPage />} />
          <Route path="/settings"                       element={<SettingsPage />} />
          <Route path="/create-post"                    element={<CreatePostPage />} />
          <Route path="/post"                           element={<PostHubPage />} />
          <Route path="/onboarding"                     element={<OnboardingPage />} />
          <Route path="/dashboard/analytics"            element={<HostAnalyticsPage />} />
          <Route path="/host-verification"              element={<HostVerificationPage />} />
        </Route>

        {/* ── Redirects for legacy party paths ── */}
        <Route path="/parties"                       element={<PartyRedirect />} />
        <Route path="/parties/:eventId/*"            element={<PartyRedirect />} />

        {/* ── Catch-all: 404 page ── */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {showBottomTab && <BottomTabNav />}
      <UploadProgressToast />
    </div>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const isGitHubPages = window.location.hostname.includes("github.io");
  const Router = (Capacitor.isNativePlatform() || isGitHubPages) ? HashRouter : BrowserRouter;

  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <ErrorBoundary>
            <AnimatePresence>
              {!splashDone && (
                <SplashScreen key="splash" onComplete={() => setSplashDone(true)} />
              )}
            </AnimatePresence>
            <ForceUpdateGate>
              <UploadQueueProvider>
                <AppShell />
              </UploadQueueProvider>
            </ForceUpdateGate>
            <InAppBrowserGate />
          </ErrorBoundary>          </NotificationsProvider>        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
