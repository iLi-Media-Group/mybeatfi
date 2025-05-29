import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Music, ShoppingCart, Heart, Clock } from 'lucide-react';

export function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome back, {user?.email}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Browse Tracks */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Music className="h-8 w-8 text-blue-500" />
              <span className="text-sm font-medium text-gray-500">Browse</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Browse Tracks</h2>
            <p className="text-gray-600 mb-4">Explore our catalog of exclusive beats</p>
            <Button 
              onClick={() => navigate('/catalog')}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              View Catalog
            </Button>
          </div>

          {/* My Purchases */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <ShoppingCart className="h-8 w-8 text-green-500" />
              <span className="text-sm font-medium text-gray-500">Purchases</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">My Purchases</h2>
            <p className="text-gray-600 mb-4">View your licensed tracks</p>
            <Button 
              onClick={() => navigate('/purchases')}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              View Purchases
            </Button>
          </div>

          {/* Favorites */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Heart className="h-8 w-8 text-red-500" />
              <span className="text-sm font-medium text-gray-500">Favorites</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">My Favorites</h2>
            <p className="text-gray-600 mb-4">Access your saved tracks</p>
            <Button 
              onClick={() => navigate('/favorites')}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              View Favorites
            </Button>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-8 w-8 text-purple-500" />
              <span className="text-sm font-medium text-gray-500">Recent</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Recent Activity</h2>
            <p className="text-gray-600 mb-4">View your recent interactions</p>
            <Button 
              onClick={() => navigate('/activity')}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              View Activity
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}