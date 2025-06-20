import React from 'react';
import { Link } from 'react-router-dom';

const ProducerLandingPage = () => {
  return (
    <div className="bg-gray-50 text-gray-800 min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Become a Sync Producer</h1>
          <Link
            to="/producer-application"
            className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
          >
            Apply Now
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16">
        <section className="text-center mb-20">
          <h2 className="text-4xl font-bold mb-4">Get Your Music Licensed Worldwide</h2>
          <p className="text-lg text-gray-600">
            Join a global roster of sync-ready producers. Fair payouts. Transparent reporting. No hassle.
          </p>
          <Link
            to="/producer-application"
            className="mt-6 inline-block bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700"
          >
            Start Your Application
          </Link>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-20">
          <div className="bg-white p-6 shadow rounded">
            <h3 className="text-xl font-semibold mb-2">Why Join MyBeatFi Sync?</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>✅ Get paid for every sync license sold</li>
              <li>✅ Automated payouts (Stripe + USDC Crypto)</li>
              <li>✅ Detailed monthly reporting</li>
              <li>✅ AI-driven metadata boosts your discoverability</li>
              <li>✅ Exposure to global brands, agencies, and creators</li>
            </ul>
          </div>
          <div className="bg-white p-6 shadow rounded">
            <h3 className="text-xl font-semibold mb-2">How It Works</h3>
            <ol className="list-decimal pl-5 text-gray-600 space-y-2">
              <li>Submit your producer application</li>
              <li>Our team reviews your profile and music</li>
              <li>If approved, you get onboarded to the platform</li>
              <li>Start uploading tracks and earning from syncs</li>
            </ol>
          </div>
        </section>

        <section className="bg-blue-50 p-10 rounded-lg mb-20">
          <h3 className="text-2xl font-bold mb-6 text-center">Requirements</h3>
          <ul className="list-disc pl-5 text-gray-700 space-y-2">
            <li>✅ Must own 100% of the copyright for all music submitted</li>
            <li>✅ No unlicensed Splice samples or third-party loops</li>
            <li>✅ Sync-quality production and mixing</li>
            <li>✅ One-stop clearance (no complex rights issues)</li>
            <li>✅ Preferred: Able to deliver stems upon request</li>
          </ul>
        </section>

        <section className="text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to Apply?</h3>
          <p className="mb-6 text-gray-600">
            Click below to start your application and join our growing sync roster.
          </p>
          <Link
            to="/producer-application"
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
          >
            Start Application
          </Link>
        </section>
      </main>

      <footer className="bg-gray-100 text-center py-6 text-sm text-gray-600">
        &copy; {new Date().getFullYear()} MyBeatFi Sync. All rights reserved.
      </footer>
    </div>
  );
};

export default ProducerLandingPage;
