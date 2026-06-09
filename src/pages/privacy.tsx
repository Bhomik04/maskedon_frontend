import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
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

export default function PrivacyPolicyPage() {
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
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Privacy Policy</h1>
              <p className="text-text-muted text-xs">Effective Date: May 2, 2026 · Last Updated: May 13, 2026</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6">

          <p className="text-text-muted text-sm leading-relaxed mb-4">
            MaskedOn ("we", "us", "our", or "the Platform") is committed to respecting and protecting the privacy of every person who uses our Platform. This Privacy Policy is a legally binding document that explains in detail how we collect, use, store, share, transfer, and protect your personal data, and what rights you have in relation to that data.
          </p>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            This Policy is published in compliance with:
          </p>
          <ul className="text-text-muted text-sm leading-relaxed mb-8 list-disc pl-5 space-y-1.5">
            <li>The <strong className="text-text">Digital Personal Data Protection Act, 2023</strong> ("DPDPA") and the <strong className="text-text">Digital Personal Data Protection Rules, 2025</strong> ("DPDP Rules")</li>
            <li>The <strong className="text-text">Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong> ("SPDI Rules")</li>
            <li>The <strong className="text-text">Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong> ("Intermediary Guidelines")</li>
            <li>The <strong className="text-text">Information Technology Act, 2000</strong> ("IT Act")</li>
            <li>The <strong className="text-text">Consumer Protection (E-Commerce) Rules, 2020</strong></li>
          </ul>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            By registering on or using the Platform, you acknowledge that you have read, understood, and expressly consent to the collection, use, processing, storage, and disclosure of your personal data as described in this Privacy Policy. If you do not consent, you must not use the Platform.
          </p>

          <Section title="1. Definitions">
            <p>For the purposes of this Privacy Policy, the following terms have the meanings assigned below:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text">"Personal Data"</strong> means any data about an individual who is identifiable by or in relation to such data, as defined under the DPDPA, 2023.</li>
              <li><strong className="text-text">"Sensitive Personal Data or Information" ("SPDI")</strong> means personal data specified under Rule 3 of the SPDI Rules, 2011, including passwords, financial information, biometric data, and any data pertaining to sexual orientation.</li>
              <li><strong className="text-text">"Data Fiduciary"</strong> means MaskedOn, as the entity that determines the purpose and means of processing your personal data, as defined under the DPDPA, 2023.</li>
              <li><strong className="text-text">"Data Principal"</strong> means you, the individual to whom the personal data relates.</li>
              <li><strong className="text-text">"Data Processor"</strong> means any third event that processes personal data on behalf of MaskedOn.</li>
              <li><strong className="text-text">"Processing"</strong> means any operation performed on personal data, including collection, recording, storage, use, disclosure, transfer, erasure, or destruction.</li>
              <li><strong className="text-text">"Consent"</strong> means a free, specific, informed, unconditional, and unambiguous indication of your agreement to the processing of your personal data for a specified purpose.</li>
              <li><strong className="text-text">"User Content"</strong> means any photographs, text, event listings, ratings, messages, or other material you submit to or post on the Platform.</li>
              <li><strong className="text-text">"Platform"</strong> has the same meaning as in the Terms of Service.</li>
            </ul>
          </Section>

          <Section title="2. Identity of the Data Fiduciary">
            <p>The entity responsible for processing your personal data is MaskedOn, operated from Jaipur, Rajasthan, India.</p>
            <p><strong className="text-text">Data Protection Officer and Grievance Officer:</strong> As required under Rule 5(9) of the SPDI Rules and Rule 3(2) of the Intermediary Guidelines, MaskedOn designates a single officer to serve both functions. Contact:</p>
            <div className="mt-2 p-4 rounded-xl bg-bg/40 space-y-1">
              <p><strong className="text-text">Name:</strong> Bhomik Goyal</p>
              <p><strong className="text-text">Designation:</strong> Data Protection Officer & Grievance Officer</p>
              <p><strong className="text-text">Email:</strong> <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a></p>
              <p><strong className="text-text">Address:</strong> Jaipur, Rajasthan, India</p>
              <p><strong className="text-text">Subject line for data matters:</strong> "DATA REQUEST"</p>
              <p><strong className="text-text">Subject line for grievances:</strong> "PRIVACY GRIEVANCE"</p>
              <p className="text-xs text-text-muted/70 pt-1">Acknowledgement of complaints within 24 hours; resolution within 15 days of receipt, as required by the Intermediary Guidelines.</p>
            </div>
          </Section>

          <Section title="3. Personal Data We Collect">
            <p>We collect the following categories of personal data:</p>
            <p><strong className="text-text">3.1 Account Registration Data</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Display name and username</li>
              <li>Email address</li>
              <li>Password — stored exclusively as a <strong className="text-text">bcrypt hash</strong>; the original password is never stored or transmitted in plain text after initial hashing</li>
              <li>Date of birth — collected for age verification to confirm that you are at least 18 years old</li>
              <li>Consent record — timestamp and confirmation of your acceptance of the Terms of Service and this Privacy Policy at registration</li>
            </ul>
            <p><strong className="text-text">3.2 Profile Data</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Profile photograph (avatar image)</li>
              <li>Profile banner image</li>
              <li>Bio / About text (free-text field, optional)</li>
              <li>Phone number (optional, if provided by you)</li>
              <li>City or location (optional, if provided by you)</li>
            </ul>
            <p><strong className="text-text">3.3 Activity and Platform Data</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Events you create as a Host, including all event listing details</li>
              <li>Join requests you submit as a Guest and their approval/rejection status</li>
              <li>Event attendance history</li>
              <li>Photos you upload in relation to Events</li>
              <li>Social connections: users you have added as friends or blocked</li>
              <li>Social Ratings you submit and ratings you receive from other Users</li>
              <li>Direct messages you send and receive through the Platform's messaging feature</li>
              <li>Bug reports you submit, including any screenshots or descriptions of issues</li>
            </ul>
            <p><strong className="text-text">3.4 Technical and Device Data</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Push notification device token (only if you grant permission — see Section 9)</li>
              <li>IP address — collected server-side for security, fraud prevention, and abuse detection</li>
              <li>Device type and operating system — collected for compatibility, performance optimisation, service improvement, and internal analytics</li>
              <li>HTTP request metadata (User-Agent, timestamps) — retained in server logs for security and debugging</li>
            </ul>
            <p><strong className="text-text">3.5 Financial and Transaction Data</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Transaction history: Ticket IDs, Event IDs, amounts paid (in paise), transaction status, and Razorpay transaction reference IDs</li>
              <li><strong className="text-text">Payment card and bank account details are not collected or stored by MaskedOn.</strong> All payment instrument data is handled exclusively by Razorpay. MaskedOn receives only tokenised references and transaction confirmation statuses from Razorpay.</li>
            </ul>
            <p><strong className="text-text">3.6 Sensitive Personal Data or Information (SPDI)</strong></p>
            <p>Pursuant to Rule 3 of the SPDI Rules, 2011, the following data that MaskedOn may process constitutes SPDI and is subject to heightened protections:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-text">Password hash</strong> — protected by bcrypt hashing; the underlying password is SPDI</li>
              <li><strong className="text-text">Financial transaction information</strong> — transaction history constitutes financial information under the SPDI Rules</li>
              <li><strong className="text-text">Sexual orientation or gender identity</strong> — if you voluntarily provide such information in your profile, it is treated as SPDI and processed solely for the purpose of displaying it on your profile as you intend, and for no other purpose without your explicit separate consent</li>
            </ul>
            <p>MaskedOn does <strong className="text-text">not</strong> directly collect or store biometric data (e.g., fingerprints or facial recognition data). On mobile devices, device-level biometric authentication (Face ID, fingerprint unlock) may be used to access the application; this is handled entirely by your device's operating system and the relevant hardware. MaskedOn receives no biometric data from this process.</p>
            <p>MaskedOn will not collect SPDI unless it is either necessary for the lawful purpose for which the data was provided or you have provided explicit written consent for the specific use.</p>
          </Section>

          <Section title="4. Legal Basis and Purposes for Processing">
            <p>MaskedOn processes your personal data under the following lawful bases:</p>
            <p><strong className="text-text">4.1 Consent (primary basis)</strong></p>
            <p>By registering and using the Platform, you provide free, specific, informed, unconditional, and unambiguous consent to the processing of your personal data for the purposes described in this Policy. Your consent is recorded at registration with a timestamp. You may withdraw consent at any time by deleting your Account; however, withdrawal of consent may result in your inability to use the Platform.</p>
            <p><strong className="text-text">4.2 Contractual Necessity</strong></p>
            <p>Processing your registration data, profile data, event activity data, and transaction data is necessary to perform our obligations under the Terms of Service that constitute a contract between you and MaskedOn.</p>
            <p><strong className="text-text">4.3 Legitimate Interest</strong></p>
            <p>We process certain technical data (IP addresses, server logs, device metadata) to protect the security and integrity of the Platform, detect and prevent fraud, and ensure lawful use, where such processing does not override your rights and interests.</p>
            <p><strong className="text-text">4.4 Legal Obligation</strong></p>
            <p>We may process and retain personal data where required to comply with Applicable Law, including tax and accounting regulations, and in response to lawful requests from regulatory or judicial authorities.</p>
            <p><strong className="text-text">4.5 Specific Purposes of Processing</strong></p>
            <p>Your personal data is processed for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Creating, authenticating, and managing your Account;</li>
              <li>Enabling Event discovery, Ticket purchase, join requests, approvals, and attendance management;</li>
              <li>Calculating, displaying, and maintaining the Social Rating system;</li>
              <li>Facilitating direct messaging between Users;</li>
              <li>Processing payments and maintaining transaction records via Razorpay;</li>
              <li>Sending push notifications (only with your prior opt-in consent);</li>
              <li>Detecting, investigating, and preventing fraudulent, abusive, or illegal activity on the Platform;</li>
              <li>Responding to user support requests, grievances, and legal inquiries;</li>
              <li>Complying with obligations as an intermediary under the IT Act and Intermediary Guidelines, including responding to lawful takedown or disclosure orders;</li>
              <li>Analysing usage patterns, feature engagement, and Platform interaction data — both in aggregate and at an individual level — to improve user experience, develop new features, personalise content, and enhance overall service quality;</li>
              <li>Marketing and promoting the Platform, including using voluntarily shared User Content as described in the Terms of Service (Section 15).</li>
            </ul>
            <p>MaskedOn will endeavour to process personal data only for purposes compatible with those listed above. Where processing for a new purpose is required and that purpose is not covered by a legitimate use under Applicable Law, MaskedOn will obtain fresh consent before commencing such processing.</p>
          </Section>

          <Section title="5. Sensitive Personal Data — Special Protections">
            <p>5.1 MaskedOn will not collect SPDI from you unless it is necessary for a lawful purpose and either: (a) you have provided explicit written consent after being informed of the purpose; or (b) the collection is required by law.</p>
            <p>5.2 SPDI will not be shared with any third event without your explicit consent, except where disclosure is required by law, court order, or a government authority. Where disclosure is required, we will notify you to the extent permitted by law.</p>
            <p>5.3 SPDI will be processed only for the specific purpose for which consent was obtained and will be retained only for as long as necessary for that purpose or as required by Applicable Law.</p>
            <p>5.4 MaskedOn will implement reasonable security practices to protect SPDI, as prescribed by Rule 8 of the SPDI Rules and Section 43A of the IT Act.</p>
            <p>5.5 Your password is stored as a one-way bcrypt hash with a per-password salt. MaskedOn cannot retrieve or view your original password. In the event of a security incident involving password hashes, the hashes are computationally resistant to reversal by design.</p>
          </Section>

          <Section title="6. How We Share Your Information">
            <p><strong className="text-text">6.1 Information Visible to Other Users</strong></p>
            <p>The following information is publicly visible to other registered users of the Platform as part of the Platform's core social functionality:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Display name and username</li>
              <li>Profile photograph and banner image</li>
              <li>Bio / About text</li>
              <li>Social Rating (once a minimum of 3 ratings have been received)</li>
              <li>Events you have hosted (public listing)</li>
              <li>Photos you have posted in Event galleries</li>
              <li>Your public friend/connection list (if you choose not to restrict this)</li>
            </ul>
            <p>Your <strong className="text-text">email address, date of birth, phone number, IP address, device token, and transaction history are never shared with or visible to other Users.</strong></p>
            <p><strong className="text-text">6.2 Sharing with Data Processors (Third-Event Service Providers)</strong></p>
            <p>MaskedOn engages the following Data Processors who process personal data on our behalf, strictly for the purposes described:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse mt-2">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 pr-4 text-text font-semibold">Processor</th>
                    <th className="text-left py-2 pr-4 text-text font-semibold">Purpose</th>
                    <th className="text-left py-2 text-text font-semibold">Data Transferred</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4 text-text">Supabase Inc. (USA)</td>
                    <td className="py-2 pr-4">Database hosting and storage</td>
                    <td className="py-2">All account, profile, activity, and transaction data stored in the database</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4 text-text">Razorpay Software Pvt. Ltd. (India)</td>
                    <td className="py-2 pr-4">Payment processing</td>
                    <td className="py-2">Name, email, payment method details, transaction amount</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4 text-text">Google LLC / Firebase Cloud Messaging (USA)</td>
                    <td className="py-2 pr-4">Push notifications</td>
                    <td className="py-2">Device push notification token (only if opt-in granted)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-2 pr-4 text-text">GitHub, Inc. (USA)</td>
                    <td className="py-2 pr-4">Frontend application hosting (GitHub Pages)</td>
                    <td className="py-2">IP address, HTTP request headers (access logs)</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-text">Google Play Store / Apple App Store</td>
                    <td className="py-2 pr-4">App distribution</td>
                    <td className="py-2">Device identifiers and download metadata (governed by their respective privacy policies)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">Each Data Processor is engaged under a contractual obligation to process personal data only on MaskedOn's documented instructions and in accordance with Applicable Law.</p>
            <p><strong className="text-text">6.3 Disclosure Required by Law</strong></p>
            <p>MaskedOn may disclose your personal data to government authorities, law enforcement agencies, courts, or regulatory bodies if:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>We receive a valid legal order, court order, or government directive requiring disclosure;</li>
              <li>Disclosure is necessary to comply with our obligations as an intermediary under the IT Act or Intermediary Guidelines;</li>
              <li>Disclosure is necessary to protect the safety, rights, or property of MaskedOn, our Users, or the public.</li>
            </ul>
            <p>Where permitted by law, we will endeavour to notify you of such disclosure before or after it occurs.</p>
            <p><strong className="text-text">6.4 Business Transfers</strong></p>
            <p>In the event of a merger, acquisition, restructuring, sale of assets, or other change of control involving MaskedOn, your personal data may be transferred to the acquiring entity, subject to that entity honouring this Privacy Policy or providing you with a comparable level of protection. We will notify you of any such transfer via in-app notification or email before it takes effect.</p>
            <p><strong className="text-text">6.5 No Sale of Personal Data</strong></p>
            <p>MaskedOn does not and will not sell, rent, lease, or auction your personal data to any third event for commercial purposes.</p>
          </Section>

          <Section title="7. Cross-Border Transfer of Personal Data">
            <p>7.1 MaskedOn's primary database infrastructure is hosted on Supabase Inc., whose servers may be located in the United States of America or other jurisdictions outside India. Push notification delivery uses Firebase Cloud Messaging (Google LLC), which also operates from infrastructure outside India. Frontend hosting via GitHub Pages (GitHub, Inc.) is similarly US-based.</p>
            <p>7.2 By using the Platform, you expressly acknowledge and consent to the transfer of your personal data to these jurisdictions outside India for the purposes described in this Policy. The laws of those jurisdictions may differ from Indian law and may offer a different level of protection for personal data.</p>
            <p>7.3 MaskedOn takes the following measures to ensure an adequate level of protection for cross-border data transfers:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Engaging only Data Processors who have contractually committed to processing data in accordance with applicable data protection standards;</li>
              <li>Selecting processors that maintain industry-recognised certifications (e.g., Supabase's SOC 2 compliance, Google's ISO 27001 certification);</li>
              <li>Ensuring that financial data processed by Razorpay is handled within India under RBI-compliant frameworks.</li>
            </ul>
            <p>7.4 MaskedOn will comply with any cross-border transfer restrictions or requirements that may be notified by the Indian government under the DPDPA, 2023 upon the relevant provisions coming into force.</p>
          </Section>

          <Section title="8. Local Storage, Session Storage, and Cookies">
            <p>MaskedOn does <strong className="text-text">not</strong> use advertising cookies, third-event tracking pixels, or retargeting technologies. The Platform uses browser-native storage mechanisms only, as follows:</p>
            <p><strong className="text-text">8.1 localStorage (persists until manually cleared)</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><code className="bg-bg/40 px-1 rounded text-xs">access_token</code> — your JWT access token, used to authenticate API requests. Short-lived; automatically refreshed.</li>
              <li><code className="bg-bg/40 px-1 rounded text-xs">refresh_token</code> — your JWT refresh token, used to obtain a new access token when the current one expires without requiring re-login.</li>
              <li><code className="bg-bg/40 px-1 rounded text-xs">maskedon-theme</code> — your UI theme preference (dark or light mode).</li>
              <li><code className="bg-bg/40 px-1 rounded text-xs">maskedon-onboarding-done</code> — a flag indicating whether you have completed the onboarding flow.</li>
              <li>Draft event creation data — temporarily saved form data for Events you have started creating but not yet submitted, to prevent data loss on page refresh.</li>
            </ul>
            <p><strong className="text-text">8.2 sessionStorage (cleared when the browser tab or window is closed)</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>API response cache — a budget-capped (maximum 2MB) in-memory cache of recent API responses, persisted to sessionStorage for performance optimisation. This data is non-personal metadata about platform resources such as Event listings and User profiles you have recently viewed.</li>
            </ul>
            <p><strong className="text-text">8.3 No Third-Event Cookies</strong></p>
            <p>MaskedOn does not load or deploy any third-event advertising, tracking, or social sharing cookies and does not participate in cross-site tracking or behavioural advertising networks. MaskedOn may collect first-event interaction data through its own Platform infrastructure for the purposes of service improvement, feature development, and enhancing user experience as described in Section 4.5.</p>
            <p><strong className="text-text">8.4 Clearing Storage</strong></p>
            <p>You can clear all localStorage and sessionStorage data at any time through your browser or device settings. Clearing localStorage will log you out of the Platform on that device and remove all locally stored preferences. This does not delete your Account or any data stored on MaskedOn's servers.</p>
          </Section>

          <Section title="9. Push Notifications">
            <p>9.1 MaskedOn requests permission to send push notifications only at the time you first launch the application or explicitly navigate to the notifications settings. Push notifications are <strong className="text-text">opt-in only</strong>. We do not send notifications without your prior consent.</p>
            <p>9.2 When you grant push notification permission, your device generates a unique push notification token. This token is transmitted to MaskedOn's backend and stored in our database associated with your Account. It is shared with Firebase Cloud Messaging (Google LLC) solely for the purpose of routing notifications to your device.</p>
            <p>9.3 Push notifications may be sent for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Event join request approvals or rejections by Hosts;</li>
              <li>New friend requests or approvals;</li>
              <li>New Social Ratings received;</li>
              <li>New direct messages received;</li>
              <li>Upcoming Events you are registered for;</li>
              <li>Platform updates or announcements (infrequent).</li>
            </ul>
            <p>9.4 You may revoke push notification permission at any time through your device's operating system settings (iOS: Settings → Notifications → MaskedOn; Android: Settings → Apps → MaskedOn → Notifications). Revoking permission does not delete your Account or affect any other Platform functionality.</p>
            <p>9.5 Upon Account deletion, your device push notification token will be permanently removed from our systems within the 30-day data retention window described in Section 12.</p>
          </Section>

          <Section title="10. Direct Messages and Communications Privacy">
            <p>10.1 Direct messages exchanged between Users through the Platform's messaging feature are stored on MaskedOn's servers (hosted by Supabase) to enable reliable message delivery and conversation history retrieval.</p>
            <p>10.2 Direct messages are <strong className="text-text">end-to-end encrypted</strong>. MaskedOn's servers store encrypted message content and cannot read the plaintext content of your private messages. The encryption and decryption occurs on your device. Only you and the intended recipient can read your messages.</p>
            <p>10.3 Notwithstanding Section 10.2, MaskedOn may, in response to a valid court order or lawful government authority directive, provide encrypted message data to the relevant authority. MaskedOn cannot decrypt such data and will only provide what is technically accessible.</p>
            <p>10.4 You may delete individual messages or entire conversations at any time through the messaging interface. Deletion of messages removes them from your visible conversation history; the timing and completeness of deletion from server infrastructure follows the same 30-day cycle as Account deletion under Section 12.</p>
          </Section>

          <Section title="11. Security Measures">
            <p>MaskedOn implements the following technical and organisational security measures in accordance with Rule 8 of the SPDI Rules, 2011 and Section 43A of the IT Act, 2000:</p>
            <p><strong className="text-text">11.1 Data in Transit</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>All communication between your device and MaskedOn's servers is encrypted using <strong className="text-text">TLS (HTTPS)</strong>. Unencrypted HTTP requests are rejected or redirected.</li>
            </ul>
            <p><strong className="text-text">11.2 Authentication Security</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Passwords are hashed using <strong className="text-text">bcrypt</strong> with individual per-password salts before storage. The original password is never stored.</li>
              <li>Authentication uses short-lived JWT access tokens (expiry configurable, typically 15–60 minutes) paired with longer-lived refresh tokens stored server-side with expiry enforcement.</li>
              <li>Refresh tokens are stored as hashed values in the database. Compromised refresh tokens can be individually revoked.</li>
            </ul>
            <p><strong className="text-text">11.3 Application Security</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>All database queries use <strong className="text-text">parameterised SQL statements</strong>, preventing SQL injection attacks.</li>
              <li>Rate limiting is applied to authentication and sensitive API endpoints to mitigate brute-force and denial-of-service attacks.</li>
              <li>Input validation is enforced server-side using schema validation (Zod), independent of client-side validation.</li>
              <li>User-uploaded images are processed through compression algorithms before storage, reducing attack surface from malicious file uploads.</li>
            </ul>
            <p><strong className="text-text">11.4 Infrastructure Security</strong></p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Database infrastructure is hosted on Supabase, which maintains SOC 2 Type II compliance and implements row-level security, encrypted backups, and access controls.</li>
              <li>MaskedOn's backend servers implement access controls ensuring that only authorised processes can connect to the database.</li>
            </ul>
            <p><strong className="text-text">11.5 Limitation of Security Guarantees</strong></p>
            <p>No security system is impenetrable. MaskedOn cannot guarantee absolute security of data transmitted over the internet or stored in electronic systems. In the event of a security incident that affects your personal data, MaskedOn will take the actions described in Section 13 (Data Breach Response).</p>
          </Section>

          <Section title="12. Data Retention">
            <p><strong className="text-text">12.1 Active Accounts</strong></p>
            <p>MaskedOn retains your personal data for as long as your Account is active and as necessary to provide you with the Platform's services, comply with our legal obligations, resolve disputes, and enforce our agreements.</p>
            <p><strong className="text-text">12.2 After Account Deletion</strong></p>
            <p>When you delete your Account through Settings → Delete Account:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your Account is immediately deactivated and no longer accessible to other Users.</li>
              <li>MaskedOn retains your personal data for a period of <strong className="text-text">thirty (30) days</strong> from the deletion request. This window allows for Account recovery in the event of accidental deletion.</li>
              <li>After the expiry of the 30-day period, all personally identifiable data associated with your Account — including your email address, display name, profile photo, bio, phone number, date of birth, device tokens, messages, and friend/block lists — will be <strong className="text-text">permanently and irreversibly deleted</strong> from MaskedOn's active systems.</li>
            </ul>
            <p><strong className="text-text">12.3 Data Retained Beyond 30 Days</strong></p>
            <p>The following data may be retained beyond the 30-day period to the extent required by Applicable Law:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-text">Transaction records</strong> (payment amounts, Razorpay reference IDs, dates) — retained for up to <strong className="text-text">seven (7) years</strong> as required under the Income Tax Act, 1961, the Goods and Services Tax framework, and general accounting regulations. These records will be stripped of directly identifying personal information to the extent technically feasible.</li>
              <li><strong className="text-text">Server access logs</strong> containing IP addresses — retained for up to <strong className="text-text">ninety (90) days</strong> for security and abuse investigation purposes, after which they are automatically purged.</li>
              <li><strong className="text-text">Anonymised, aggregated data</strong> (e.g., "X events were created in City Y in Month Z") that does not identify you may be retained indefinitely for analytical and product development purposes.</li>
            </ul>
            <p><strong className="text-text">12.4 Backup Systems</strong></p>
            <p>Deleted data may persist in encrypted backup copies maintained by Supabase for a period of up to thirty (30) days following deletion, after which backup copies are overwritten or purged in accordance with Supabase's backup retention schedule.</p>
            <p><strong className="text-text">12.5 Inactive Accounts</strong></p>
            <p>In accordance with the DPDP Rules, 2025, if your Account remains inactive — meaning there has been no login, API interaction, or other engagement with the Platform — for a continuous period of <strong className="text-text">three (3) years</strong>, MaskedOn will initiate the erasure of your personal data. Before such erasure, MaskedOn will notify you at the email address associated with your Account at least <strong className="text-text">forty-eight (48) hours</strong> in advance, providing you with an opportunity to re-engage with the Platform and retain your Account.</p>
            <p><strong className="text-text">12.6 Minimum Retention of Processing Logs</strong></p>
            <p>Notwithstanding the above, MaskedOn shall retain personal data, associated traffic data, and processing logs for a minimum period of <strong className="text-text">one (1) year</strong> from the date of collection, as required under the DPDP Rules, 2025 and applicable directions issued by CERT-In.</p>
          </Section>

          <Section title="13. Data Breach Response">
            <p>13.1 In the event that MaskedOn becomes aware of a security incident that results in, or is reasonably likely to result in, unauthorised access to, disclosure of, or loss of personal data ("Data Breach"), MaskedOn will:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Investigate the incident promptly to assess its nature, scope, and impact;</li>
              <li>Take immediate technical steps to contain and mitigate the breach;</li>
              <li>Notify the <strong className="text-text">Data Protection Board of India</strong> within <strong className="text-text">seventy-two (72) hours</strong> of becoming aware of the breach, providing a detailed report including the nature and extent of the breach, the number of affected Data Principals, the likely impact, and the remedial measures taken, as required under the DPDPA, 2023 and the DPDP Rules, 2025;</li>
              <li>Notify affected Users <strong className="text-text">without unreasonable delay</strong> via in-app notification and/or email, providing information about the nature of the data affected, the steps taken to address it, and any recommended actions you should take;</li>
              <li>Report the incident to the <strong className="text-text">Indian Computer Emergency Response Team (CERT-In)</strong> within <strong className="text-text">six (6) hours</strong> of noticing the incident, as required under the Directions issued by CERT-In under Section 70B of the IT Act, 2000;</li>
            </ul>
            <p>13.2 MaskedOn's notification obligation is subject to any law enforcement or regulatory instruction to delay notification pending an investigation.</p>
            <p>13.3 If you suspect that your Account has been compromised or that your personal data has been accessed without authorisation, please contact us immediately at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with the subject line "SECURITY INCIDENT".</p>
          </Section>

          <Section title="14. Your Rights as a Data Principal">
            <p>Under the Digital Personal Data Protection Act, 2023 and the SPDI Rules, 2011, you have the following rights in relation to your personal data:</p>
            <p><strong className="text-text">14.1 Right of Access</strong></p>
            <p>You have the right to obtain confirmation of whether MaskedOn is processing your personal data and to receive a summary of the data held and the processing activities undertaken. You can view much of your data directly through your profile and settings. For a complete data summary, submit a request to <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with the subject line "DATA REQUEST — ACCESS".</p>
            <p><strong className="text-text">14.2 Right of Correction</strong></p>
            <p>You have the right to have inaccurate or incomplete personal data corrected or completed. You can edit most profile data directly through the Settings page. For data you cannot update through the Platform interface, contact us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with the subject line "DATA REQUEST — CORRECTION".</p>
            <p><strong className="text-text">14.3 Right of Erasure</strong></p>
            <p>You have the right to request the erasure of your personal data where it is no longer necessary for the purpose it was collected, or where you withdraw consent (where consent is the sole lawful basis for processing). You can delete your entire Account through Settings → Delete Account, which initiates the 30-day deletion process described in Section 12. For targeted deletion of specific data, contact us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with the subject line "DATA REQUEST — ERASURE".</p>
            <p><strong className="text-text">14.4 Right of Data Portability</strong></p>
            <p>You have the right to receive a copy of your personal data in a structured, commonly used, and machine-readable format. To request a data export, email us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with the subject line "DATA REQUEST — EXPORT". We will endeavour to provide your data within thirty (30) days of receipt of a verified request.</p>
            <p><strong className="text-text">14.5 Right to Withdraw Consent</strong></p>
            <p>Where processing is based on consent, you may withdraw your consent at any time. Withdrawal of consent does not affect the lawfulness of processing carried out before the withdrawal. Note that withdrawal of consent to the core data processing described in Section 4.1 will necessitate Account deletion as the Platform cannot be provided without processing foundational personal data.</p>
            <p><strong className="text-text">14.6 Right to Grievance Redressal</strong></p>
            <p>You have the right to have your grievances regarding the processing of your personal data addressed by MaskedOn. You may raise a grievance with our Data Protection and Grievance Officer at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> (subject line: "PRIVACY GRIEVANCE"). We will acknowledge your grievance within twenty-four (24) hours and resolve it within fifteen (15) days.</p>
            <p>If you are not satisfied with our resolution, you may approach:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The <strong className="text-text">Data Protection Board of India</strong> (once constituted and operational under the DPDPA, 2023);</li>
              <li>The appropriate <strong className="text-text">Consumer Disputes Redressal Commission</strong> under the Consumer Protection Act, 2019.</li>
            </ul>
            <p><strong className="text-text">14.7 Right to Nominate</strong></p>
            <p>Under the DPDPA, 2023, you have the right to nominate another individual to exercise your data rights on your behalf in the event of your death or incapacity. To register a nominee, contact us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with supporting documentation.</p>
            <p><strong className="text-text">14.8 Verification of Requests</strong></p>
            <p>To protect your privacy, MaskedOn will verify your identity before processing any data rights request. Requests must be submitted from the email address associated with your Account or be accompanied by sufficient identification to confirm your identity.</p>
          </Section>

          <Section title="15. Children's Privacy">
            <p>15.1 MaskedOn is an adult social platform intended exclusively for individuals aged <strong className="text-text">18 years and older</strong>. We do not knowingly collect personal data from anyone under the age of 18.</p>
            <p>15.2 Age is verified through self-declaration at registration (date of birth and checkbox confirmation). MaskedOn does not use government ID verification for age confirmation at registration, but reserves the right to request identity verification at any time where there is reasonable suspicion of age misrepresentation.</p>
            <p>15.3 If MaskedOn becomes aware that a person under the age of 18 has created an Account or provided personal data through the Platform, we will promptly delete the Account and all associated data without notice.</p>
            <p>15.4 If you believe that a minor has registered on the Platform, please report it immediately to <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with the subject line "MINOR ACCOUNT REPORT".</p>
          </Section>

          <Section title="16. Third-Event Links and Services">
            <p>16.1 The Platform may contain links to external websites, applications, or services operated by third events. This Privacy Policy does not apply to those third-event services. We strongly encourage you to review the privacy policies of any third-event services you access via links on the Platform.</p>
            <p>16.2 MaskedOn is not responsible for the privacy practices, data collection, or content of any third-event services.</p>
            <p>16.3 Razorpay, as a payment processor, will process your payment data in accordance with its own Privacy Policy available at <span className="text-text">www.razorpay.com/privacy</span>. MaskedOn is not responsible for Razorpay's data practices beyond our contractual agreement with them.</p>
          </Section>

          <Section title="17. Automated Decision-Making and Profiling">
            <p>17.1 <strong className="text-text">Social Rating Algorithm.</strong> MaskedOn uses an automated algorithm to calculate your Social Rating — a recency-weighted average of ratings submitted by other Users following Events. This calculation is automated and not subject to human review or adjustment by MaskedOn staff except in cases of suspected manipulation as described in the Terms of Service.</p>
            <p>17.2 <strong className="text-text">Feed Algorithm.</strong> The Platform uses an algorithmic feed to determine the order in which Events and content are displayed to you. This algorithm considers factors such as your social connections, event attendance history, location (if provided), and engagement patterns. It does not make decisions that produce legal or similarly significant effects on your rights.</p>
            <p>17.3 <strong className="text-text">Profiling Limitations.</strong> MaskedOn does not engage in profiling for the purposes of credit scoring, insurance pricing, employment assessment, or access to financial products. MaskedOn may analyse user engagement and interaction patterns to personalise your experience, optimise Platform features, and improve service quality. Such analysis does not produce legal or similarly significant effects on your rights beyond the Platform context described in these Terms.</p>
          </Section>

          <Section title="18. Changes to This Privacy Policy">
            <p>18.1 MaskedOn reserves the right to update or modify this Privacy Policy at any time. We will notify you of material changes via in-app notification and/or email at least seven (7) days before the revised Policy takes effect.</p>
            <p>18.2 The "Last Updated" date at the top of this page reflects the date of the most recent revision. We recommend that you review this Policy periodically.</p>
            <p>18.3 Your continued use of the Platform after the effective date of a revised Privacy Policy constitutes your acceptance of the changes. If you do not accept the revised Policy, you must cease using the Platform and delete your Account before the changes take effect.</p>
            <p>18.4 For significant changes that expand how we use your personal data or introduce new processing purposes, we will seek fresh consent where required under Applicable Law.</p>
          </Section>

          <Section title="19. Governing Law and Jurisdiction">
            <p>This Privacy Policy is governed by the laws of the Republic of India. Any dispute arising out of or in connection with this Privacy Policy shall be subject to the dispute resolution mechanism specified in the Terms of Service (arbitration with seat at Jaipur, Rajasthan), subject to your right to approach the Data Protection Board of India and Consumer Disputes Redressal Commissions as described in Section 14.6.</p>
          </Section>

          <Section title="20. Contact and Grievance Redressal">
            <p>For any questions, concerns, complaints, data rights requests, or grievances relating to this Privacy Policy or the processing of your personal data, contact us:</p>
            <div className="mt-3 p-4 rounded-xl bg-bg/40 space-y-1.5">
              <p><strong className="text-text">Platform:</strong> MaskedOn</p>
              <p><strong className="text-text">Principal Place of Operations:</strong> Jaipur, Rajasthan, India</p>
              <p><strong className="text-text">Data Protection Officer / Grievance Officer Email:</strong>{" "}<a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a></p>
              <div className="pt-2 space-y-1 text-xs text-text-muted/80">
                <p>Use subject line <strong>"DATA REQUEST — ACCESS/CORRECTION/ERASURE/EXPORT"</strong> for data rights requests.</p>
                <p>Use subject line <strong>"PRIVACY GRIEVANCE"</strong> for privacy complaints.</p>
                <p>Use subject line <strong>"SECURITY INCIDENT"</strong> to report suspected unauthorised access.</p>
                <p>Use subject line <strong>"MINOR ACCOUNT REPORT"</strong> to report an underage User.</p>
                <p className="pt-1">We acknowledge all complaints within <strong>24 hours</strong> and resolve within <strong>15 days</strong>, as required by the Intermediary Guidelines, 2021.</p>
              </div>
            </div>
          </Section>

        </motion.div>
      </div>
    </div>
  );
}
