import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Music, Upload, LayoutDashboard, LogIn, LogOut, UserPlus, Library, CreditCard, Shield, UserCog, Mic, FileText, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  onSignupClick?: () => void;
}

export function Layout({ children, onSignupClick }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { user, accountType, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.email && ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'].includes(user.email);

  useEffect(() => {
    const fetchLogo = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'logo_url')
        .single();

      if (!error && data) {
        setLogoUrl(data.value);
      }
    };

    fetchLogo();
  }, []);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setIsMenuOpen(false);
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleCreateAccount = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSignupClick) {
      onSignupClick();
      setIsMenuOpen(false);
    }
  };

  const getDashboardLink = () => {
    if (isAdmin) {
      return location.pathname === '/admin' ? '/producer/dashboard' : '/admin';
    }
    return accountType === 'producer' ? '/producer/dashboard' : '/dashboard';
  };

  const getDashboardIcon = () => {
    if (isAdmin) {
      return location.pathname === '/admin' ? <Music className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />;
    }
    return <LayoutDashboard className="w-4 h-4 mr-2" />;
  };

  const getDashboardLabel = () => {
    if (isAdmin) {
      return location.pathname === '/admin' ? 'Producer Dashboard' : 'Admin Dashboard';
    }
    return accountType === 'producer' ? 'Producer Dashboard' : 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <header className="py-4 px-4 bg-blue-900 border-b border-blue-500/20 sticky top-0 z-50">
        <nav className="container mx-auto flex justify-between items-center relative">
          <div className="flex items-center w-1/3">
            <Link to="/" className="flex items-center">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="h-16" />
              )}
            </Link>
          </div>

          <div className="flex-1 flex justify-center">
            <h1 className="text-2xl font-bold text-white">
              MYBEATFI <span className="text-blue-400">SYNC</span>
            </h1>
          </div>
          
          <div className="flex items-center justify-end w-1/3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white transition-colors p-2"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-blue-900 border border-blue-500/20 shadow-xl z-[100] top-full">
                <div className="py-1">
                  <Link
                    to="/catalog"
                    className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Library className="w-4 h-4 mr-2" />
                    Browse Catalog
                  </Link>

                  <Link
                    to="/vocals"
                    className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Full Tracks with Vocals
                  </Link>

                  <Link
                    to="/open-sync-briefs"
                    className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Open Sync Briefs
                  </Link>

                  <Link
                    to={user ? "/custom-sync-request" : "/pricing"}
                    className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Custom Sync Request
                  </Link>

                  <Link
                    to="/pricing"
                    className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pricing Plans
                  </Link>

                  {user ? (
                    <>
                      {isAdmin && (
                        <Link
                          to="/admin/invite-producer"
                          className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <UserCog className="w-4 h-4 mr-2" />
                          Invite Producer
                        </Link>
                      )}
                      <Link
                        to={getDashboardLink()}
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {getDashboardIcon()}
                        {getDashboardLabel()}
                      </Link>
                      {(accountType === 'producer' || user.email === 'knockriobeats@gmail.com') && (
                        <Link
                          to="/producer/upload"
                          className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Track
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href="#"
                        onClick={handleCreateAccount}
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </a>
                      <Link
                        to="/login"
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Client Login
                      </Link>
                      <Link
                        to="/producer/login"
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Producer Login
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main>
        {children}
      </main>
    </div>
  );
}