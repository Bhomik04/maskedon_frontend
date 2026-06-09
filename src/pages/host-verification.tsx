import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle, Clock, XCircle,
  AlertTriangle, CreditCard, Building2, Upload, X, Eye, EyeOff,
  ShieldCheck, Loader2, RefreshCw,
} from "lucide-react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/errors";
import { isNative } from "../lib/capacitor";
import { takePhoto } from "../lib/native-camera";

// ── Types ───────────────────────────────────────────────────────────────────

type VerificationStatus = "pending" | "approved" | "rejected" | "flagged";

interface VerificationData {
  id: string;
  pan_name: string;
  pan_number_masked: string;
  aadhaar_name: string;
  aadhaar_number_masked: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_masked: string;
  bank_ifsc: string;
  status: VerificationStatus;
  rejection_reason: string | null;
  auto_flags: string[] | null;
  submitted_at: string;
  reviewed_at: string | null;
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VerificationStatus }) {
  const map = {
    pending: { icon: Clock, label: "Under Review", cls: "bg-warning/10 text-warning border-warning/20" },
    approved: { icon: CheckCircle, label: "Verified", cls: "bg-success/10 text-success border-success/20" },
    rejected: { icon: XCircle, label: "Rejected", cls: "bg-error/10 text-error border-error/20" },
    flagged: { icon: AlertTriangle, label: "Flagged — Under Review", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  };
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cls}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white ring-2 ring-primary ring-offset-2 ring-offset-bg" : "bg-surface text-text-muted"
          }`}>
            {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 rounded transition-all ${i < step ? "bg-primary" : "bg-surface"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HostVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const panFileInputRef = useRef<HTMLInputElement>(null);
  const aadhaarFileInputRef = useRef<HTMLInputElement>(null);
  const nextPath = new URLSearchParams(location.search).get("next") || "/settings";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<VerificationData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [step, setStep] = useState(0); // 0 = PAN, 1 = Bank, 2 = Review

  // Form state
  const [panNumber, setPanNumber] = useState("");
  const [panName, setPanName] = useState("");
  const [panImage, setPanImage] = useState<File | null>(null);
  const [panImagePreview, setPanImagePreview] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarName, setAadhaarName] = useState("");
  const [aadhaarImage, setAadhaarImage] = useState<File | null>(null);
  const [aadhaarImagePreview, setAadhaarImagePreview] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Load existing verification
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/verification/host");
        setExisting(res.data.data.verification);
      } catch {
        // no existing verification — that's fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function startEditing() {
    // Pre-fill where possible (masked values only — user re-enters sensitive fields)
    if (existing) {
      setPanName(existing.pan_name);
      setAadhaarName(existing.aadhaar_name);
      setBankAccountName(existing.bank_account_name);
      setBankIfsc(existing.bank_ifsc);
      setBankName(existing.bank_name);
    }
    setStep(0);
    setError("");
    setIsEditing(true);
  }

  function applyPanImage(file: File) {
    setPanImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setPanImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function applyAadhaarImage(file: File) {
    setAadhaarImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setAadhaarImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handlePickPanImage() {
    if (isNative()) {
      const file = await takePhoto();
      if (file) applyPanImage(file);
    } else {
      panFileInputRef.current?.click();
    }
  }

  async function handlePickAadhaarImage() {
    if (isNative()) {
      const file = await takePhoto();
      if (file) applyAadhaarImage(file);
    } else {
      aadhaarFileInputRef.current?.click();
    }
  }

  // ── PAN step validation ───────────────────────────────────────────────────

  const PAN_REGEX = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/;
  const AADHAAR_REGEX = /^[0-9]{12}$/;
  const panValid = PAN_REGEX.test(panNumber.trim()) && panName.trim().length >= 2;
  const aadhaarValid = AADHAAR_REGEX.test(aadhaarNumber.trim()) && aadhaarName.trim().length >= 2;
  const panImageReady = !!panImage || (isEditing && !!existing); // existing image OK on update
  const aadhaarImageReady = !!aadhaarImage || (isEditing && !!existing);

  function handleStep0Next() {
    if (!panValid) { setError("Please enter a valid PAN number and name."); return; }
    if (!aadhaarValid) { setError("Please enter a valid Aadhaar number and name."); return; }
    if (!panImageReady) { setError("Please upload your PAN card image."); return; }
    if (!aadhaarImageReady) { setError("Please upload your Aadhaar card image."); return; }
    setError("");
    setStep(1);
  }

  // ── Bank step validation ──────────────────────────────────────────────────

  const IFSC_REGEX = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
  const ACCOUNT_REGEX = /^[0-9]{9,18}$/;
  const bankValid =
    ACCOUNT_REGEX.test(bankAccountNumber.trim()) &&
    IFSC_REGEX.test(bankIfsc.trim()) &&
    bankAccountName.trim().length >= 2 &&
    bankName.trim().length >= 2;

  function handleStep1Next() {
    if (!bankValid) { setError("Please fill all bank details correctly."); return; }
    setError("");
    setStep(2);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("pan_number", panNumber.trim().toUpperCase());
    formData.append("pan_name", panName.trim());
    formData.append("aadhaar_number", aadhaarNumber.trim());
    formData.append("aadhaar_name", aadhaarName.trim());
    formData.append("bank_account_number", bankAccountNumber.trim());
    formData.append("bank_ifsc", bankIfsc.trim().toUpperCase());
    formData.append("bank_account_name", bankAccountName.trim());
    formData.append("bank_name", bankName.trim());
    if (panImage) formData.append("pan_image", panImage);
    if (aadhaarImage) formData.append("aadhaar_image", aadhaarImage);

    try {
      const method = existing ? api.put : api.post;
      const res = await method("/verification/host", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setExisting(res.data.data.verification);
      setIsEditing(false);
      if (nextPath === "/events/create") {
        navigate(nextPath, { replace: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Submission failed. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ── Render: status screen (existing, not editing) ─────────────────────────

  if (existing && !isEditing) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-12">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-10 md:pt-8">
          <Link to={nextPath} className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-black text-text tracking-tight">Host Verification</h1>
                <p className="text-text-muted text-xs">KYC status for receiving payments</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6 space-y-6">

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text">Verification Status</p>
              <StatusBadge status={existing.status} />
            </div>

            {existing.status === "approved" && (
              <div className="rounded-xl bg-success/10 border border-success/20 p-4 text-sm text-success">
                Your identity and bank account are verified. You can receive payments for your events.
              </div>
            )}

            {(existing.status === "pending" || existing.status === "flagged") && (
              <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 text-sm text-warning">
                Your submission is being reviewed. This usually takes 1–2 business days.
              </div>
            )}

            {existing.status === "rejected" && (
              <div className="rounded-xl bg-error/10 border border-error/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-error">Rejection Reason</p>
                <p className="text-sm text-text-muted">{existing.rejection_reason || "Please resubmit with accurate details."}</p>
              </div>
            )}

            {existing.auto_flags && existing.auto_flags.length > 0 && (
              <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 space-y-1">
                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Auto-detected issues</p>
                {existing.auto_flags.map((flag, i) => (
                  <p key={i} className="text-xs text-text-muted">• {flag}</p>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-white/5">
              <p className="text-xs font-bold text-text-dim uppercase tracking-wider">Submitted Details</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-text-muted text-xs mb-0.5">Name on PAN</p><p className="text-text font-semibold">{existing.pan_name}</p></div>
                <div><p className="text-text-muted text-xs mb-0.5">PAN Number</p><p className="text-text font-semibold font-mono">{existing.pan_number_masked}</p></div>
                <div><p className="text-text-muted text-xs mb-0.5">Name on Aadhaar</p><p className="text-text font-semibold">{existing.aadhaar_name}</p></div>
                <div><p className="text-text-muted text-xs mb-0.5">Aadhaar Number</p><p className="text-text font-semibold font-mono">{existing.aadhaar_number_masked}</p></div>
                <div><p className="text-text-muted text-xs mb-0.5">Bank</p><p className="text-text font-semibold">{existing.bank_name}</p></div>
                <div><p className="text-text-muted text-xs mb-0.5">IFSC</p><p className="text-text font-semibold font-mono">{existing.bank_ifsc}</p></div>
                <div><p className="text-text-muted text-xs mb-0.5">Account Holder</p><p className="text-text font-semibold">{existing.bank_account_name}</p></div>
                <div><p className="text-text-muted text-xs mb-0.5">Account Number</p><p className="text-text font-semibold font-mono">{existing.bank_account_masked}</p></div>
              </div>
              <p className="text-text-muted text-xs mt-2">
                Submitted {new Date(existing.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                {existing.reviewed_at && ` · Reviewed ${new Date(existing.reviewed_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}
              </p>
            </div>

            {existing.status !== "approved" && (
              <button onClick={startEditing} className="btn-secondary-luxe w-full py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Update & Resubmit
              </button>
            )}
            {existing.status === "approved" && (
              <button onClick={startEditing} className="btn-secondary-luxe w-full py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 opacity-70">
                <RefreshCw className="w-4 h-4" /> Update Bank Details
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Render: multi-step form ───────────────────────────────────────────────

  const stepTitles = ["PAN Card", "Bank Account", "Review & Submit"];

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-lg mx-auto px-4 pt-5 pb-10 md:pt-8">

        <button
          onClick={() => { if (step === 0) { if (isEditing) setIsEditing(false); else navigate(nextPath); } else setStep(s => s - 1); }}
          className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Back" : "Previous step"}
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Host Verification</h1>
              <p className="text-text-muted text-xs">One-time · Required to receive payments</p>
            </div>
          </div>
          <StepIndicator step={step} total={3} />
          <h2 className="text-base font-bold text-text">{stepTitles[step]}</h2>
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 rounded-xl bg-error/10 border border-error/20 p-3 text-sm text-error">
            {error}
          </motion.div>
        )}

        <AnimatePresence mode="wait">

          {/* ── Step 0: PAN ────────────────────────────────────────── */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-text-muted leading-relaxed">
                Your PAN card is required for identity verification under Indian tax laws. This information is kept strictly confidential and is only used to verify your identity.
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  PAN Number <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  className="input-luxe w-full font-mono uppercase"
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                />
                <p className="text-text-dim text-xs mt-1">10-character PAN card number</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Name as on PAN Card <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  className="input-luxe w-full"
                  placeholder="Full name exactly as printed on PAN"
                  value={panName}
                  onChange={(e) => setPanName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  PAN Card Image <span className="text-error">*</span>
                </label>
                <input
                  ref={panFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  title="Upload PAN card image"
                  aria-label="Upload PAN card image"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) applyPanImage(f); }}
                />
                {panImagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video">
                    <img src={panImagePreview} alt="PAN card preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setPanImage(null); setPanImagePreview(""); }}
                      aria-label="Remove PAN card image"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center tap-active"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handlePickPanImage}
                    className="w-full border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/40 transition tap-active"
                  >
                    <Upload className="w-6 h-6 text-text-muted" />
                    <p className="text-sm text-text-muted">Tap to upload PAN card photo</p>
                    <p className="text-xs text-text-dim">JPEG, PNG or WebP · Max 5MB</p>
                  </button>
                )}
                {isEditing && existing && !panImage && (
                  <p className="text-xs text-text-muted mt-2">Leave empty to keep your existing PAN image.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Aadhaar Number <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  className="input-luxe w-full font-mono"
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Name as on Aadhaar <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  className="input-luxe w-full"
                  placeholder="Full name exactly as printed on Aadhaar"
                  value={aadhaarName}
                  onChange={(e) => setAadhaarName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Aadhaar Card Image <span className="text-error">*</span>
                </label>
                <input
                  ref={aadhaarFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  title="Upload Aadhaar card image"
                  aria-label="Upload Aadhaar card image"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) applyAadhaarImage(f); }}
                />
                {aadhaarImagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video">
                    <img src={aadhaarImagePreview} alt="Aadhaar card preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setAadhaarImage(null); setAadhaarImagePreview(""); }}
                      aria-label="Remove Aadhaar card image"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center tap-active"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handlePickAadhaarImage}
                    className="w-full border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center gap-2 hover:border-primary/40 transition tap-active"
                  >
                    <Upload className="w-6 h-6 text-text-muted" />
                    <p className="text-sm text-text-muted">Tap to upload Aadhaar card photo</p>
                    <p className="text-xs text-text-dim">JPEG, PNG or WebP · Max 5MB</p>
                  </button>
                )}
                {isEditing && existing && !aadhaarImage && (
                  <p className="text-xs text-text-muted mt-2">Leave empty to keep your existing Aadhaar image.</p>
                )}
              </div>

              <button onClick={handleStep0Next} className="btn-primary-luxe w-full py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2">
                Next: Bank Details <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── Step 1: Bank Account ────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="glass-panel rounded-2xl p-6 space-y-5">
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs text-text-muted leading-relaxed">
                Payments from ticket sales will be transferred to this account. Use the same account where you want to receive funds.
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Account Holder Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  className="input-luxe w-full"
                  placeholder="Name as on bank account"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Bank Account Number <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAccountNumber ? "text" : "password"}
                    className="input-luxe w-full font-mono pr-10"
                    placeholder="9–18 digit account number"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                    maxLength={18}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccountNumber(v => !v)}
                    aria-label={showAccountNumber ? "Hide account number" : "Show account number"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition"
                  >
                    {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  IFSC Code <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  className="input-luxe w-full font-mono uppercase"
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                />
                <p className="text-text-dim text-xs mt-1">11-character IFSC code printed on cheque or passbook</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Bank Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  className="input-luxe w-full"
                  placeholder="e.g. State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <button onClick={handleStep1Next} className="btn-primary-luxe w-full py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2">
                Next: Review <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Review ──────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold text-text uppercase tracking-wider">PAN Details</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-text-muted text-xs mb-0.5">PAN Number</p><p className="text-text font-semibold font-mono">{panNumber.toUpperCase()}</p></div>
                  <div><p className="text-text-muted text-xs mb-0.5">Name on PAN</p><p className="text-text font-semibold">{panName}</p></div>
                  <div><p className="text-text-muted text-xs mb-0.5">Aadhaar Number</p><p className="text-text font-semibold font-mono">{"********"}{aadhaarNumber.slice(-4)}</p></div>
                  <div><p className="text-text-muted text-xs mb-0.5">Name on Aadhaar</p><p className="text-text font-semibold">{aadhaarName}</p></div>
                </div>
                {panImagePreview && (
                  <div className="rounded-xl overflow-hidden border border-white/10 aspect-video">
                    <img src={panImagePreview} alt="PAN card" className="w-full h-full object-cover" />
                  </div>
                )}
                {!panImagePreview && isEditing && existing && (
                  <p className="text-xs text-text-muted">Existing PAN card image will be kept.</p>
                )}
                {aadhaarImagePreview && (
                  <div className="rounded-xl overflow-hidden border border-white/10 aspect-video">
                    <img src={aadhaarImagePreview} alt="Aadhaar card" className="w-full h-full object-cover" />
                  </div>
                )}
                {!aadhaarImagePreview && isEditing && existing && (
                  <p className="text-xs text-text-muted">Existing Aadhaar image will be kept.</p>
                )}
              </div>

              <div className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold text-text uppercase tracking-wider">Bank Account</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-text-muted text-xs mb-0.5">Account Holder</p><p className="text-text font-semibold">{bankAccountName}</p></div>
                  <div><p className="text-text-muted text-xs mb-0.5">Bank</p><p className="text-text font-semibold">{bankName}</p></div>
                  <div><p className="text-text-muted text-xs mb-0.5">Account Number</p><p className="text-text font-semibold font-mono">{"*".repeat(Math.max(0, bankAccountNumber.length - 4))}{bankAccountNumber.slice(-4)}</p></div>
                  <div><p className="text-text-muted text-xs mb-0.5">IFSC</p><p className="text-text font-semibold font-mono">{bankIfsc.toUpperCase()}</p></div>
                </div>
              </div>

              <div className="rounded-xl bg-surface/50 border border-white/5 p-4 text-xs text-text-muted leading-relaxed">
                By submitting, you confirm that all details are accurate and belong to you. False information may result in account suspension. Verification typically takes 1–2 business days.
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary-luxe w-full py-3.5 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><ShieldCheck className="w-4 h-4" /> Submit for Verification</>}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
