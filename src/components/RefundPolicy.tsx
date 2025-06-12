import React from 'react';

export default function RefundPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
      <p className="text-sm text-gray-400 mb-8">Effective Date: May 30, 2025</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">1. General Refund Eligibility</h2>
      <p className="mb-4">
        We offer refunds under specific circumstances, typically when a user encounters a technical issue or billing error.
        To be eligible for a refund, you must contact our support team within <strong>7 days</strong> of the purchase or transaction.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">2. Discretionary Refunds and Account Credits</h2>
      <p className="mb-4">
        Refunds are issued <strong>at our sole discretion</strong>. In some cases, instead of a monetary refund, 
        <strong> we may offer an account credit</strong> to be used toward future purchases. Account credits are non-transferable and non-refundable.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">3. Non-Refundable Situations</h2>
      <ul className="list-disc list-inside mb-4 space-y-1">
        <li>Downloaded or accessed content.</li>
        <li>Completed licensing transactions where the license agreement has been executed.</li>
        <li>Custom sync requests once a producer has begun work.</li>
      </ul>

      <h2 className="text-xl font-semibold mt-6 mb-2">4. Dispute Resolution</h2>
      <p className="mb-4">
        If you believe you are entitled to a refund and your request has been denied, you may escalate the issue through our 
        <a href="/dispute-resolution" className="text-purple-400 underline ml-1">Dispute Handling and Resolution Policy</a>. 
        We will work with you in good faith to resolve the matter.
      </p>

      <h2 className="text-xl font-semibold mt-6 mb-2">5. Jurisdiction and Compliance</h2>
      <p>
        This policy is governed by the laws of the United States. For international users, we will comply with local consumer protection laws where applicable.
      </p>
    </div>
  );
}
