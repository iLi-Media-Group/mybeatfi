import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function LicenseDialog({ 
  isOpen, 
  onClose, 
  track, 
  licenseType, 
  price 
}: { 
  isOpen: boolean;
  onClose: () => void;
  track: any;
  licenseType: string;
  price: number;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handlePurchase = async () => {
    if (!user) {
      setError('Please log in to purchase a license');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user profile is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile?.full_name) {
        setError('Please complete your profile before purchasing');
        return;
      }

      // Calculate license expiration
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      // Create sales record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          track_id: track.id,
          buyer_id: user.id,
          license_type: licenseType,
          amount: price,
          payment_method: 'stripe',
          expiry_date: expiryDate.toISOString(),
          licensee_info: {
            name: profile.full_name,
            email: profile.email
          }
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Close the dialog and navigate to the license agreement page
      onClose();
      navigate(`/license-agreement/${sale.id}`);
      
    } catch (err) {
      console.error('Purchase error:', err);
      setError('An error occurred during purchase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Purchase License</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Track Details</h3>
            <p>{track?.title}</p>
            <p>License Type: {licenseType}</p>
            <p>Price: ${price}</p>
          </div>

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handlePurchase} 
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Purchase'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}