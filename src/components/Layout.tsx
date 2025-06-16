import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Music, Upload, LayoutDashboard, LogIn, LogOut, UserPlus, Library, CreditCard, Shield, UserCog, Mic, FileText, Briefcase, Mail, Info, Bell, MessageSquare, DollarSign, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Footer } from './Footer';

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
  const isAdmin = user?.email && ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com', 'knockriobeats2@gmail.com'].includes(user.email);


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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col">
      <header className="py-4 px-4 bg-blue-900/80 backdrop-solid-sm border-b border-blue-500/20 sticky top-0 z-50">
        <nav className="container mx-auto flex justify-between items-center relative">
          <div className="flex items-center w-1/3">
            <Link to="/" className="flex items-center">
              {logoUrl ? (
                <div className="h-12 w-auto overflow-hidden rounded-lg border border-blue-500/20 bg-white/5 p-2 transition-all hover:bg-white/10">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="h-full w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 flex items-center justify-center rounded-lg border border-blue-500/20 bg-white/5 p-2 transition-all hover:bg-white/10">
                  <Music className="w-8 h-8 text-blue-400" />
                </div>
              )}
            </Link>
          </div>

          <div className="flex-1 flex justify-center">
            <h1 className="text-2xl font-bold text-white">
              MYBEATFI <span className="text-blue-400">SYNC</span>
            </h1>
          </div>
          
          <div className="flex items-center justify-end w-1/3">
            {/* Mobile menu button */}
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
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-blue-900/90 backdrop-blur-sm border border-blue-500/20 shadow-xl z-[100] top-full">
                <div className="py-1">
                  {/* Common menu items for all users */}
                  <Link to="/catalog" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                    <Library className="w-4 h-4 mr-2" />Browse Catalog
                  </Link>
                  
                  <Link to="/vocals" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                    <Mic className="w-4 h-4 mr-2" />Full Tracks with Vocals
                  </Link>
                  
                  {/* Client-specific menu items */}
                  {(accountType === 'client' || !user) && (
                    <Link 
                      to={user ? "/custom-sync-request" : "#"} 
                      className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" 
                      onClick={(e) => {
                        setIsMenuOpen(false);
                        if (!user) {
                          e.preventDefault();
                          alert('Log In is required to access this feature. Please sign in or create an account.');
                          navigate('/login');
                        }
                      }}>
                      <FileText className="w-4 h-4 mr-2" />Custom Sync Request
                    </Link>
                  )}
                  
                  {/* Admin-specific menu items */}
                  {isAdmin && (
                    <>
                      <Link to="/open-sync-briefs" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <Briefcase className="w-4 h-4 mr-2" />Open Sync Briefs
                      </Link>
                      <Link to="/custom-sync-request" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <FileText className="w-4 h-4 mr-2" />Custom Sync Request
                      </Link>
                    </>
                  )}
                  
                  {/* Common menu items continued */}
                  <Link to="/pricing" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                    <CreditCard className="w-4 h-4 mr-2" />Pricing Plans
                  </Link>
                  
                  <div className="border-t border-blue-500/20 my-1"></div>
                  
                  <Link to="/about" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                    <Info className="w-4 h-4 mr-2" />About Us
                  </Link>
                  
                  <Link to="/contact" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                    <Mail className="w-4 h-4 mr-2" />Contact Us
                  </Link>
                  
                  <Link to="/announcements" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                    <Bell className="w-4 h-4 mr-2" />Announcements
                  </Link>
                  
                  {/* Producer and Admin specific items */}
                  {(accountType === 'producer' || isAdmin) && (
                    <Link to="/chat" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                      <MessageSquare className="w-4 h-4 mr-2" />Internal Chat
                    </Link>
                  )}
                  
                  {/* Admin specific items */}
                  {isAdmin && (
                    <>
                      <Link to="/admin/invite-producer" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <UserCog className="w-4 h-4 mr-2" />Invite Producer
                      </Link>
                      <Link to="/admin/banking" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <DollarSign className="w-4 h-4 mr-2" />Producer Payments
                      </Link>
                    </>
                  )}
                  
                  {/* Producer specific items */}
                  {accountType === 'producer' && (
                    <>
                      <Link to="/producer/banking" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <DollarSign className="w-4 h-4 mr-2" />Earnings & Payments
                      </Link>
                      <Link to="/producer/payouts" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <Wallet className="w-4 h-4 mr-2" />USDC Payouts
                      </Link>
                      <Link to="/producer/upload" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <Upload className="w-4 h-4 mr-2" />Upload Track
                      </Link>
                    </>
                  )}
                  
                  {/* Dashboard links */}
                  {user && (
                    <Link to={getDashboardLink()} className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                      {getDashboardIcon()}
                      {getDashboardLabel()}
                    </Link>
                  )}
                  
                  {/* Authentication links */}
                  {user ? (
                    <button onClick={handleSignOut} className="w-full flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50">
                      <LogOut className="w-4 h-4 mr-2" />Sign Out
                    </button>
                  ) : (
                    <>
                      <a href="#" onClick={handleCreateAccount} className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50">
                        <UserPlus className="w-4 h-4 mr-2" />Create Account
                      </a>
                      <Link to="/login" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <LogIn className="w-4 h-4 mr-2" />Client Login
                      </Link>
                      <Link to="/producer/login" className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50" onClick={() => setIsMenuOpen(false)}>
                        <LogIn className="w-4 h-4 mr-2" />Producer Login
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
