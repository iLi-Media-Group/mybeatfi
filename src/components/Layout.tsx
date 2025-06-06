import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Music, Upload, LayoutDashboard, LogIn, LogOut, UserPlus, Library, CreditCard, Shield, UserCog, Mic, FileText, Briefcase, Mail, Info, Bell, MessageSquare, DollarSign, ListMusic, Users } from 'lucide-react';
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
  const isAdmin = user?.email && ['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'].includes(user.email);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Generate menu items based on user role
  const getMenuItems = () => {
    // Common menu items for all users
    const commonItems = [
      {
        to: "/catalog",
        icon: <Library className="w-4 h-4 mr-2" />,
        label: "Browse Catalog"
      },
      {
        to: "/vocals",
        icon: <Mic className="w-4 h-4 mr-2" />,
        label: "Full Tracks with Vocals"
      },
      {
        to: "/pricing",
        icon: <CreditCard className="w-4 h-4 mr-2" />,
        label: "Pricing Plans"
      },
      {
        to: "/about",
        icon: <Info className="w-4 h-4 mr-2" />,
        label: "About Us"
      },
      {
        to: "/contact",
        icon: <Mail className="w-4 h-4 mr-2" />,
        label: "Contact Us"
      },
      {
        to: "/announcements",
        icon: <Bell className="w-4 h-4 mr-2" />,
        label: "Announcements"
      }
    ];

    // Client-specific items
    const clientItems = [
      {
        to: "/custom-sync-request",
        icon: <FileText className="w-4 h-4 mr-2" />,
        label: "Custom Sync Request"
      }
    ];

    // Producer-specific items
    const producerItems = [
      {
        to: "/chat",
        icon: <MessageSquare className="w-4 h-4 mr-2" />,
        label: "Internal Chat"
      },
      {
        to: "/producer/banking",
        icon: <DollarSign className="w-4 h-4 mr-2" />,
        label: "Producer Payments"
      },
      {
        to: "/producer/dashboard",
        icon: <LayoutDashboard className="w-4 h-4 mr-2" />,
        label: "Producer Dashboard"
      }
    ];

    // Admin-specific items
    const adminItems = [
      {
        to: "/open-sync-briefs",
        icon: <Briefcase className="w-4 h-4 mr-2" />,
        label: "Open Sync Briefs"
      },
      {
        to: "/chat",
        icon: <MessageSquare className="w-4 h-4 mr-2" />,
        label: "Internal Chat"
      },
      {
        to: "/admin/invite-producer",
        icon: <UserCog className="w-4 h-4 mr-2" />,
        label: "Invite Producer"
      },
      {
        to: "/admin/banking",
        icon: <DollarSign className="w-4 h-4 mr-2" />,
        label: "Producer Payments"
      },
      {
        to: "/admin",
        icon: <Shield className="w-4 h-4 mr-2" />,
        label: "Admin Dashboard"
      }
    ];

    // Combine menu items based on user role
    let menuItems = [...commonItems];

    if (user) {
      if (isAdmin) {
        menuItems = [
          ...commonItems,
          ...adminItems
        ];
        
        // If admin is also a producer, add producer dashboard
        if (accountType === 'producer') {
          menuItems.push({
            to: "/producer/dashboard",
            icon: <LayoutDashboard className="w-4 h-4 mr-2" />,
            label: "Producer Dashboard"
          });
        }
      } else if (accountType === 'producer') {
        menuItems = [
          ...commonItems,
          ...producerItems
        ];
      } else if (accountType === 'client') {
        menuItems = [
          ...commonItems,
          ...clientItems
        ];
      }
    }

    return menuItems;
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
      <header className="py-4 px-4 bg-blue-900/80 backdrop-blur-sm border-b border-blue-500/20 sticky top-0 z-50">
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
                <div className="py-1 max-h-[80vh] overflow-y-auto">
                  {/* Dynamic menu items based on user role */}
                  {getMenuItems().map((item, index) => (
                    <Link
                      key={index}
                      to={item.to}
                      className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                  
                  {/* Divider */}
                  <div className="border-t border-blue-500/20 my-1"></div>
                  
                  {/* Producer-specific actions */}
                  {user && accountType === 'producer' && (
                    <>
                      <Link
                        to="/producer/upload"
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Track
                      </Link>
                    </>
                  )}
                  
                  {/* Authentication actions */}
                  {user ? (
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  ) : (
                    <>
                      <a
                        href="#"
                        onClick={handleCreateAccount}
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </a>
                      <Link
                        to="/login"
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <LogIn className="w-4 h-4 mr-2" />
                        Client Login
                      </Link>
                      <Link
                        to="/producer/login"
                        className="flex items-center px-4 py-2 text-gray-300 hover:text-white hover:bg-blue-800/50"
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

      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}