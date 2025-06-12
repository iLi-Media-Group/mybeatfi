import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Download, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PDFDocument, pdf } from '@react-pdf/renderer';
import { LicensePDF } from './LicensePDF';

interface LicenseDetails {
  trackTitle: string;
  producerName: string;
  licenseeInfo: {
    name: string;
    email: string;
    company?: string;
  };
  licenseType: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access';
  purchaseDate: string;
  price: number;
}

export function LicenseAgreement() {
  const { licenseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [license, setLicense] = useState<LicenseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreditOption, setShowCreditOption] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchLicenseDetails = async () => {
      if (!user || !licenseId) return;

      try {
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id,
            license_type,
            amount,
            created_at,
            track:tracks (
              title,
              producer:profiles!tracks_producer_id_fkey (
                first_name,
                last_name,
                email
              )
            ),
            buyer:profiles!sales_buyer_id_fkey (
              first_name,
              last_name,
              email
            )
          `)
          .eq('id', licenseId)
          .single();

        if (error) throw error;

        if (data) {
          setLicense({
            trackTitle: data.track.title,
            producerName: `${data.track.producer.first_name} ${data.track.producer.last_name}`,
            licenseeInfo: {
              name: `${data.buyer.first_name} ${data.buyer.last_name}`,
              email: data.buyer.email
            },
            licenseType: data.license_type,
            purchaseDate: data.created_at,
            price: data.amount
          });
        }
      } catch (err) {
        console.error('Error fetching license:', err);
        setError('Failed to load license details');
      } finally {
        setLoading(false);
      }
    };

    fetchLicenseDetails();
  }, [user, licenseId]);

  const generatePDF = async () => {
    if (!license) return;

    try {
      setGeneratingPDF(true);

      // Generate PDF document
      const pdfDoc = await pdf(
        <LicensePDF
          license={license}
          showCredits={showCreditOption}
          acceptedDate={new Date().toISOString()}
        />
      ).toBlob();

      // Upload PDF to Supabase storage
      const fileName = `license-${licenseId}-${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('license-agreements')
        .upload(fileName, pdfDoc);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('license-agreements')
        .getPublicUrl(fileName);

      // Send email and store agreement
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-license-agreement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseId,
          licenseeEmail: license.licenseeInfo.email,
          licenseeInfo: license.licenseeInfo,
          trackTitle: license.trackTitle,
          licenseType: license.licenseType,
          pdfUrl: publicUrl
        })
      });

      // Download PDF
      const url = window.URL.createObjectURL(pdfDoc);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${license.trackTitle} - License Agreement.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error generating license agreement:', err);
      setError('Failed to generate license agreement');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !license) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400 text-center">{error || 'License not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-blue-500/20 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Music Synchronization License Agreement</h1>
          <button
            onClick={generatePDF}
            disabled={!acceptedTerms || generatingPDF}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-5 h-5 mr-2" />
            {generatingPDF ? 'Generating...' : 'Download PDF'}
          </button>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300">
            This Music Synchronization License Agreement ("Agreement") is entered into on{' '}
            {new Date(license.purchaseDate).toLocaleDateString()} by and between:
          </p>

          <div className="bg-white/5 rounded-lg p-4 my-6">
            <p className="mb-2">
              <strong>Licensor:</strong> MyBeatFi Sync
            </p>
            <p>
              <strong>Licensee:</strong> {license.licenseeInfo.name}
              {license.licenseeInfo.company && ` (${license.licenseeInfo.company})`}
            </p>
          </div>

          <h2 className="text-xl font-bold text-white mt-8">1. GRANT OF LICENSE</h2>
          <p className="text-gray-300">
            Licensor hereby grants Licensee a non-exclusive, non-transferable license to synchronize
            and use the musical composition and sound recording titled "{license.trackTitle}" ("Music")
            for commercial purposes. This license is worldwide, subject to the terms and conditions
            stated herein.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">2. TERM OF LICENSE</h2>
          {(() => {
            const purchaseDate = new Date(license.purchaseDate);
            let expiryDateText = '';

            switch (license.licenseType) {
              case 'Single Track':
              case 'Gold Access': {
                const expiry = new Date(purchaseDate);
                expiry.setFullYear(purchaseDate.getFullYear() + 1);
                expiryDateText = expiry.toLocaleDateString();
                break;
              }
              case 'Platinum Access': {
                const expiry = new Date(purchaseDate);
                expiry.setFullYear(purchaseDate.getFullYear() + 3);
                expiryDateText = expiry.toLocaleDateString();
                break;
              }
              case 'Ultimate Access':
                expiryDateText = 'Perpetual (No Expiration)';
                break;
              default:
                expiryDateText = 'Unknown';
            }

            return (
              <p className="text-gray-300">
                The license commenced on {purchaseDate.toLocaleDateString()} and will expire on {expiryDateText}.
              </p>
            );
          })()}

          <h2 className="text-xl font-bold text-white mt-8">3. PERMITTED USES</h2>
          <ul className="list-disc pl-6 text-gray-300">
            <li>Online content (social media, websites, podcasts)</li>
            <li>Advertisements and promotional videos</li>
            <li>Film, TV, and video productions</li>
            <li>Video games and apps</li>
            <li>Live events and public performances</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">4. RESTRICTIONS</h2>
          <ul className="list-disc pl-6 text-gray-300">
            <li>Resell, sublicense, or distribute the Music as a standalone product</li>
            <li>Use the Music in a manner that is defamatory, obscene, or illegal</li>
            <li>Register the Music with any content identification system (e.g., YouTube Content ID)</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">5. COMPENSATION</h2>
          <p className="text-gray-300">
            Licensee has paid the membership service fee for this license.
          </p>

          <div className="bg-white/5 rounded-lg p-6 my-8">
            <h2 className="text-xl font-bold text-white mb-4">License Acceptance</h2>
            
            <label className="flex items-center space-x-3 mb-6">
              <input
                type="checkbox"
                checked={showCreditOption}
                onChange={(e) => setShowCreditOption(e.target.checked)}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-300">
                I would like to provide credit to the producer in my productions
              </span>
            </label>

            {showCreditOption && (
              <div className="mb-6 p-4 bg-black/20 rounded-lg">
                <p className="text-gray-300">
                  Suggested credit format: "Music by {license.producerName}"
                </p>
              </div>
            )}

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-300">
                I have read and agree to the terms of this license agreement
              </span>
            </label>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generatePDF}
                disabled={!acceptedTerms || generatingPDF}
                className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-5 h-5 mr-2" />
                {generatingPDF ? 'Generating...' : 'Download Agreement'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
