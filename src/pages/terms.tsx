import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
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

export default function TermsPage() {
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
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text tracking-tight">Terms of Service</h1>
              <p className="text-text-muted text-xs">Effective Date: May 2, 2026 · Last Updated: May 13, 2026</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-panel rounded-2xl p-6">

          <p className="text-text-muted text-sm leading-relaxed mb-4">
            Please read these Terms of Service ("Terms") carefully before using the MaskedOn platform. These Terms constitute a legally binding agreement between you and MaskedOn. By accessing, registering on, or using MaskedOn in any manner, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.
          </p>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            If you do not agree to these Terms in their entirety, you must immediately cease use of the Platform and must not register an account.
          </p>

          <Section title="1. Definitions">
            <p>For the purposes of these Terms, the following expressions shall have the meanings assigned to them below:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text">"Platform"</strong> means the MaskedOn mobile application, web application, and all associated services, features, tools, APIs, and interfaces operated by us.</li>
              <li><strong className="text-text">"We", "Us", "Our", "MaskedOn"</strong> refers to the proprietors and operators of the MaskedOn Platform, having their principal place of operations at Jaipur, Rajasthan, India.</li>
              <li><strong className="text-text">"User", "You", "Your"</strong> refers to any individual who accesses, registers on, or uses the Platform in any capacity, including as a Host, Guest, or visitor.</li>
              <li><strong className="text-text">"Host"</strong> means a User who creates, lists, organises, or manages an Event on the Platform.</li>
              <li><strong className="text-text">"Guest"</strong> means a User who requests to attend, is admitted to, purchases a ticket for, or attends an Event listed on the Platform.</li>
              <li><strong className="text-text">"Event" or "Event"</strong> means any social gathering, event, meetup, or experience listed on the Platform by a Host.</li>
              <li><strong className="text-text">"Ticket"</strong> means a digitally issued entry pass, whether paid or free, granting a Guest admission to an Event subject to Host approval.</li>
              <li><strong className="text-text">"Platform Fee"</strong> means the fee charged by MaskedOn to Hosts and/or Guests for facilitating Events through the Platform, as described in Section 11.</li>
              <li><strong className="text-text">"Razorpay"</strong> means Razorpay Software Private Limited, the third-event payment gateway used to process financial transactions on the Platform.</li>
              <li><strong className="text-text">"Social Rating"</strong> means the numerical score (1–5 stars) assigned to a User based on ratings voluntarily submitted by other Users following Events.</li>
              <li><strong className="text-text">"Trust Gate"</strong> means the feature that allows Hosts to set a minimum Social Rating threshold for admission to their Event.</li>
              <li><strong className="text-text">"User Content"</strong> means any text, photos, images, videos, event listings, comments, ratings, messages, or other material submitted, uploaded, or posted by a User on the Platform.</li>
              <li><strong className="text-text">"Account"</strong> means the registered profile created by a User on the Platform.</li>
              <li><strong className="text-text">"Applicable Law"</strong> means all laws, statutes, regulations, rules, notifications, guidelines, circulars, and orders applicable in India, including but not limited to the Information Technology Act, 2000 ("IT Act"), the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 ("Intermediary Guidelines"), the Digital Personal Data Protection Act, 2023 ("DPDPA"), the Digital Personal Data Protection Rules, 2025 ("DPDP Rules"), the Bharatiya Nyaya Sanhita, 2023 ("BNS"), the Indian Contract Act, 1872, the Consumer Protection Act, 2019, the Payment and Settlement Systems Act, 2007, and the Arbitration and Conciliation Act, 1996.</li>
            </ul>
          </Section>

          <Section title="2. Acceptance of Terms and Modifications">
            <p>2.1 By creating an Account, clicking "I Agree," or otherwise accessing or using the Platform, you enter into a legally binding contract with MaskedOn on the terms set out herein.</p>
            <p>2.2 These Terms apply to all Users of the Platform regardless of the device or means of access used.</p>
            <p>2.3 We reserve the right to amend, modify, replace, or supplement these Terms at any time at our sole discretion. Where a change is material, we will notify you via in-app notification, email, or prominent notice on the Platform not less than seven (7) days before the change takes effect. Non-material changes take effect immediately upon publication.</p>
            <p>2.4 Your continued use of the Platform after any modification to these Terms constitutes your acceptance of the revised Terms. If you do not agree to the modified Terms, you must deactivate your Account and cease use of the Platform.</p>
            <p>2.5 These Terms are published in compliance with Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, which requires platforms to publish their terms of service, privacy policy, and user agreement.</p>
            <p>2.6 In accordance with the Intermediary Guidelines, MaskedOn shall notify all registered Users of these Terms, the Privacy Policy, and the consequences of non-compliance at least <strong className="text-text">once every twelve (12) months</strong> via in-app notification or email.</p>
          </Section>

          <Section title="3. Eligibility">
            <p>3.1 The Platform is intended solely for individuals who are <strong className="text-text">eighteen (18) years of age or older</strong>. By registering, you unconditionally represent and warrant that you are at least 18 years old.</p>
            <p>3.2 Age verification on the Platform is currently conducted through self-declaration (date of birth input and/or checkbox confirmation during registration). MaskedOn does not independently verify government identification documents at the time of registration. However, we reserve the right to request identity verification at any time and to terminate Accounts where there is reasonable suspicion of age misrepresentation.</p>
            <p>3.3 If you are using the Platform on behalf of a business, organisation, or other legal entity, you represent and warrant that you have the authority to bind that entity to these Terms, in which case "you" and "your" shall also refer to that entity.</p>
            <p>3.4 The Platform is intended primarily for users based in India. Users located outside India may access the Platform but do so at their own risk and are solely responsible for compliance with the laws of their local jurisdiction. MaskedOn makes no representation that the Platform or its content is appropriate or available for use in jurisdictions outside India.</p>
            <p>3.5 Users who have been previously suspended or permanently banned from the Platform are not permitted to re-register. Creating duplicate accounts to evade a ban is a material breach of these Terms.</p>
          </Section>

          <Section title="4. Account Registration and Security">
            <p>4.1 To access certain features of the Platform, you must create an Account by providing accurate, current, and complete information as required during the registration process.</p>
            <p>4.2 You agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Provide truthful, accurate, and non-misleading information during registration and to keep such information updated at all times;</li>
              <li>Maintain the confidentiality of your login credentials (username, password, tokens) and not share them with any third event;</li>
              <li>Not permit any other person to use your Account;</li>
              <li>Not create more than one Account per individual;</li>
              <li>Not create an Account using a false identity, pseudonym intended to deceive other Users, or impersonate any person or entity;</li>
              <li>Notify us immediately at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> if you suspect any unauthorised access to or use of your Account.</li>
            </ul>
            <p>4.3 You are solely responsible for all activity that occurs under your Account. MaskedOn shall not be liable for any loss or damage arising from your failure to maintain the security of your Account.</p>
            <p>4.4 MaskedOn reserves the right to disable or suspend your Account at any time if we have reasonable grounds to believe that you have provided false information, breached these Terms, or if your Account security has been compromised.</p>
            <p>4.5 Your Account and your profile (including your Social Rating, followers, connections, and Event history) are personal to you and are non-transferable.</p>
          </Section>

          <Section title="5. Nature of the Platform — Intermediary Status">
            <p>5.1 MaskedOn is an online intermediary platform as defined under Section 2(1)(w) of the Information Technology Act, 2000 and the Intermediary Guidelines, 2021. MaskedOn facilitates the discovery, listing, and management of social events and events. We do not organise, manage, host, or operate any Event listed on the Platform.</p>
            <p>5.2 MaskedOn is not a event to any agreement or transaction between Hosts and Guests. The Host is solely and exclusively responsible for the Event they create, including its legality, safety, accuracy of information, and fulfilment of any commitments made to Guests.</p>
            <p>5.3 MaskedOn acts as a payment aggregator for the limited purpose of facilitating ticket transactions through Razorpay. This does not constitute MaskedOn's assumption of any liability with respect to the underlying Event or transaction.</p>
            <p>5.4 MaskedOn shall observe the due diligence obligations prescribed under the Intermediary Guidelines, including but not limited to taking down unlawful content upon receiving actual knowledge or a government/court order.</p>
            <p>5.5 MaskedOn shall report cybersecurity incidents to the <strong className="text-text">Indian Computer Emergency Response Team (CERT-In)</strong> within the timelines prescribed under the Information Technology (The Indian Computer Emergency Response Team and Manner of Performing Functions and Duties) Rules, 2013 and subsequent Directions issued under Section 70B of the IT Act, 2000, including within <strong className="text-text">six (6) hours</strong> of noticing the incident where applicable.</p>
            <p>5.6 MaskedOn is not responsible for the actions, omissions, conduct, or content of any User, whether on or off the Platform, including at Events discovered through the Platform.</p>
          </Section>

          <Section title="6. User Conduct and Prohibited Activities">
            <p>6.1 By using the Platform, you agree to conduct yourself in accordance with these Terms and all Applicable Laws.</p>
            <p>6.2 You must not, directly or indirectly:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Post false, fraudulent, misleading, or deceptive Event listings, descriptions, pricing, or other information;</li>
              <li>Impersonate any person or entity, or falsely claim an affiliation with any person, entity, or brand;</li>
              <li>Harass, threaten, intimidate, stalk, bully, defame, or abuse any other User;</li>
              <li>Discriminate against or refuse admission to any person on grounds prohibited under the Constitution of India or applicable anti-discrimination laws, including on grounds of religion, race, caste, sex, place of birth, language, or disability;</li>
              <li>Share, upload, or distribute any content that is obscene, pornographic, harmful to minors, or violates the Information Technology Act, 2000 (including Sections 66, 67, 67A, and 67B thereof), the Bharatiya Nyaya Sanhita, 2023, or any other Applicable Law;</li>
              <li>Post, transmit, or share any content that threatens the unity, integrity, defence, security, or sovereignty of India, friendly relations with foreign States, or public order, or that incites the commission of any cognisable offence, or that is patently false, misleading, or unverified and published with the intent to deceive or mislead;</li>
              <li>Transmit or distribute any malware, virus, Trojan horse, or any other code designed to disrupt, damage, or gain unauthorised access to any system;</li>
              <li>Scrape, crawl, spider, data-mine, or otherwise extract information from the Platform by automated means without our prior written consent;</li>
              <li>Reverse-engineer, decompile, disassemble, or attempt to derive the source code of any part of the Platform;</li>
              <li>Circumvent, disable, or interfere with any security or access-control features of the Platform;</li>
              <li>Manipulate the Social Rating system, including by creating fake accounts, coordinating mass ratings, or coercing other Users to submit ratings;</li>
              <li>Use the Platform for any commercial solicitation, pyramid schemes, chain letters, unsolicited mass messaging, or spam;</li>
              <li>Collect or harvest personally identifiable information of other Users without their consent;</li>
              <li>Engage in any activity that creates unreasonable legal liability for MaskedOn or that could expose MaskedOn to regulatory action;</li>
              <li>Violate the intellectual property rights, privacy rights, or other rights of any third event;</li>
              <li>Facilitate or promote any illegal activity, including the use, sale, or distribution of controlled substances in violation of the Narcotic Drugs and Psychotropic Substances Act, 1985.</li>
            </ul>
            <p>6.3 MaskedOn reserves the right to monitor, review, and analyse User activity, content, and interaction patterns on the Platform to ensure compliance with these Terms, improve Platform safety and service quality, detect and prevent fraud or abuse, and fulfil its obligations under Applicable Law. Our failure to act on a specific violation does not constitute a waiver of our rights.</p>
          </Section>

          <Section title="7. Host Responsibilities and Event Listings">
            <p>7.1 <strong className="text-text">Accuracy of Listings.</strong> Hosts are solely responsible for the accuracy, completeness, and legality of all information in their Event listing, including the event name, description, venue address, date, start time, end time, maximum capacity, ticket price, guest requirements, and any content restrictions.</p>
            <p>7.2 <strong className="text-text">Legal Compliance.</strong> Hosts represent and warrant that each Event they list complies with all Applicable Laws, including:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Local municipal laws, zoning regulations, and noise ordinances applicable to the venue;</li>
              <li>Maximum occupancy limits prescribed by fire safety and building regulations;</li>
              <li>Applicable state excise laws if the Event involves the service or consumption of alcohol;</li>
              <li>Any licences, permits, or no-objection certificates required for hosting the Event at the designated venue;</li>
              <li>Police permission requirements for public gatherings where applicable under state law.</li>
            </ul>
            <p>7.3 <strong className="text-text">Alcohol and 18+ Events.</strong> Hosts who list Events involving the service or consumption of alcohol must clearly indicate this in their Event listing. Hosts must comply with the excise laws of the state in which the Event is held, obtain all required licences, and ensure that alcohol is not served to persons under the legal drinking age in that state. MaskedOn does not endorse, authorise, or accept responsibility for the lawful service of alcohol at any Event. The Host alone bears all liability for violations of excise law.</p>
            <p>7.4 <strong className="text-text">Attendee Safety.</strong> Hosts are responsible for the safety and reasonable well-being of attendees at their Events. MaskedOn strongly recommends that Hosts:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Ensure the venue is safe and compliant with fire safety and structural regulations;</li>
              <li>Have a plan for medical or other emergency situations;</li>
              <li>Not permit attendance beyond the venue's legally permitted capacity.</li>
            </ul>
            <p>7.5 <strong className="text-text">Guest Approval (Gatekeeper Role).</strong> Hosts are the sole decision-makers regarding which Guests to admit to their Event. MaskedOn does not intervene in this process. Hosts may set minimum Trust Gate rating thresholds and other eligibility criteria, provided that such criteria do not constitute discrimination in violation of Section 6.2.</p>
            <p>7.6 <strong className="text-text">Event Cancellation by Host.</strong> If a Host cancels an Event after Guests have purchased Tickets, the Host must notify all affected Guests through the Platform as soon as practicable. Refunds will be processed in accordance with Section 12. The Host acknowledges that cancellations negatively impact their Social Rating and their standing on the Platform.</p>
            <p>7.7 <strong className="text-text">MaskedOn Not a Co-Organiser.</strong> MaskedOn's facilitation of ticket sales, attendee management, and event discovery does not make MaskedOn a co-organiser, co-host, promoter, or agent of any Event. MaskedOn expressly disclaims all liability arising from the conduct, cancellation, safety, or failure of any Event.</p>
          </Section>

          <Section title="8. Guest Responsibilities">
            <p>8.1 Guests are responsible for reviewing all Event details before requesting or purchasing a Ticket, including venue, date, time, dress code, capacity, age requirements, and any terms imposed by the Host.</p>
            <p>8.2 Guests represent and warrant that they meet all eligibility criteria specified by the Host, including minimum Social Rating requirements set via the Trust Gate feature.</p>
            <p>8.3 Guests must comply with the rules, instructions, and reasonable requests of the Host and venue management at all times during an Event. MaskedOn is not responsible for any Guest's conduct during an Event.</p>
            <p>8.4 Guests acknowledge that attendance at an Event is entirely at their own risk. MaskedOn does not verify the safety, legality, or suitability of any Event venue or the truthfulness of any Event listing.</p>
            <p>8.5 Guests must not misrepresent themselves to a Host (e.g., through a false Social Rating, fake profile, or proxy account) to gain admission to an Event they would otherwise not qualify for. Such misrepresentation constitutes a material breach of these Terms.</p>
          </Section>

          <Section title="9. Ticketing">
            <p>9.1 Tickets issued through the Platform are digital and non-transferable unless the Host expressly permits transfers in their Event listing.</p>
            <p>9.2 A Ticket constitutes a revocable licence to attend the Event and does not create any contractual obligation on MaskedOn to ensure your attendance. The Host retains the right to refuse admission in accordance with their Event rules, provided such refusal is not on discriminatory grounds as described in Section 6.2.</p>
            <p>9.3 Ticket availability is subject to Event capacity limits set by the Host. MaskedOn does not guarantee Ticket availability for any Event.</p>
            <p>9.4 MaskedOn does not verify the credentials, legal compliance status, or identity of Hosts. Purchasing a Ticket to any Event is at the Guest's own risk and judgment.</p>
            <p>9.5 Any secondary or resale market for Tickets is strictly prohibited without MaskedOn's prior written consent. Tickets must not be sold, auctioned, or transferred at a price higher than their face value. Violation of this clause may result in Account termination and cancellation of associated Tickets without refund.</p>
          </Section>

          <Section title="10. Payments and Transaction Processing">
            <p>10.1 <strong className="text-text">Payment Gateway.</strong> All financial transactions on the Platform, including Ticket purchases and Platform Fee collections, are processed by Razorpay Software Private Limited ("Razorpay"), a third-event payment service provider regulated by the Reserve Bank of India. Your use of Razorpay's services is governed by Razorpay's own terms and conditions and privacy policy available at www.razorpay.com. MaskedOn is not responsible for any failure, error, or delay caused by Razorpay.</p>
            <p>10.2 <strong className="text-text">Currency.</strong> All prices displayed on the Platform are in Indian Rupees (INR). Ticket prices are stored internally in paise (1 INR = 100 paise) and displayed rounded to the nearest rupee. International payment cards may attract foreign exchange conversion fees charged by your card issuer, for which MaskedOn accepts no responsibility.</p>
            <p>10.3 <strong className="text-text">Payment Authorisation.</strong> By initiating a payment, you authorise MaskedOn and Razorpay to charge the payment method you have provided for the total amount displayed at checkout, including the Ticket price, MaskedOn Platform Fee, Razorpay processing fee, and applicable taxes.</p>
            <p>10.4 <strong className="text-text">Transaction Security.</strong> MaskedOn does not store your full card details on our servers. All payment card data is handled by Razorpay in accordance with PCI-DSS security standards. MaskedOn is not responsible for any unauthorised access to payment information that occurs at the Razorpay level or through a payment network breach.</p>
            <p>10.5 <strong className="text-text">Payment Failures.</strong> If a payment fails or is declined, your Ticket booking shall not be confirmed. MaskedOn is not liable for payment failures caused by network issues, bank declines, or Razorpay downtime. In the event of a double charge or erroneous deduction, please contact us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> within seven (7) days of the transaction date.</p>
            <p>10.6 <strong className="text-text">Taxes.</strong> You are responsible for all applicable taxes on your purchases. MaskedOn will collect and remit Goods and Services Tax (GST) and any other taxes as required under Applicable Law. Tax invoices may be requested by writing to <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a>.</p>
          </Section>

          <Section title="11. Platform Fees">
            <p>11.1 MaskedOn charges fees for facilitating Events and transactions through the Platform. These fees may include:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text">Host Commission:</strong> A percentage of the gross Ticket revenue collected from Guests, deducted before disbursement to the Host. The applicable percentage is disclosed to the Host during the Event creation flow and may vary based on the Event type, pricing, or tier.</li>
              <li><strong className="text-text">Guest Platform Fee:</strong> A flat or percentage-based fee added to the Ticket price payable by Guests at checkout. This fee is clearly disclosed prior to payment confirmation and forms part of the total amount charged.</li>
              <li><strong className="text-text">Subscription / Premium Features:</strong> MaskedOn may offer optional subscription plans or premium features to Hosts or Guests. The pricing, billing cycle, and scope of any such subscription will be separately disclosed at the point of purchase.</li>
            </ul>
            <p>11.2 Razorpay charges its own transaction processing fees separately from MaskedOn Platform Fees. Razorpay fees are governed by your agreement with Razorpay and are typically deducted at source from transaction proceeds.</p>
            <p>11.3 MaskedOn reserves the right to modify its fee structure at any time. Changes to fees will be communicated to you at least fourteen (14) days in advance via the Platform and/or email. Continued use of the Platform after the effective date of a fee change constitutes acceptance of the revised fees.</p>
            <p>11.4 All Platform Fees are non-refundable except as expressly stated in the Refund Policy under Section 12.</p>
          </Section>

          <Section title="12. Refund and Cancellation Policy">
            <p>12.1 <strong className="text-text">Guest-Initiated Cancellation.</strong> If a Guest cancels their Ticket, a refund will be processed for the Ticket face value, less (a) the MaskedOn Platform Fee applicable to that transaction and (b) the Razorpay payment processing fee. The Platform Fee and Razorpay fees are non-refundable in all circumstances.</p>
            <p>12.2 <strong className="text-text">Host-Initiated Cancellation.</strong> If a Host cancels an Event after Guests have purchased Tickets, MaskedOn will initiate refunds for all affected Guests for the Ticket face value, less (a) the MaskedOn Platform Fee and (b) the Razorpay payment processing fee. MaskedOn will not refund any Host commission or subscription fees in such circumstances.</p>
            <p>12.3 <strong className="text-text">Timing of Refunds.</strong> Refund processing timelines are subject to Razorpay's and the relevant bank's processing cycles, which typically range from five (5) to ten (10) business days from the date of initiation. MaskedOn is not responsible for delays in refund credit attributable to your bank or Razorpay.</p>
            <p>12.4 <strong className="text-text">No Show.</strong> If a Guest fails to attend an Event for which they hold a confirmed Ticket, no refund will be issued unless the Event has been cancelled by the Host or MaskedOn determines an exceptional circumstance exists at its sole discretion.</p>
            <p>12.5 <strong className="text-text">Free Events.</strong> No monetary refund applies to free Events. Cancellation of a reservation for a free Event does not attract any charge or monetary penalty, but repeated no-shows may negatively impact a Guest's Social Rating at the Host's discretion.</p>
            <p>12.6 <strong className="text-text">Refund Disputes.</strong> All refund-related disputes must be raised with us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> within fourteen (14) days of the relevant Event date. MaskedOn's determination on refund disputes shall be final and binding, subject to any statutory rights you may have under the Consumer Protection Act, 2019.</p>
            <p>12.7 <strong className="text-text">Chargebacks.</strong> If you initiate a chargeback with your bank or card issuer without first contacting MaskedOn and allowing us a reasonable opportunity to resolve the matter, we reserve the right to suspend your Account pending investigation. Fraudulent chargebacks may result in permanent Account termination and recovery proceedings under Applicable Law.</p>
          </Section>

          <Section title="13. Social Rating System">
            <p>13.1 <strong className="text-text">Overview.</strong> The MaskedOn Social Rating system allows Users to rate one another on a scale of 1 to 5 stars following an Event they both attended. Ratings are voluntary and reflect the rater's subjective assessment. The Social Rating displayed on a User's profile is a recency-weighted average and is only made publicly visible once a User has received a minimum of three (3) ratings.</p>
            <p>13.2 <strong className="text-text">Nature of Ratings.</strong> Social Ratings on MaskedOn are purely social and reputational in nature. They are not intended to constitute, and shall not be construed as, a credit score, financial assessment, background check, employment reference, or any other formal evaluation for regulated or statutory purposes. MaskedOn expressly disclaims all liability for any consequence arising from a User's Social Rating beyond the context of the Platform.</p>
            <p>13.3 <strong className="text-text">Rating Integrity.</strong> MaskedOn reserves the right to investigate, modify, withhold, or permanently remove ratings that are found to be:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Submitted by fake, duplicate, or inauthentic accounts;</li>
              <li>Part of a coordinated manipulation campaign or "review bombing";</li>
              <li>Submitted under coercion, inducement, or bribery;</li>
              <li>Otherwise in violation of these Terms or our community standards.</li>
            </ul>
            <p>13.4 <strong className="text-text">Unfavourable Ratings.</strong> Ratings will not be removed solely because they are negative or unfavourable to the rated User, provided they comply with these Terms. The integrity of honest peer feedback is fundamental to the Platform.</p>
            <p>13.5 <strong className="text-text">No Factual Adjudication.</strong> MaskedOn does not adjudicate the factual accuracy of any individual rating. Disagreements regarding the content of a rating must be resolved between the events directly. MaskedOn may remove a rating only for violations of these Terms, not based on disagreement with its subjective content.</p>
            <p>13.6 <strong className="text-text">Consequences of Low Rating.</strong> A low Social Rating may limit your ability to join Events that use the Trust Gate feature. MaskedOn does not guarantee any minimum Social Rating to any User and is not liable for any opportunity lost or access denied on account of your Social Rating.</p>
          </Section>

          <Section title="14. Trust Gate Feature">
            <p>14.1 The Trust Gate feature allows Hosts to set a minimum Social Rating threshold, below which Guest join requests will be automatically declined for their Event. This threshold is established entirely at the Host's discretion and is communicated to prospective Guests on the Event listing.</p>
            <p>14.2 MaskedOn is not the decision-maker in the Trust Gate process. We provide the technological mechanism only. The Host's choice of threshold, and the resulting admission or exclusion of any Guest, is the Host's sole responsibility.</p>
            <p>14.3 Guests who do not meet a Host's Trust Gate threshold will be unable to submit a join request for that Event. This is a platform-enforced feature operating at the Host's request and does not constitute discrimination by MaskedOn.</p>
            <p>14.4 Hosts must ensure that their use of the Trust Gate feature does not result in discrimination based on grounds prohibited by Applicable Law (see Section 6.2). MaskedOn reserves the right to investigate and take appropriate enforcement action, including removal of the Event, against any Host whose Trust Gate criteria appear designed to target protected characteristics.</p>
          </Section>

          <Section title="15. User-Generated Content">
            <p>15.1 <strong className="text-text">Ownership.</strong> You retain full ownership of all User Content you create and post on the Platform. MaskedOn does not claim ownership of your content.</p>
            <p>15.2 <strong className="text-text">Licence to MaskedOn.</strong> By uploading or posting User Content on the Platform, you grant MaskedOn a worldwide, non-exclusive, royalty-free, sublicensable, and transferable licence to use, reproduce, distribute, publicly display, adapt, modify, create derivative works from, and otherwise exploit your User Content for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Operating, maintaining, and improving the Platform and its features;</li>
              <li>Displaying your content to other Users as intended by the Platform's functionality;</li>
              <li>Promoting and marketing MaskedOn, including in digital advertising, social media, app store listings, promotional materials, and press features.</li>
            </ul>
            <p>15.3 <strong className="text-text">Scope.</strong> The licence granted in Section 15.2 applies to content you make publicly available or share with other Users through the Platform's features. Private messages exchanged through the Platform's messaging system are not used for marketing or promotional purposes.</p>
            <p>15.4 <strong className="text-text">Termination of Licence.</strong> Upon deletion of your Account or specific User Content, your licence to MaskedOn terminates with respect to that content, subject to: (a) standard operational requirements such as cached or backup copies, which will be cleared within 30 days of deletion; and (b) content that was shared, reshared, or incorporated into other Users' feeds or MaskedOn's marketing materials prior to deletion, which MaskedOn may retain for the period for which such materials were created.</p>
            <p>15.5 <strong className="text-text">Your Warranties.</strong> You represent and warrant that:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You own or have secured all necessary rights, licences, and permissions in respect of any User Content you upload;</li>
              <li>Your User Content does not infringe any third-event intellectual property, privacy, publicity, moral, or other rights;</li>
              <li>Your User Content does not violate any Applicable Law;</li>
              <li>You have obtained the informed consent of all identifiable individuals appearing in photographs or videos you upload to the Platform.</li>
            </ul>
            <p>15.6 <strong className="text-text">Content Moderation.</strong> MaskedOn reserves the right to remove, restrict, withhold, or moderate any User Content that, in our reasonable judgment, violates these Terms, is unlawful, or is otherwise harmful or objectionable. Takedown of unlawful content will be effected in accordance with the Intermediary Guidelines, 2021.</p>
          </Section>

          <Section title="16. Intellectual Property Rights of MaskedOn">
            <p>16.1 All intellectual property rights in and to the Platform — including the MaskedOn name, logo, trademarks, trade dress, software, source code, algorithms, designs, databases, features, and the overall look and feel of the Platform — are owned by or licensed to MaskedOn.</p>
            <p>16.2 These Terms do not grant you any right, title, or interest in MaskedOn's intellectual property. You may not use MaskedOn's trademarks, logos, or brand identity without our prior written consent.</p>
            <p>16.3 Subject to your ongoing compliance with these Terms, MaskedOn grants you a limited, non-exclusive, non-transferable, revocable licence to access and use the Platform solely for its intended personal and non-commercial purposes.</p>
            <p>16.4 Any feedback, suggestions, ideas, or improvement proposals you voluntarily provide regarding the Platform may be used by MaskedOn freely and without restriction, compensation, attribution, or any obligation to you.</p>
          </Section>

          <Section title="17. Privacy and Data Protection">
            <p>17.1 MaskedOn collects, processes, and stores personal data in accordance with our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which forms an integral part of these Terms and is incorporated by reference.</p>
            <p>17.2 MaskedOn processes personal data in compliance with the Digital Personal Data Protection Act, 2023 ("DPDPA") and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 ("SPDI Rules").</p>
            <p>17.3 <strong className="text-text">Data Retention After Account Deletion.</strong> Upon Account deletion, MaskedOn will retain your personal data for a period of thirty (30) days to allow for Account recovery in the event of accidental deletion or a change of mind. After the expiry of this 30-day period, your personal data will be permanently and irreversibly deleted from our active systems, except where Applicable Law requires retention for a longer period (e.g., financial transaction records under accounting and tax regulations, which may be retained for up to seven years as required by law). In accordance with the DPDP Rules, 2025, if your Account remains inactive for a continuous period of <strong className="text-text">three (3) years</strong>, MaskedOn will initiate erasure of your personal data after providing at least <strong className="text-text">forty-eight (48) hours'</strong> prior notice to your registered email address.</p>
            <p>17.4 By using the Platform, you consent to the processing of your personal data as described in the Privacy Policy. You have the rights of access, correction, erasure, portability, and grievance redressal as set out in the Privacy Policy and as conferred by the DPDPA and SPDI Rules.</p>
          </Section>

          <Section title="18. Third-Event Services and Links">
            <p>18.1 The Platform may contain links to or integrations with third-event websites, services, or applications ("Third-Event Services"). These are provided for your convenience only. MaskedOn does not control, endorse, or assume responsibility for any Third-Event Services or their content, availability, or practices.</p>
            <p>18.2 Your use of Third-Event Services is governed by their respective terms of service and privacy policies. MaskedOn is not liable for the availability, accuracy, security, or content of any Third-Event Services.</p>
            <p>18.3 Razorpay is a Third-Event Service engaged for payment processing. MaskedOn is not responsible for any actions, omissions, failures, or data practices of Razorpay. By initiating a payment on the Platform, you accept Razorpay's terms of service and privacy policy.</p>
          </Section>

          <Section title="19. Subscription Services">
            <p>19.1 MaskedOn may offer optional subscription plans or premium memberships to Hosts or Guests, providing access to additional features, reduced Platform Fees, enhanced visibility, or other benefits ("Subscription").</p>
            <p>19.2 Subscription pricing, billing frequency, and features will be disclosed clearly at the point of purchase. By purchasing a Subscription, you authorise MaskedOn and Razorpay to charge your selected payment method on a recurring basis for the applicable subscription fee.</p>
            <p>19.3 You may cancel your Subscription at any time through your Account settings. Cancellation will take effect at the end of the current billing period. No refunds or credits will be issued for unused portions of a billing period, except as required under Applicable Law.</p>
            <p>19.4 MaskedOn reserves the right to modify, discontinue, or alter Subscription plans and their associated benefits at any time. Material changes will be communicated with at least fourteen (14) days' notice. If you do not agree to the changes, you may cancel your Subscription before the changes take effect.</p>
          </Section>

          <Section title="20. Moderation, Reporting, and Grievance Redressal">
            <p>20.1 <strong className="text-text">Reporting Violations.</strong> If you encounter any content or conduct on the Platform that you believe violates these Terms, our community standards, or any Applicable Law, you may report it through the in-app reporting feature or by writing to us at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a>.</p>
            <p>20.2 <strong className="text-text">Grievance Officer.</strong> In accordance with Rule 3(2) of the Intermediary Guidelines, 2021, MaskedOn designates the following individual as its Grievance Officer:</p>
            <div className="mt-2 mb-3 p-4 rounded-xl bg-bg/40 space-y-1">
              <p><strong className="text-text">Name:</strong> Bhomik Goyal</p>
              <p><strong className="text-text">Designation:</strong> Grievance Officer</p>
              <p><strong className="text-text">Email:</strong> <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a></p>
              <p><strong className="text-text">Address:</strong> Jaipur, Rajasthan, India</p>
            </div>
            <p>The Grievance Officer will acknowledge receipt of a complaint within <strong className="text-text">twenty-four (24) hours</strong> and endeavour to resolve it within <strong className="text-text">fifteen (15) days</strong> of receipt, in accordance with the timelines prescribed by the Intermediary Guidelines.</p>
            <p>20.3 <strong className="text-text">Complaint Tracking.</strong> Each complaint submitted to the Grievance Officer shall be assigned a <strong className="text-text">unique reference number</strong> for tracking purposes. You may use this reference number to follow up on the status of your complaint.</p>
            <p>20.4 <strong className="text-text">Content Takedowns.</strong> MaskedOn will act expeditiously upon receiving a valid complaint or a court/government authority order requiring the removal of unlawful content, in accordance with its obligations as an intermediary under the IT Act and Intermediary Guidelines. MaskedOn is not obligated to adjudicate factual disputes between Users regarding each other's content.</p>
            <p>20.5 <strong className="text-text">Transparency.</strong> MaskedOn may, where required under Applicable Law, publish periodic transparency reports regarding content moderation actions taken on the Platform.</p>
          </Section>

          <Section title="21. Account Suspension and Termination">
            <p>21.1 <strong className="text-text">Termination by User.</strong> You may delete your Account at any time through the Settings section of the Platform. Account deletion is permanent and irreversible. Upon deletion, you will permanently lose access to all your data, Event history, connections, photos, messages, and Social Rating.</p>
            <p>21.2 <strong className="text-text">Suspension or Termination by MaskedOn.</strong> We reserve the right to suspend, restrict access to, or permanently terminate your Account at our sole discretion, with or without prior notice, if we have reasonable grounds to believe that:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You have violated these Terms or MaskedOn's community standards;</li>
              <li>Your Account or content poses a risk to other Users, third events, or MaskedOn;</li>
              <li>We have received a valid legal order or government directive requiring action;</li>
              <li>You have engaged in fraudulent, deceptive, or manipulative activity on the Platform;</li>
              <li>You have provided false, misleading, or incomplete registration information.</li>
            </ul>
            <p>21.3 <strong className="text-text">Effect of Termination.</strong> Upon termination, your licence to use the Platform immediately ceases. Any pending Ticket purchases or Host Event obligations will be handled in accordance with the Refund Policy in Section 12. MaskedOn shall not be liable for any losses incurred by you as a result of Account termination carried out in accordance with these Terms.</p>
            <p>21.4 <strong className="text-text">Reinstatement.</strong> Reinstatement of a suspended or terminated Account is entirely at MaskedOn's sole discretion. Requests for reinstatement may be submitted to <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a> with relevant supporting information.</p>
          </Section>

          <Section title="22. Disclaimers">
            <p>22.1 The Platform and all content, features, and services are provided on an <strong className="text-text">"as is" and "as available"</strong> basis, without warranties of any kind, whether express, implied, or statutory, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.</p>
            <p>22.2 MaskedOn does not warrant that:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The Platform will be uninterrupted, error-free, bug-free, or continuously available;</li>
              <li>Any Event listed on the Platform will take place as described or at all;</li>
              <li>Any Host or Guest is who they represent themselves to be;</li>
              <li>The Social Rating of any User accurately reflects their conduct, character, or reliability;</li>
              <li>The Platform will meet your specific requirements or expectations.</li>
            </ul>
            <p>22.3 MaskedOn is not responsible for the actions, conduct, or omissions of any User, whether on or off the Platform, including at Events listed on the Platform. Attending any Event is entirely at your own risk.</p>
            <p>22.4 MaskedOn makes no representation regarding the legality, safety, or suitability of any Event listed on the Platform. Users are advised to independently verify the legality and safety of any Event before making payment or attending.</p>
          </Section>

          <Section title="23. Limitation of Liability">
            <p>23.1 To the fullest extent permitted by Applicable Law, MaskedOn, its proprietors, employees, agents, contractors, and affiliates shall not be liable for any:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Indirect, incidental, consequential, special, exemplary, or punitive damages of any kind;</li>
              <li>Loss of profits, revenue, data, goodwill, business opportunity, or anticipated savings;</li>
              <li>Physical injury, bodily harm, or property damage arising from attendance at Events facilitated through the Platform;</li>
              <li>Loss or damage arising from your reliance on any User Content, Event listing, or Social Rating;</li>
              <li>Damages arising from unauthorised access to your Account due to your failure to maintain the security of your credentials;</li>
              <li>Losses caused by circumstances beyond our reasonable control, including natural disasters, government orders, internet outages, Razorpay failures, or other Force Majeure events.</li>
            </ul>
            <p>23.2 <strong className="text-text">Aggregate Cap on Liability.</strong> MaskedOn's total aggregate liability to you for any and all claims arising out of or in connection with these Terms or the Platform shall not exceed the total Platform Fees actually paid by you to MaskedOn in the six (6) calendar months immediately preceding the event giving rise to the claim. If you have paid no Platform Fees in that period, MaskedOn's maximum liability is limited to ₹1,000 (One Thousand Indian Rupees).</p>
            <p>23.3 Nothing in these Terms shall exclude or limit MaskedOn's liability for fraud, wilful misconduct, death or personal injury caused by its gross negligence, or any liability that cannot be lawfully excluded or limited under the Consumer Protection Act, 2019 or any other mandatory provision of Applicable Law.</p>
          </Section>

          <Section title="24. Indemnification">
            <p>24.1 You agree to indemnify, defend, and hold harmless MaskedOn and its proprietors, officers, employees, agents, and successors from and against any and all claims, liabilities, damages, losses, penalties, costs, and expenses (including reasonable legal fees and court costs) arising out of or relating to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Your breach of any provision of these Terms or any representation or warranty made herein;</li>
              <li>Your User Content or the content of any Event you list as a Host;</li>
              <li>Your violation of any Applicable Law or the rights of any third event;</li>
              <li>Any Event you organise as a Host, including claims brought by Guests, third events, or regulatory authorities arising from the Event or its cancellation;</li>
              <li>Any fraud, misrepresentation, or wilful misconduct you commit on or through the Platform.</li>
            </ul>
            <p>24.2 MaskedOn reserves the right, at your expense, to assume exclusive control over the defence and settlement of any matter for which you are required to indemnify us. You agree to cooperate fully with MaskedOn's defence of any such claim and not to settle any such matter without MaskedOn's prior written consent.</p>
          </Section>

          <Section title="25. Governing Law">
            <p>25.1 These Terms, and any dispute or claim arising out of or in connection with them or their subject matter or formation (including non-contractual disputes or claims), shall be governed by and construed exclusively in accordance with the laws of the Republic of India, without regard to its conflict of laws principles.</p>
            <p>25.2 Subject to the mandatory arbitration clause in Section 26, the courts of competent jurisdiction at Jaipur, Rajasthan, India shall have exclusive jurisdiction over any dispute that proceeds to litigation under these Terms.</p>
          </Section>

          <Section title="26. Dispute Resolution and Arbitration">
            <p>26.1 <strong className="text-text">Good Faith Resolution.</strong> In the event of any dispute, claim, or controversy arising out of or relating to these Terms, the Privacy Policy, or your use of the Platform, the events shall first attempt to resolve the matter amicably. You must send written notice of the dispute to MaskedOn at <a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a>. MaskedOn will use reasonable efforts to respond and engage in good faith resolution discussions within fourteen (14) days of receiving such notice.</p>
            <p>26.2 <strong className="text-text">Mandatory Arbitration.</strong> If the dispute is not resolved through good faith negotiations within thirty (30) days of the written notice, it shall be referred to and finally resolved by binding arbitration in accordance with the Arbitration and Conciliation Act, 1996 (as amended from time to time). The seat and venue of arbitration shall be Jaipur, Rajasthan, India. The proceedings shall be conducted in the English language before a sole arbitrator mutually appointed by the events. If the events cannot agree on an arbitrator within fifteen (15) days of a event's request for arbitration, the arbitrator shall be appointed in accordance with the provisions of the Arbitration and Conciliation Act, 1996. The arbitration award shall be final and binding on both events.</p>
            <p>26.3 <strong className="text-text">Consumer Rights Carve-Out.</strong> Nothing in this Section 26 shall be construed to prevent you from approaching the appropriate Consumer Disputes Redressal Commission (District, State, or National) in accordance with the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020. Statutory consumer rights are not affected or waived by the arbitration clause.</p>
            <p>26.4 <strong className="text-text">Class Action Waiver.</strong> To the fullest extent permitted under Applicable Law, you agree that all claims must be brought in your individual capacity and not as a plaintiff, class representative, or class member in any purported class action, collective action, or representative proceeding.</p>
          </Section>

          <Section title="27. Force Majeure">
            <p>MaskedOn shall not be liable for any failure or delay in performing its obligations under these Terms to the extent such failure or delay is caused directly by circumstances beyond its reasonable control, including but not limited to acts of God, natural disasters (floods, earthquakes, cyclones), pandemic or epidemic, war, civil unrest or riots, terrorism, fire, governmental shutdowns, orders of regulatory or judicial authorities, power or electricity grid failures, internet backbone outages, or the failure of third-event service providers including Razorpay. MaskedOn will use commercially reasonable endeavours to resume performance as soon as practicable after the Force Majeure event ceases to have effect.</p>
          </Section>

          <Section title="28. Severability">
            <p>If any provision of these Terms is held by a court or arbitrator of competent jurisdiction to be unlawful, void, or unenforceable for any reason, that provision shall be deemed severed from the remainder of these Terms, which shall continue in full force and effect to the maximum extent permitted by law. The severed provision shall, to the greatest extent possible, be replaced by a valid and enforceable provision that achieves the same commercial and legal intent as the original provision.</p>
          </Section>

          <Section title="29. Waiver">
            <p>No failure or delay by MaskedOn in exercising any right, power, remedy, or privilege under these Terms shall operate as a waiver thereof. No single or partial exercise of any right or remedy shall preclude any other or further exercise of that right or remedy. A waiver granted with respect to any particular breach shall not be construed as a waiver of any subsequent breach of the same or any other provision of these Terms.</p>
          </Section>

          <Section title="30. Entire Agreement">
            <p>These Terms, together with the Privacy Policy and any other policies, notices, or guidelines published by MaskedOn on the Platform from time to time, constitute the entire and exclusive agreement between you and MaskedOn with respect to the Platform and its use. These Terms supersede all prior and contemporaneous negotiations, representations, warranties, understandings, and agreements between the events relating to the same subject matter, whether oral or written.</p>
          </Section>

          <Section title="31. Assignment">
            <p>MaskedOn may assign, transfer, or novate its rights and obligations under these Terms to any successor entity, acquirer of the Platform, or affiliate, with or without notice to you. You may not assign, delegate, or transfer your rights or obligations under these Terms to any third event without MaskedOn's prior written consent. Any purported assignment in violation of this clause shall be null and void and of no legal effect.</p>
          </Section>

          <Section title="32. Changes to These Terms">
            <p>32.1 MaskedOn reserves the right to revise, update, or replace these Terms at any time. We will provide notice of material changes via in-app notification, registered email, or a prominent notice on the Platform at least seven (7) days before the revised Terms take effect.</p>
            <p>32.2 The "Last Updated" date displayed at the top of this page reflects the date of the most recent revision. It is your ongoing responsibility to review these Terms periodically to remain informed of any changes.</p>
            <p>32.3 Your continued use of the Platform following the effective date of any revised Terms constitutes your binding acceptance of those changes. If you do not accept the revised Terms, you must cease using the Platform and delete your Account before the changes take effect.</p>
          </Section>

          <Section title="33. Contact and Legal Notices">
            <p>For any questions, concerns, legal notices, regulatory correspondence, or grievances regarding these Terms or the Platform, please contact us:</p>
            <div className="mt-3 p-4 rounded-xl bg-bg/40 space-y-1.5">
              <p><strong className="text-text">Platform Name:</strong> MaskedOn</p>
              <p><strong className="text-text">Principal Place of Operations:</strong> Jaipur, Rajasthan, India</p>
              <p><strong className="text-text">Email:</strong>{" "}<a href="mailto:team@maskedon.com" className="text-primary hover:underline">team@maskedon.com</a></p>
              <p className="text-xs text-text-muted/70 pt-2">We endeavour to respond to all legal inquiries within seven (7) business days. For urgent legal matters, please use the subject line <strong>"LEGAL NOTICE"</strong>. For data protection requests, please use the subject line <strong>"DATA REQUEST"</strong>.</p>
            </div>
          </Section>

        </motion.div>
      </div>
    </div>
  );
}
