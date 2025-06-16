import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Music, ShoppingCart, User, Plus } from 'lucide-react';

export function NavigationMenu() {
  return (
    <nav className="bg-gray-900/50 backdrop-blur-sm border-r border-gray-800 h-full w-64 fixed left-0 top-0 p-4">
      <div className="flex flex-col space-y-6">
        <Link 
          to="/" 
          className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link 
          to="/pricing" 
          className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Pricing</span>
        </Link>

        <Link 
          to="/custom-sync-request" 
          className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Custom Sync Request</span>
        </Link>

        <Link 
          to="/profile" 
          className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
        >
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </div>
    </nav>
  );
}
