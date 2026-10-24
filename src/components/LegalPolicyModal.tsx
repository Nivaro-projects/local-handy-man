import React, { useEffect } from 'react';

export type LegalPolicyTab = 'privacy' | 'terms' | 'cookies' | 'refund';

interface LegalPolicyModalProps {
  isOpen: boolean;
  activeTab: LegalPolicyTab;
  onTabChange: (tab: LegalPolicyTab) => void;
  onClose: () => void;
}

export const LegalPolicyModal: React.FC<LegalPolicyModalProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-policy-modal-title"
    >
      <div 
        className="relative w-full max-w-4xl bg-[#FAF3E7] rounded-xl border-2 border-[#E0CEAF] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          style={{ backgroundColor: '#2E2E2E' }} 
          className="px-6 py-5 flex items-center justify-between border-b border-[#E27D60]/40 text-white"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FAF3E7] border border-[#E27D60] flex items-center justify-center text-[#2E2E2E] font-bold text-xs shrink-0">
              LP
            </div>
            <div className="text-left">
              <h2 id="legal-policy-modal-title" className="text-xl font-extrabold tracking-tight text-white">
                Legal Policies &amp; Compliance
              </h2>
              <p className="text-xs text-[#FAF3E7] font-medium">
                Nivaro &bull; Chirala, Andhra Pradesh (Est. 2026)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#FAF3E7] hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E27D60] cursor-pointer"
            aria-label="Close legal policy modal"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#FAF3E7] border-b border-[#E0CEAF] px-6 pt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTabChange('privacy')}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-bold border-t-2 border-x-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#FAF3E7] border-[#E27D60] text-[#2E2E2E] -mb-[1px]'
                : 'border-transparent text-[#4A4A4A] hover:text-[#2E2E2E] hover:bg-[#FAF3E7]'
            }`}
          >
            Privacy Policy
          </button>

          <button
            type="button"
            onClick={() => onTabChange('terms')}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-bold border-t-2 border-x-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#FAF3E7] border-[#E27D60] text-[#2E2E2E] -mb-[1px]'
                : 'border-transparent text-[#4A4A4A] hover:text-[#2E2E2E] hover:bg-[#FAF3E7]'
            }`}
          >
            Terms of Service
          </button>

          <button
            type="button"
            onClick={() => onTabChange('cookies')}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-bold border-t-2 border-x-2 transition-all cursor-pointer ${
              activeTab === 'cookies'
                ? 'bg-[#FAF3E7] border-[#E27D60] text-[#2E2E2E] -mb-[1px]'
                : 'border-transparent text-[#4A4A4A] hover:text-[#2E2E2E] hover:bg-[#FAF3E7]'
            }`}
          >
            Cookie Policy
          </button>

          <button
            type="button"
            onClick={() => onTabChange('refund')}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-bold border-t-2 border-x-2 transition-all cursor-pointer ${
              activeTab === 'refund'
                ? 'bg-[#FAF3E7] border-[#E27D60] text-[#2E2E2E] -mb-[1px]'
                : 'border-transparent text-[#4A4A4A] hover:text-[#2E2E2E] hover:bg-[#FAF3E7]'
            }`}
          >
            Refund &amp; Cancellation
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto text-left text-[#2E2E2E] text-sm leading-relaxed space-y-6">
          
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-[#E0CEAF] pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E27D60]">Data Minimization &amp; Protection</span>
                <h3 className="text-2xl font-extrabold text-[#2E2E2E] mt-1">Privacy Policy</h3>
                <p className="text-xs text-[#4A4A4A] mt-1">Last Updated: 23 October 2026 &bull; Chirala, Andhra Pradesh</p>
              </div>

              <div className="p-4 rounded-lg bg-[#FAF3E7] border border-[#E27D60] text-xs text-[#2E2E2E]">
                <p>
                  <strong>Summary of our commitment:</strong> Nivaro operates exclusively in Chirala, Andhra Pradesh. We collect only the contact, address and job details needed to dispatch an electrician or plumber to your doorstep, and we store them in our own Supabase PostgreSQL database. We <strong>never sell, lease, or share your data</strong> with advertisers or data brokers.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">1. What Information We Collect</h4>
                <p><strong>Customers.</strong> The details you enter when you book or contact support:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#4A4A4A]">
                  <li><strong>Full name and mobile number</strong> — customer identification, sign-in OTP, and arrival coordination.</li>
                  <li><strong>Email address (optional)</strong> — only if you provide it for account or support contact.</li>
                  <li><strong>Neighbourhood and service address</strong> — confined to Chirala localities, used to dispatch the technician.</li>
                  <li><strong>Service category, problem description, preferred date and time slot</strong> — to allocate the right trade and tools.</li>
                  <li><strong>Service rating and feedback</strong> — optional 1-to-5 star rating on completed jobs.</li>
                  <li><strong>Support tickets</strong> — the issue type, description and any replies you send us.</li>
                </ul>
                <p className="pt-2"><strong>Technicians.</strong> Registration details needed to verify and dispatch you:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#4A4A4A]">
                  <li><strong>Name, mobile number, optional email and neighbourhood</strong> — identity checks and job allocation.</li>
                  <li><strong>Trade (electrical or plumbing), availability and approval status</strong> — matching you to suitable jobs.</li>
                  <li><strong>Job and commission records</strong> — bookings you accepted, completion status and amounts owed to you.</li>
                </ul>
                <p className="pt-2"><strong>Technical data.</strong> Our hosting and serverless layers record IP address, request path, timestamp and error diagnostics for security and reliability. We do not build advertising profiles.</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">2. Why We Collect This Data</h4>
                <p>
                  Your information is used to verify your account with a one-time password, dispatch a technician, share job status, answer support requests, settle payments and commissions, prevent fraud, and meet our legal and tax obligations. We do not use your phone number, email or name for telemarketing, marketing blasts, or cross-platform tracking.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">3. Where Your Data Is Stored</h4>
                <p>
                  Customer bookings, technician profiles and PII, support tickets and payment records are stored in our <strong>Supabase PostgreSQL database</strong>, protected by Row Level Security and encrypted in transit with TLS. Supabase Auth stores the account identity and password/OTP credentials. Serverless functions hosted on Vercel process privileged writes; the browser never receives a database service key. Small session markers are kept in your browser, as described in the Cookie Policy.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">4. Data Processors We Use</h4>
                <p>These providers process data on our instructions only:</p>
                <div className="overflow-x-auto border border-[#E0CEAF] rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF3E7] text-[#2E2E2E] font-bold border-b border-[#E0CEAF]">
                      <tr>
                        <th className="p-3">Provider</th>
                        <th className="p-3">Purpose</th>
                        <th className="p-3">Data Involved</th>
                        <th className="p-3">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0CEAF]">
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Vercel</td>
                        <td className="p-3 text-[#4A4A4A]">Website hosting, CDN, and the serverless API (`/api`) that validates sessions and writes to the database.</td>
                        <td className="p-3 text-[#4A4A4A]">Request metadata, IP address, and authenticated API payloads in transit.</td>
                        <td className="p-3 text-[#4A4A4A]">Global edge network</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Supabase</td>
                        <td className="p-3 text-[#4A4A4A]">PostgreSQL database and authentication (phone/email OTP, password sessions).</td>
                        <td className="p-3 text-[#4A4A4A]">All account, booking, technician, support and audit records; hashed credentials.</td>
                        <td className="p-3 text-[#4A4A4A]">AWS Asia Pacific (Mumbai), ap-south-1</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Twilio</td>
                        <td className="p-3 text-[#4A4A4A]">SMS delivery of sign-in and verification OTPs through Supabase Auth.</td>
                        <td className="p-3 text-[#4A4A4A]">Mobile number and the one-time code.</td>
                        <td className="p-3 text-[#4A4A4A]">Global carrier routing</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Resend</td>
                        <td className="p-3 text-[#4A4A4A]">Transactional email (verification, password recovery, support notices), where email is enabled.</td>
                        <td className="p-3 text-[#4A4A4A]">Email address and the contents of the transactional message.</td>
                        <td className="p-3 text-[#4A4A4A]">United States</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Razorpay / Stripe</td>
                        <td className="p-3 text-[#4A4A4A]">Online payment processing, only if and when online payment is enabled. Today, labour and parts are settled directly with the attending technician.</td>
                        <td className="p-3 text-[#4A4A4A]">Payment identifier, amount and status. Card, UPI or bank credentials are entered on the processor's page and are never stored by Nivaro.</td>
                        <td className="p-3 text-[#4A4A4A]">India (Razorpay) / global (Stripe)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">5. Who Can See Your Data</h4>
                <p>
                  Access is limited by Row Level Security and server-side role checks. When a booking is assigned, only the allocated technician sees the name, phone number and address needed for that job. Our administrators can see records required to operate and support the service. We may disclose data where required by Indian law, a court order, or a lawful request from a competent authority. We do not sell or rent personal data.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">6. Retention &amp; Deletion</h4>
                <div className="overflow-x-auto border border-[#E0CEAF] rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF3E7] text-[#2E2E2E] font-bold border-b border-[#E0CEAF]">
                      <tr>
                        <th className="p-3">Record</th>
                        <th className="p-3">Retention</th>
                        <th className="p-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0CEAF]">
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Customer and technician profiles, bookings, support tickets</td>
                        <td className="p-3 text-[#4A4A4A]">24 months after the last booking or ticket activity</td>
                        <td className="p-3 text-[#4A4A4A]">Service history, warranty and dispute handling</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-[#2E2E2E]">booking_events</td>
                        <td className="p-3 text-[#4A4A4A]">24 months after the booking reaches Completed or Cancelled</td>
                        <td className="p-3 text-[#4A4A4A]">Append-only status audit trail. Entries cannot be edited or deleted individually; they are purged in scheduled maintenance.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-[#2E2E2E]">audit_log</td>
                        <td className="p-3 text-[#4A4A4A]">12 months</td>
                        <td className="p-3 text-[#4A4A4A]">Security incidents and administrator accountability</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Payment and tax records</td>
                        <td className="p-3 text-[#4A4A4A]">8 years</td>
                        <td className="p-3 text-[#4A4A4A]">Statutory book-keeping and tax requirements in India</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-[#2E2E2E]">Supabase Auth identity</td>
                        <td className="p-3 text-[#4A4A4A]">Until account deletion; removed within 30 days of a verified request</td>
                        <td className="p-3 text-[#4A4A4A]">Sign-in and account security</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  <strong>How to request deletion.</strong> Sign in to the Customer Portal, open a support ticket, choose the issue type <strong>Other</strong>, and write <em>“Data deletion request”</em> with the mobile number on your account. You may also email <a href="mailto:contact@nivaro.in" className="text-[#2E2E2E] font-bold hover:underline">contact@nivaro.in</a> from your registered address. We verify ownership using the registered mobile number and complete the request within 30 days, except for records we must keep for tax, fraud prevention, or an active dispute. Deleting your account also removes your browser session markers on your next sign-out.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">7. Your Rights &amp; Grievances</h4>
                <p>
                  You may ask for a copy of your data, correct inaccurate details, withdraw consent, or request erasure, as permitted by the Digital Personal Data Protection Act, 2023 and applicable Indian law. We respond to verified requests within 30 days.
                </p>
                <div className="p-4 rounded-lg bg-[#FAF3E7] border border-dashed border-[#E27D60] text-xs text-[#2E2E2E]">
                  <p className="font-bold mb-1">Grievance Officer (placeholder — confirm before launch)</p>
                  <p>Name: <strong>[Grievance Officer name]</strong></p>
                  <p>Email: <a href="mailto:grievance@nivaro.in" className="font-bold hover:underline">grievance@nivaro.in</a> &bull; Phone: <a href="tel:+919491242781" className="font-bold hover:underline">+91 94912 42781</a></p>
                  <p>Address: Nivaro / CLR Services, Chirala, Bapatla District, Andhra Pradesh, India</p>
                  <p className="mt-2">
                    We acknowledge grievances within 24 hours and aim to resolve them within 15 days. If you are not satisfied, you may escalate to the Data Protection Board of India once it is operational, or to the appropriate consumer forum.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">8. Security &amp; Changes</h4>
                <p>
                  We use TLS in transit, Row Level Security on database tables, server-side session and role verification for privileged actions, and least-privilege access for staff and technicians. No system is perfectly secure, but we investigate suspected incidents and notify affected users and authorities where the law requires it. If this policy changes materially, we will update the date above and, where appropriate, notify you in the portal.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-[#E0CEAF] pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E27D60]">Service Agreement</span>
                <h3 className="text-2xl font-extrabold text-[#2E2E2E] mt-1">Terms of Service</h3>
                <p className="text-xs text-[#4A4A4A] mt-1">Last Updated: January 2026 &bull; Applicable in Chirala, AP</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">1. About Nivaro</h4>
                <p>
                  Nivaro is an independent community coordination initiative established in 2026 to connect households across Chirala, Andhra Pradesh, with trusted, skilled local electricians and plumbers. By accessing our platform or submitting a service request, you agree to these Terms.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">2. Service Scope &amp; Localities</h4>
                <p>
                  Our services are focused on the recognized neighborhoods of Chirala: <strong>Paparajuthota, Perala, Kothapeta, Srinivas Colony, Vadarevu, and adjacent town limits</strong>. Requests submitted outside these wards are subject to availability or local coordinator review.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">3. Role of Independent Technicians</h4>
                <p>
                  Nivaro serves as a coordination and scheduling bridge. The electricians and plumbers who attend your premises are independent trade professionals. Service scope, material costs, and final bills are transparently inspected and agreed upon directly between the customer and the attending technician before work begins.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">4. Customer Responsibilities</h4>
                <p>
                  Customers must ensure an adult is present during inspection and repair, provide safe and unobstructed access to the work area (main electrical switchboards, plumbing lines, etc.), and provide accurate descriptions of observed faults.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">5. Governing Law &amp; Jurisdiction</h4>
                <p>
                  These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with this service shall be resolved through amicable community mediation or subject to the exclusive jurisdiction of the courts in Chirala / Bapatla District, Andhra Pradesh.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: COOKIE POLICY */}
          {activeTab === 'cookies' && (
            <div className="space-y-6">
              <div className="border-b border-[#E0CEAF] pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E27D60]">Essential Storage Only</span>
                <h3 className="text-2xl font-extrabold text-[#2E2E2E] mt-1">Cookie &amp; Local Storage Policy</h3>
                <p className="text-xs text-[#4A4A4A] mt-1">Strictly necessary storage &bull; Last Updated: 23 October 2026</p>
              </div>

              <div className="p-4 rounded-lg bg-[#FAF3E7] border border-[#E27D60] text-xs text-[#2E2E2E]">
                <p className="font-bold mb-1 text-[#2E2E2E]">No advertising, analytics or tracking cookies:</p>
                <p>
                  Nivaro loads <strong>no third-party analytics, advertising pixels or cross-site trackers</strong> — neither before nor after you press Accept. The only cookies and browser storage we use are strictly necessary to sign you in, keep your session working, and remember this consent choice. Because nothing non-essential is loaded, there is nothing to switch off.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">Storage Elements Utilised</h4>
                <div className="overflow-x-auto border border-[#E0CEAF] rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF3E7] text-[#2E2E2E] font-bold border-b border-[#E0CEAF]">
                      <tr>
                        <th className="p-3">Key / Element</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0CEAF]">
                      <tr>
                        <td className="p-3 font-mono font-bold text-[#2E2E2E]">sb-&lt;project-ref&gt;-auth-token</td>
                        <td className="p-3 text-[#4A4A4A]">localStorage (Supabase Auth)</td>
                        <td className="p-3">Holds your Supabase Auth session and refresh token so you stay signed in and the serverless API can verify your identity. Set only after you authenticate.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-[#2E2E2E]">lh_cookie_consent</td>
                        <td className="p-3 text-[#4A4A4A]">localStorage</td>
                        <td className="p-3">Records that you have seen and accepted this notice so the banner is not shown on every visit.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-[#2E2E2E]">lh_password_recovery_active</td>
                        <td className="p-3 text-[#4A4A4A]">sessionStorage</td>
                        <td className="p-3">Marks that a password-recovery flow is in progress. Cleared when you close the tab.</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono font-bold text-[#2E2E2E]">lh_bookings_data, lh_customers_data, lh_current_customer_id, lh_technicians_data, lh_current_technician_id, lh_payments_data, lh_commissions_data</td>
                        <td className="p-3 text-[#4A4A4A]">localStorage / sessionStorage</td>
                        <td className="p-3">Local working copies of the portal data you are viewing, kept so page changes do not lose your place. They are being retired as portal reads and writes move behind the serverless API; the Supabase database is the system of record.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">What “Accept” Means</h4>
                <p>
                  Pressing <strong>Accept</strong> records your consent to the strictly necessary storage above. It does not enable any additional tracking, because none exists. If a non-essential tool is ever added, it will be listed in this policy and will stay blocked until you opt in.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">Managing or Clearing This Storage</h4>
                <p>
                  Because these elements are strictly necessary, disabling them will sign you out and stop bookings, status tracking and support tickets from working. You can clear them at any time via your browser Settings &rarr; Clear Browsing Data &rarr; Cookies and Site Data, or by signing out of the portal.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: REFUND & CANCELLATION */}
          {activeTab === 'refund' && (
            <div className="space-y-6">
              <div className="border-b border-[#E0CEAF] pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#E27D60]">Fair &amp; Transparent</span>
                <h3 className="text-2xl font-extrabold text-[#2E2E2E] mt-1">Refund &amp; Cancellation Policy</h3>
                <p className="text-xs text-[#4A4A4A] mt-1">Direct Settlement &bull; Chirala, Andhra Pradesh</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">1. Zero Cancellation Fee Before Dispatch</h4>
                <p>
                  You may cancel any service booking at <strong>zero fee</strong> at any time prior to the technician arriving at your address. If your emergency has resolved or your plans change, simply call us or submit a cancellation notice through the Customer Portal.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">2. Transparent On-Site Inspection</h4>
                <p>
                  We do not collect advance digital payments or hidden convenience fees online. When the local technician arrives at your premises, they will inspect the electrical or plumbing issue and provide a transparent cost estimate before starting the repair.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">3. Direct Settlement Upon Satisfaction</h4>
                <p>
                  Payment for labor and replaced spare parts is settled directly with the attending craftsman only after the repair is completed and tested in your presence.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-[#2E2E2E]">4. Dispute Resolution &amp; Re-Inspection</h4>
                <p>
                  If you experience an issue with a completed repair or have a quality concern within 48 hours, submit a support ticket via the Customer Account Dashboard or reach our coordinator at <strong>+91 94912 42781</strong>. We will arrange a prompt re-inspection to ensure fair and honest resolution.
                </p>
              </div>
            </div>
          )}

          {/* Contact Footer Inside Modal */}
          <div className="p-4 rounded-lg bg-[#FAF3E7] border border-[#E0CEAF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#2E2E2E] mt-6">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#2E2E2E]">Nivaro &bull; Chirala, AP</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a href="tel:+919491242781" className="font-bold text-[#2E2E2E] hover:underline">
                Tel: +91 94912 42781
              </a>
              <a href="mailto:contact@nivaro.in" className="font-bold text-[#2E2E2E] hover:underline">
                contact@nivaro.in
              </a>
            </div>
          </div>

        </div>

        {/* Modal Action Bar */}
        <div className="px-6 py-4 bg-[#FAF3E7] border-t border-[#E0CEAF] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-[#2E2E2E] text-white font-bold text-sm hover:bg-[#473228] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E27D60] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
