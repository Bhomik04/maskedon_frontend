import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-hook";
import { useTheme } from "../context/use-theme";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Edit3, Moon, Sun, LogOut, Shield, User, Mail, Calendar, Loader2, Lock, Trash2, Eye, EyeOff, HelpCircle, FileText, MessageCircle, Bug, ChevronRight, Upload, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  // Change password
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwMessageType, setPwMessageType] = useState<"success" | "error">("success");

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteDialogRef = useRef<HTMLDivElement>(null);

  // ID verification
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idUploading, setIdUploading] = useState(false);
  const [idMessage, setIdMessage] = useState("");
  const [idMessageType, setIdMessageType] = useState<"success" | "error">("success");
  const [localIdStatus, setLocalIdStatus] = useState<string | null>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setBio(user.bio || "");
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get("edit") !== "profile") return;
    setEditing(true);
    navigate("/settings", { replace: true });
  }, [navigate, searchParams]);

  useEffect(() => {
    if (!message || messageType !== "success") return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message, messageType]);

  useEffect(() => {
    if (!pwMessage || pwMessageType !== "success") return;
    const timer = setTimeout(() => setPwMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [pwMessage, pwMessageType]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await api.put("/users/me", { display_name: displayName, bio });
      await refreshUser();
      setMessage("Profile updated successfully!");
      setMessageType("success");
      setEditing(false);
    } catch (error: unknown) {
      setMessage(getApiErrorMessage(error, "Update failed"));
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwMessage("");
    if (newPassword !== confirmPassword) {
      setPwMessage("New passwords do not match");
      setPwMessageType("error");
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage("New password must be at least 8 characters");
      setPwMessageType("error");
      return;
    }
    setPwSaving(true);
    try {
      await api.put("/users/me/password", { currentPassword, newPassword });
      setPwMessage("Password changed successfully!");
      setPwMessageType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
    } catch (err: unknown) {
      setPwMessage(getApiErrorMessage(err, "Failed to change password"));
      setPwMessageType("error");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      await api.delete("/users/me", { data: { password: deletePassword } });
      await logout();
      navigate("/auth/login", { replace: true });
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, "Failed to delete account"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleSignOut() {
    await logout();
    navigate("/auth/login", { replace: true });
  }

  async function handleIdVerificationSubmit(e: FormEvent) {
    e.preventDefault();
    if (!idFile) {
      setIdMessage("Please select a document image first.");
      setIdMessageType("error");
      return;
    }
    setIdUploading(true);
    setIdMessage("");
    try {
      const formData = new FormData();
      formData.append("document", idFile);
      await api.post("/users/me/id-verification", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLocalIdStatus("pending");
      setIdFile(null);
      if (idFileInputRef.current) idFileInputRef.current.value = "";
      setIdMessage("Your ID has been submitted for review. We'll notify you within 2-3 business days.");
      setIdMessageType("success");
    } catch (err: unknown) {
      setIdMessage(getApiErrorMessage(err, "Upload failed. Please try again."));
      setIdMessageType("error");
    } finally {
      setIdUploading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Back nav */}
        <Link to="/profile/me" className="text-text-muted hover:text-text text-sm mb-6 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-xl font-bold text-text tracking-tight">Settings</h1>
          <p className="text-text-dim text-sm mt-0.5">Manage your account and preferences</p>
        </motion.div>

        {/* Status message */}
        {messageType === "error" && message ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            role="alert"
            aria-live="polite"
            className="bg-error/10 border-error/20 text-error border rounded-xl px-4 py-3 mb-6 text-sm">
            {message}
          </motion.div>
        ) : message ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-success/10 border-success/15 text-success border rounded-xl px-4 py-3 mb-6 text-sm">
            {message}
          </motion.div>
        ) : null}

        {/* Profile Edit section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-text flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Profile Information
            </h2>
            {!editing && (
              <button onClick={() => { setEditing(true); setMessage(""); }}
                className="btn-secondary-luxe text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Display Name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100}
                  className="input-luxe w-full rounded-xl px-4 py-3.5 text-sm" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
                  className="input-luxe w-full rounded-xl px-4 py-3.5 resize-none text-sm" placeholder="Tell people about yourself..." />
                <p className="text-text-dim text-[10px] mt-1 text-right">{bio.length}/500</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="btn-primary-luxe font-bold px-6 py-3 rounded-xl transition disabled:opacity-50 flex-1 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
                </button>
                <button type="button" onClick={() => { setEditing(false); setDisplayName(user.display_name); setBio(user.bio || ""); }}
                  className="btn-secondary-luxe px-6 py-3 rounded-xl transition">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {[
                { icon: User, label: "Display Name", value: user.display_name },
                { icon: Mail, label: "Email", value: user.email },
                { icon: Shield, label: "Username", value: `@${user.username}` },
                { icon: Edit3, label: "Bio", value: user.bio || "No bio set" },
                { icon: Calendar, label: "Member Since", value: new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 border-b border-primary/[0.06] pb-4 last:border-b-0 last:pb-0">
                  <item.icon className="w-4 h-4 text-text-dim mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-text-dim uppercase tracking-wider font-bold block">{item.label}</span>
                    <p className="text-text mt-0.5 text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-text-dim pt-1">
                Username and email are permanent and cannot be changed.
              </p>
            </div>
          )}
        </motion.div>

        {/* Theme */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-3.5 h-3.5 text-accent" /> : <Sun className="w-3.5 h-3.5 text-warning" />}
            Appearance
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => toggleTheme("dark")}
              className={`px-4 py-3.5 rounded-xl font-bold text-sm transition border flex items-center justify-center gap-2 ${
                theme === "dark"
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-surface-light text-text border-primary/[0.08] hover:border-primary/15"
              }`}>
              <Moon className="w-4 h-4" /> Dark Mode
            </button>
            <button onClick={() => toggleTheme("light")}
              className={`px-4 py-3.5 rounded-xl font-bold text-sm transition border flex items-center justify-center gap-2 ${
                theme === "light"
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-surface-light text-text border-primary/[0.08] hover:border-primary/15"
              }`}>
              <Sun className="w-4 h-4" /> Light Mode
            </button>
          </div>
        </motion.div>

        {/* Dashboard Link */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-hot" /> Host Dashboard
          </h2>
          <p className="text-text-muted text-sm mb-4">Manage your hosted events, view requests, and track metrics.</p>
          <Link to="/dashboard" className="btn-secondary-luxe w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
            Open Host Dashboard
          </Link>
        </motion.div>

        {/* ID Verification */}
        {(() => {
          const idStatus = localIdStatus ?? user.id_verification_status ?? "not_submitted";
          type IdStatusCfg = { label: string; color: string; bg: string };
          const statusConfig: Record<string, IdStatusCfg> = {
            not_submitted: { label: "Not submitted", color: "text-text-muted", bg: "bg-surface-light" },
            pending:       { label: "Under review",  color: "text-warning",    bg: "bg-warning/10" },
            verified:      { label: "Verified",      color: "text-success",    bg: "bg-success/10" },
            rejected:      { label: "Rejected",      color: "text-error",      bg: "bg-error/10" },
          };
          const cfg = statusConfig[idStatus] ?? statusConfig["not_submitted"];
          const StatusIcon = idStatus === "verified" ? CheckCircle : idStatus === "pending" ? Clock : idStatus === "rejected" ? XCircle : AlertCircle;
          const canSubmit = idStatus === "not_submitted" || idStatus === "rejected";

          return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="glass-panel rounded-2xl p-6 mb-4">
              <h2 className="text-sm font-bold text-text mb-1 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary" /> Identity Verification
              </h2>
              <p className="text-text-dim text-xs mb-4">
                Upload a government-issued ID (Aadhaar or PAN) for a verified badge. Documents are stored securely and never shared publicly.
              </p>

              {/* Status badge */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 ${cfg.bg}`}>
                <StatusIcon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
              </div>

              {idMessage && (
                <div className={`text-xs px-3 py-2 rounded-lg mb-4 ${idMessageType === "error" ? "bg-error/10 text-error" : "bg-success/10 text-success"}`}
                  role="alert" aria-live="polite">
                  {idMessage}
                </div>
              )}

              {canSubmit && (
                <form onSubmit={handleIdVerificationSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">
                      Select Document
                    </label>
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:btn-secondary-luxe cursor-pointer"
                      aria-label="Upload Aadhaar or PAN card image"
                    />
                    <p className="text-[10px] text-text-dim mt-1">JPEG, PNG or WebP · Max 5 MB</p>
                  </div>
                  <button
                    type="submit"
                    disabled={!idFile || idUploading}
                    className="btn-primary-luxe w-full py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {idUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Submit for Verification</>}
                  </button>
                </form>
              )}
            </motion.div>
          );
        })()}

        {/* Change Password */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <button onClick={() => { setShowChangePassword(v => !v); setPwMessage(""); }}
            className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-text font-semibold text-sm">Change Password</p>
                <p className="text-text-dim text-xs mt-0.5">Update your account password</p>
              </div>
            </div>
            <span className="text-text-dim text-xs">{showChangePassword ? "Cancel" : "Change"}</span>
          </button>

          <AnimatePresence>
            {showChangePassword && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                onSubmit={handleChangePassword} className="mt-4 space-y-3 overflow-hidden">
                {pwMessageType === "error" && pwMessage ? (
                  <p role="alert" aria-live="polite" className="text-xs px-3 py-2 rounded-lg bg-error/10 text-error">
                    {pwMessage}
                  </p>
                ) : pwMessage ? (
                  <p className="text-xs px-3 py-2 rounded-lg bg-success/10 text-success">
                    {pwMessage}
                  </p>
                ) : null}
                <div className="relative">
                  <input type={showCurrentPw ? "text" : "password"} placeholder="Current password" value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password"
                    className="input-luxe w-full text-sm pr-10" />
                  <button type="button" onClick={() => setShowCurrentPw(v => !v)} aria-label={showCurrentPw ? "Hide" : "Show"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input type={showNewPw ? "text" : "password"} placeholder="New password (min 8 chars)" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password"
                    className="input-luxe w-full text-sm pr-10" />
                  <button type="button" onClick={() => setShowNewPw(v => !v)} aria-label={showNewPw ? "Hide" : "Show"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input type={showConfirmPw ? "text" : "password"} placeholder="Confirm new password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password"
                    className="input-luxe w-full text-sm pr-10" />
                  <button type="button" onClick={() => setShowConfirmPw(v => !v)} aria-label={showConfirmPw ? "Hide" : "Show"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim">
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button type="submit" disabled={pwSaving}
                  className="btn-primary-luxe w-full py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {pwSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Update Password"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Delete Account */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="glass-panel rounded-2xl p-6 mb-4">
          <button onClick={() => { setShowDeleteConfirm(true); setDeleteError(""); setDeletePassword(""); }}
            className="w-full flex items-center gap-3 text-left">
            <Trash2 className="w-5 h-5 text-error" />
            <div>
              <p className="text-error font-semibold text-sm">Delete Account</p>
              <p className="text-text-dim text-xs mt-0.5">Permanently remove your account and all data</p>
            </div>
          </button>

          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
                <motion.div ref={deleteDialogRef} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="glass-panel rounded-2xl p-6 max-w-sm w-full">
                  <h2 id="delete-dialog-title" className="text-error font-bold text-lg mb-1">Delete Account</h2>
                  <p className="text-text-dim text-sm mb-4">This action is irreversible. Enter your password to confirm.</p>
                  {deleteError && <p role="alert" aria-live="polite" className="text-xs bg-error/10 text-error px-3 py-2 rounded-lg mb-3">{deleteError}</p>}
                  <form onSubmit={handleDeleteAccount} className="space-y-3">
                    <div className="relative">
                      <input type={showDeletePw ? "text" : "password"} placeholder="Your password" value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)} required autoComplete="current-password"
                        className="input-luxe w-full text-sm pr-10" />
                      <button type="button" onClick={() => setShowDeletePw(v => !v)} aria-label={showDeletePw ? "Hide" : "Show"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim">
                        {showDeletePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 btn-secondary-luxe py-2.5 text-sm">Cancel</button>
                      <button type="submit" disabled={deleting}
                        className="flex-1 bg-error text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                        {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : "Delete"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sign Out */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-6">
          <button onClick={handleSignOut}
            className="bg-error/10 text-error hover:bg-error/20 font-bold px-4 py-3.5 rounded-xl transition border border-error/15 text-sm w-full flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>

        {/* Support & Legal */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
          className="glass-panel rounded-2xl p-5 mt-4">
          <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.15em] mb-4">Support & Legal</h2>
          <div className="divide-y divide-primary/[0.06]">
            {[
              { icon: HelpCircle, label: "Help & FAQ", desc: "Common questions answered", to: "/faq", color: "text-warning" },
              { icon: MessageCircle, label: "Contact Us", desc: "Get in touch with our team", to: "/contact", color: "text-accent" },
              { icon: Bug, label: "Report a Bug", desc: "Something broken? Let us know", to: "/bug-report", color: "text-error" },
              { icon: Shield, label: "Privacy Policy", desc: "How we handle your data", to: "/privacy", color: "text-primary" },
              { icon: FileText, label: "Terms of Service", desc: "Platform rules and guidelines", to: "/terms", color: "text-text-muted" },
            ].map(({ icon: Icon, label, desc, to, color }) => (
              <Link
                key={to}
                to={to}
                state={{ from: "/settings" }}
                className="flex items-center justify-between py-3.5 group tap-active"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <div>
                    <p className="text-text text-sm font-semibold">{label}</p>
                    <p className="text-text-dim text-xs">{desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-text-muted transition" />
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-primary/[0.06] text-center">
            <p className="text-text-dim text-[11px]">maskedOn v1.0.0 · © {new Date().getFullYear()}</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
