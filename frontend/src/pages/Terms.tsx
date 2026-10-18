import React from 'react';
import { FileText } from 'lucide-react';

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. What Awaazify Does',
    body: [
      'Awaazify ("the Service") is an AI voice studio. It lets you create AI song covers in celebrity-style voices from a YouTube link or an uploaded audio file, and train a custom AI voice model from your own 3-minute voice recording.',
      'All voice conversion is performed by automated AI systems. Output quality depends on the source audio, and results are artistic interpretations — not perfect replicas of any real person\'s voice.',
    ],
  },
  {
    title: '2. Accounts & Sign-In',
    body: [
      'Awaazify uses Google-only sign-in. There are no passwords to manage and no email/password accounts. You are responsible for keeping your Google account secure.',
      'You must be at least 13 years old (or the minimum age required in your country) to use the Service.',
    ],
  },
  {
    title: '3. Pricing & Payments',
    body: [
      'Pricing is pay-as-you-go: Rs. 50 per full song cover and Rs. 150 per custom voice training (Pakistan pricing; international pricing is shown in USD where applicable). New accounts receive a one-time Rs. 50 signup bonus.',
      'Payments are accepted via EasyPaisa and JazzCash as manual transfers: you send the amount, then submit your Transaction ID (TID) plus a payment screenshot in the app. An admin reviews and approves each payment — credits are added only after approval, usually within a few hours.',
      'Card payments, where offered, are processed immediately and credits are added instantly.',
    ],
  },
  {
    title: '4. Refund Policy',
    body: [
      'Because EasyPaisa/JazzCash payments are manual, please double-check the amount and recipient details before sending. If your transfer was approved but credits were not added, contact support with your TID and we will fix it or refund you.',
      'Credits already spent on generated songs or completed voice trainings are non-refundable. Unused, unexpired credits may be refunded within 7 days of purchase on request.',
      'If a generation fails due to a technical error on our side, the charge is reversed automatically or re-credited to your wallet.',
    ],
  },
  {
    title: '5. Your Content & Uploads',
    body: [
      'You keep all rights to the audio you upload. By uploading, you grant Awaazify a limited license to process, transform, and store it solely to provide the Service.',
      'Do not upload content you do not have the right to use. You are responsible for the copyright status of YouTube links and audio files you submit.',
      'Voice recordings you provide for custom training are used only to build your personal voice model. We do not sell your recordings or use them to train models for other users.',
    ],
  },
  {
    title: '6. Acceptable Use & AI Voice Disclaimers',
    body: [
      'AI-generated covers must be labeled as AI-generated when shared publicly. Do not present an AI cover as a genuine recording of a real artist.',
      'You may not use the Service to impersonate a real person in a misleading way, to create non-consensual intimate content, for political disinformation, fraud, or harassment. Accounts violating this policy will be suspended without refund.',
      'Celebrity-style voices are AI interpretations for creative and entertainment purposes. They are not affiliated with, endorsed by, or representative of the real individuals.',
    ],
  },
  {
    title: '7. Service Availability',
    body: [
      'We aim for high availability but do not guarantee uninterrupted service. Generation times vary with GPU load. We may modify, suspend, or discontinue features with reasonable notice.',
    ],
  },
  {
    title: '8. Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, Awaazify is provided "as is" without warranties of any kind. Our total liability for any claim is limited to the amount you paid in the 3 months before the claim.',
    ],
  },
  {
    title: '9. Changes to These Terms',
    body: [
      'We may update these terms from time to time. Continued use of the Service after changes take effect constitutes acceptance of the new terms.',
    ],
  },
  {
    title: '10. Contact',
    body: [
      'For questions about these terms, payments, or refunds, contact us through the support options in the app or at the official Awaazify channels.',
    ],
  },
];

export const Terms: React.FC = () => {
  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] py-10 lg:py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-6 border-b border-slate-200/80">
          <span className="inline-flex items-center gap-2 text-xs font-extrabold text-[#059669] uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            Legal
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] mt-1">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5">
            Last updated: October 2026. Please read these terms carefully before using Awaazify.
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
