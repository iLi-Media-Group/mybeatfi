import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { SearchBox } from './components/SearchBox';
import { ProducerLogin } from './components/ProducerLogin';
import { ClientLogin } from './components/ClientLogin';
import { AdminLogin } from './components/AdminLogin';
import { ProducerDashboard } from './components/ProducerDashboard';
import TrackUploadForm from './components/TrackUploadForm';
import { ClientSignupDialog } from './components/ClientSignupDialog';
import { ClientDashboard } from './components/ClientDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ProducerInvitation } from './components/ProducerInvitation';
import { CatalogPage } from './components/CatalogPage';
import { VocalsPage } from './components/VocalsPage';
import { LicensePage } from './components/LicensePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { PricingCarousel } from './components/PricingCarousel';
import { ClientsCarousel } from './components/ClientsCarousel';
import { PricingPage } from './components/PricingPage';
import { ResetPassword } from './components/ResetPassword';
import { LicenseAgreement } from './components/LicenseAgreement';
import { TestUpload } from './components/TestUpload';
import { useAuth } from './contexts/AuthContext';
import { GoldAccessPage } from './components/GoldAccessPage';
import { CustomSyncRequest } from './components/CustomSyncRequest';
import { OpenSyncBriefs } from './components/OpenSyncBriefs';
import RefundPolicy from './components/RefundPolicy';
import PrivacyPolicy from './components/PrivacyPolicy';
import DisputeResolution from './components/DisputeResolution';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { AnnouncementsPage } from './components/AnnouncementsPage';
import { ChatSystem } from './components/ChatSystem';
import { ProducerBankingPage } from './components/ProducerBankingPage';
import { AdminBankingPage } from './components/AdminBankingPage';
import { CheckoutSuccessPage } from './components/CheckoutSuccessPage';
import { WelcomePage } from './components/WelcomePage';
import { TrackPage } from './components/TrackPage';
import { PlaylistsPage } from './components/PlaylistsPage';
import { PlaylistDetailPage } from './components/PlaylistDetailPage';

function App() {
  const [searchParams] = useSearchParams();
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Check if we have email and redirect params that should trigger opening the signup dialog
  useEffect(() => {
    const email = searchParams.get('email');
    const redirect = searchParams.get('redirect');
    
    if (email && redirect === 'pricing' && !user) {
      setIsSignupOpen(true);
    }
  }, [searchParams, user]);

  const LayoutWrapper = ({ children }: { children: React.ReactNode }) => (
    <Layout onSignupClick={() => setIsSignupOpen(true)}>
      {children}
    </Layout>
  );

  const handleSearch = (filters: any) => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.genres?.length) params.set('genres', filters.genres.join(','));
    if (filters.moods?.length) params.set('moods', filters.moods.join(','));
    if (filters.minBpm) params.set('minBpm', filters.minBpm.toString());
    if (filters.maxBpm) params.set('maxBpm', filters.maxBpm.toString());

    navigate(`/catalog?${params.toString()}`);
  };

  return (
    <>
      <Routes>
        <Route path="/" element={
          <LayoutWrapper>
            <section className="py-20 text-center">
              <div className="container mx-auto px-4">
                <h1 className="text-5xl font-bold mb-6">License Music for Your Media Productions</h1>
                <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                  One-Stop Licensing. Simple, Clear Rights. No Hidden Fees.
                </p>
              </div>
            </section>

            <section className="py-12 bg-black/20">
              <div className="container mx-auto px-4">
                <SearchBox onSearch={handleSearch} />
              </div>
            </section>

            <section className="py-20">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Perfect for Your Media</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="relative group">
                    <img
                      src="https://images.unsplash.com/photo-1579165466741-7f35e4755660?auto=format&fit=crop&w=800&q=80"
                      alt="Television Production"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-lg flex items-end p-6">
                      <h3 className="text-xl font-bold text-white">Television Shows</h3>
                    </div>
                  </div>
                  <div className="relative group">
                    <img
                      src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80"
                      alt="Podcast Recording"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-lg flex items-end p-6">
                      <h3 className="text-xl font-bold text-white">Podcasts</h3>
                    </div>
                  </div>
                  <div className="relative group">
                    <img
                      src="https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=800&q=80"
                      alt="YouTube Content Creation"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent rounded-lg flex items-end p-6">
                      <h3 className="text-xl font-bold text-white">YouTube Videos</h3>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-20 bg-black/40">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Choose Your Plan</h2>
                <PricingCarousel />
              </div>
            </section>

            <section className="py-20">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Where Our Music is Featured</h2>
                <ClientsCarousel />
              </div>
            </section>
          </LayoutWrapper>
        } />

        <Route path="/catalog" element={<LayoutWrapper><CatalogPage /></LayoutWrapper>} />
        <Route path="/vocals" element={<LayoutWrapper><VocalsPage /></LayoutWrapper>} />
        <Route path="/pricing" element={<LayoutWrapper><PricingPage /></LayoutWrapper>} />
        <Route path="/reset-password" element={<LayoutWrapper><ResetPassword /></LayoutWrapper>} />
        <Route path="/test-upload" element={<LayoutWrapper><TestUpload /></LayoutWrapper>} />
        <Route path="/upgrade" element={<LayoutWrapper><GoldAccessPage /></LayoutWrapper>} />
        <Route path="/refund-policy" element={<LayoutWrapper><RefundPolicy /></LayoutWrapper>} />
        <Route path="/privacy" element={<LayoutWrapper><PrivacyPolicy /></LayoutWrapper>} />
        <Route path="/dispute-resolution" element={<LayoutWrapper><DisputeResolution /></LayoutWrapper>} />
        <Route path="/about" element={<LayoutWrapper><AboutPage /></LayoutWrapper>} />
        <Route path="/contact" element={<LayoutWrapper><ContactPage /></LayoutWrapper>} />
        <Route path="/announcements" element={<LayoutWrapper><AnnouncementsPage /></LayoutWrapper>} />
        <Route path="/checkout/success" element={<LayoutWrapper><CheckoutSuccessPage /></LayoutWrapper>} />
        <Route path="/welcome" element={<LayoutWrapper><WelcomePage /></LayoutWrapper>} />
        <Route path="/track/:trackId" element={<LayoutWrapper><TrackPage /></LayoutWrapper>} />

        <Route path="/playlists" element={
          <LayoutWrapper>
            <PlaylistsPage />
          </LayoutWrapper>
        } />

        <Route path="/playlist/:playlistId" element={
          <LayoutWrapper>
            <PlaylistDetailPage />
          </LayoutWrapper>
        } />

        <Route path="/playlists" element={
          <LayoutWrapper>
            <PlaylistsPage />
          </LayoutWrapper>
        } />

        <Route path="/playlist/:playlistId" element={
          <LayoutWrapper>
            <PlaylistDetailPage />
          </LayoutWrapper>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <ChatSystem />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/custom-sync-request" element={
          <ProtectedRoute requiresClient>
            <LayoutWrapper>
              <CustomSyncRequest />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/open-sync-briefs" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <OpenSyncBriefs />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/license/:trackId" element={
          <ProtectedRoute requiresClient>
            <LayoutWrapper>
              <LicensePage />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/license-agreement/:licenseId" element={
          <ProtectedRoute>
            <LayoutWrapper>
              <LicenseAgreement />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/login" element={
          <LayoutWrapper>
            <ClientLogin />
          </LayoutWrapper>
        } />

        <Route path="/signup" element={
          <LayoutWrapper>
            <ClientSignupDialog isOpen={true} onClose={() => navigate('/')} />
          </LayoutWrapper>
        } />
        
        <Route path="/producer/login" element={
          <LayoutWrapper>
            <ProducerLogin />
          </LayoutWrapper>
        } />
        
        <Route path="/producer/dashboard" element={
          <ProtectedRoute requiresProducer>
            <LayoutWrapper>
              <ProducerDashboard />
            </LayoutWrapper>
          </ProtectedRoute>
        } />
        
        <Route path="/producer/upload" element={
          <ProtectedRoute requiresProducer>
            <LayoutWrapper>
              <TrackUploadForm />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/producer/banking" element={
          <ProtectedRoute requiresProducer>
            <LayoutWrapper>
              <ProducerBankingPage />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute requiresClient>
            <LayoutWrapper>
              <ClientDashboard />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          user ? (
            <ProtectedRoute requiresAdmin>
              <LayoutWrapper>
                <AdminDashboard />
              </LayoutWrapper>
            </ProtectedRoute>
          ) : (
            <LayoutWrapper>
              <AdminLogin />
            </LayoutWrapper>
          )
        } />

        <Route path="/admin/invite-producer" element={
          <ProtectedRoute requiresAdmin>
            <LayoutWrapper>
              <ProducerInvitation />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="/admin/banking" element={
          <ProtectedRoute requiresAdmin>
            <LayoutWrapper>
              <AdminBankingPage />
            </LayoutWrapper>
          </ProtectedRoute>
        } />

        <Route path="*" element={
          <LayoutWrapper>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">404</h1>
                <p className="text-gray-400">Page not found</p>
              </div>
            </div>
          </LayoutWrapper>
        } />
      </Routes>

      <ClientSignupDialog
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
      />
    </>
  );
}

export default App;