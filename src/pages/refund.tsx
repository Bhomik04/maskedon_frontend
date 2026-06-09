import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/auth-hook";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-base font-bold text-text mb-3">{title}</h2>
      <div className="text-text-muted text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function RefundPolicyPage() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? (user ? "/settings" : "/");

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-10 md:pt-8">

        <Link to={from} className="text-text-muted hover:text-text text-sm mb-5 inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Refund & Cancellation Policy</h1>
              <p className="text-text-muted text-xs">Effective Date: May 20, 2026 · Last Updated: May 20, 2026</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6">

          <p className="text-text-muted text-sm leading-relaxed mb-8">
            This Refund and Cancellation Policy ("Policy") governs all ticket purchases and host security deposits made through the MaskedOn platform ("Platform"), operated by MaskedOn ("we", "us", "our"). By completing a payment on the Platform, you agree to the terms set out in this Policy. Please read it carefully before making any purchase.
          </p>

          <Section title="1. General">
            <p>MaskedOn is a technology platform that connects event hosts ("Hosts") with guests ("Guests"). All payments are processed through Cashfree Payments, a third-event payment gateway regulated by the Reserve Bank of India.</p>
            <p>When a Guest purchases a ticket to a event listed on MaskedOn, the payment is collected on behalf of the Host. MaskedOn deducts a platform service fee from each transaction as disclosed at the time of checkout.</p>
          </Section>

          <Section title="2. Guest-Initiated Cancellations">
            <p>Guests may request a cancellation of their ticket subject to the following conditions:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <span className="text-text font-semibold">More than 48 hours before the event:</span> Full refund of the ticket price. The platform service fee is non-refundable.
              </li>
              <li>
                <span className="text-text font-semibold">Between 24 and 48 hours before the event:</span> 50% refund of the ticket price. The platform service fee is non-refundable.
              </li>
              <li>
                <span className="text-text font-semibold">Less than 24 hours before the event:</span> No refund. Tickets are non-refundable within 24 hours of the event start time.
              </li>
              <li>
                <span className="text-text font-semibold">After the event has taken place:</span> No refund under any circumstances.
              </li>
            </ul>
            <p>To initiate a guest cancellation, contact us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with your registered email address and order details.</p>
          </Section>

          <Section title="3. Host-Initiated Cancellations">
            <p>If a Host cancels a event that has active ticket-holders:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>All Guests who purchased tickets will receive a <span className="text-text font-semibold">full refund of the ticket price</span>, including the platform service fee.</li>
              <li>The Host's security deposit (if applicable) may be forfeited in part or in full, at MaskedOn's sole discretion, depending on the notice period given.</li>
              <li>MaskedOn will notify all affected Guests by email and push notification within 24 hours of the cancellation being confirmed.</li>
            </ul>
          </Section>

          <Section title="4. Platform Service Fee">
            <p>The platform service fee charged by MaskedOn on each ticket is <span className="text-text font-semibold">non-refundable</span> in all guest-initiated cancellation scenarios.</p>
            <p>In the event of a Host-initiated cancellation or a event cancelled by MaskedOn due to policy violations, the platform service fee will be refunded to the Guest in full.</p>
          </Section>

          <Section title="5. Host Security Deposit">
            <p>Hosts may be required to pay a refundable security deposit when creating certain event listings. This deposit is:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Fully refunded within 5–7 business days after the event concludes, provided no policy violations occurred.</li>
              <li>Partially or fully forfeited if the Host cancels the event with less than 48 hours' notice, or if MaskedOn determines that the Host violated platform guidelines.</li>
            </ul>
          </Section>

          <Section title="6. Refund Process & Timeline">
            <p>All approved refunds are processed via Cashfree Payments back to the original payment source (UPI, debit card, credit card, or net banking).</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><span className="text-text font-semibold">Processing time:</span> Refunds are initiated by MaskedOn within 3 business days of approval.</li>
              <li><span className="text-text font-semibold">Credit time:</span> Once initiated, refunds typically reflect in your account within 5–7 business days, depending on your bank or payment provider.</li>
              <li>MaskedOn is not responsible for delays caused by the payment gateway or banking institutions.</li>
            </ul>
          </Section>

          <Section title="7. Disputes & Chargebacks">
            <p>Before initiating a chargeback with your bank, we strongly encourage you to reach out to us directly at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a>. Most disputes are resolved within 3–5 business days.</p>
            <p>Fraudulent chargeback requests may result in permanent suspension of your MaskedOn account and may be reported to relevant authorities.</p>
          </Section>

          <Section title="8. Non-Refundable Situations">
            <p>No refund will be provided in the following cases:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>The Guest was denied entry to the event due to their own conduct or failure to meet the host's entry requirements.</li>
              <li>The Guest voluntarily left the event early.</li>
              <li>The Guest's account was suspended or banned from the Platform.</li>
              <li>The refund request is made more than 7 days after the event date.</li>
              <li>The ticket was transferred, shared, or resold in violation of our Terms of Service.</li>
            </ul>
          </Section>

          <Section title="9. Modifications to This Policy">
            <p>MaskedOn reserves the right to update or modify this Policy at any time. Changes will be communicated by updating the "Last Updated" date above. Continued use of the Platform after any changes constitutes your acceptance of the revised Policy.</p>
          </Section>

          <Section title="10. Contact Us">
            <p>For any refund or cancellation queries, please contact our support team:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Email: <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a></li>
              <li>Website: <a href="https://maskedon.com/contact" className="text-primary hover:underline">maskedon.com/contact</a></li>
            </ul>
            <p>We aim to respond to all refund requests within 2 business days.</p>
          </Section>

        </motion.div>
      </div>
    </div>
  );
}
