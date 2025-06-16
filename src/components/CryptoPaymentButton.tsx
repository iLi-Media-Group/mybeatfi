import React, { useState } from 'react';
import { Wallet, Coins, Loader2 } from 'lucide-react';
import { createHelioCheckout } from '../lib/helio';

interface CryptoPaymentButtonProps {
  productId: string;
  productName: string;
  productDescription: string;
  price: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  metadata?: Record<string, string>;
  className?: string;
  disabled?: boolean;
}

export function CryptoPaymentButton({
  productId,
  productName,
  productDescription,
  price,
  onSuccess,
  onError,
  metadata,
  className = '',
  disabled = false
}: CryptoPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      
      const checkoutUrl = await createHelioCheckout({
        productId,
        name: productName,
        description: productDescription,
        price,
        successUrl: `${window.location.origin}/checkout/success?payment_method=crypto`,
        cancelUrl: `${window.location.origin}/pricing`,
        metadata
      });
      
      // Redirect to Helio checkout
      window.location.href = checkoutUrl;
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating crypto checkout:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to create checkout'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`w-full py-3 px-6 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : (
        <>
          <Wallet className="w-5 h-5 mr-2" />
          <span>Pay with Crypto</span>
        </>
      )}
    </button>
  );
}
