import React from 'react';
import { ShieldCheck } from 'lucide-react';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. What We Collect',
    body: [
      'Account information: when you sign in with Google, we receive your name, email address, and profile picture from Google. We do not receive or store your Google password.',
      'Content you provide: audio files you upload, YouTube links you submit, voice recordings for custom training, and payment details you submit (Transaction IDs and screenshots for EasyPaisa/JazzCash).',
      'Usage data: songs you generate, voices you use, wallet transactions, and basic technical data (device type, browser) needed to operate and secure the Service.',
    ],
  },
  {
    title: '2. How We Use Your Data',
    body: [
      'To provide the Service: processing your uploads, generating covers, training your custom voice, and managing your wallet.',
      'To operate safely: preventing fraud and abuse, enforcing our Terms of Service, and reviewing manual payments.',
      'To improve: aggregated, anonymized usage statistics help us improve quality and reliability.',
      'We do not sell your personal data. We do not use your voice recordings to train models for other users.',
    ],
  },
  {
    title: '3. Your Audio & Voice Recordings',
    body: [
      'Uploaded songs and voice recordings are stored securely and used only to fulfill your requests. Custom voice models built from your recordings belong to your account and are not shared with other users.',
      'You may request deletion of your recordings and voice models at any time through support; we will remove them within 30 days, subject to backup retention.',
    ],
  },
  {
    title: '4. Payments',
    body: [
      'For manual EasyPaisa/JazzCash payments, the Transaction IDs and screenshots you submit are reviewed by our team solely to verify and approve your payment. They are retained as transaction records.',
      'We never see or store your full bank account details or card numbers beyond what you explicitly submit for verification.',
    ],
  },
  {
    title: '5. Data Storage & Security',
    body: [
      'Data is stored with our cloud providers (including Supabase) with encryption in transit and at rest. Access to production data is restricted to authorized personnel.',
      'No system is perfectly secure; in the event of a data breach affecting your personal data, we will notify you as required by applicable law.',
    ],
  },
  {
    title: '6. Third-Party Services',
    body: [
      'We rely on third parties to operate: Google (sign-in), Supabase (database, auth, storage), Vercel/Railway (hosting), and GPU compute providers (AI processing). Their own privacy policies apply to data they process on our behalf.',
    ],
  },
  {
    title: '7. Cookies & Analytics',
    body: [
      'We use essential cookies/local storage to keep you signed in and remember your preferences. If privacy-friendly analytics is enabled, it collects only aggregated, non-identifying page-visit statistics — no cross-site tracking, no advertising profiles.',
    ],
  },
  {
    title: '8. Your Rights',
    body: [
      'You may request access to, correction of, or deletion of your personal data at any time through support. Deleting your account removes your profile, wallet history, uploads, and voice models (subject to legal record-keeping for financial transactions).',
    ],
  },
  {
    title: '9. Children',
    body: [
      'Awaazify is not directed at children under 13, and we do not knowingly collect their data. If you believe a child has provided us data, contact us and we will delete it.',
    ],
  },
  {
    title: '10. Changes to This Policy',
    body: [
      'We may update this policy from time to time. Material changes will be announced in the app. Continued use after changes take effect constitutes acceptance.',
    ],
  },
  {
    title: '11. Contact',
    body: [
      'For privacy questions or data requests, contact us through the support options in the app or at the official Awaazify channels.',
    ],
  },
];

export const Privacy: React.FC = () => {
  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] py-10 lg:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-6 border-b border-slate-200/80">
          <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#059669] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Legal
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] mt-1">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5">
            Last updated: October 2026. How Awaazify collects, uses, and protects your data.
          </p>
        </div>
        <div className="mt-8 space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                {section.title}
              </h2>
              <div className="mt-2 space-y-2.5">
                {section.body.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
