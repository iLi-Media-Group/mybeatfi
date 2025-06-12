import React, { useState } from 'react';
import { Wallet, CreditCard, Loader2 } from 'lucide-react';
import { createHelioCheckout } from '../lib/helio';
import { createStripeCheckout } from '../lib/stripe';

interface PaymentOptionsProps {
  productId: string;
  productName: string;
  productDescription: string;
  price: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  metadata?: Record<string, string>;
}

export function PaymentOptions({
  productId,
  productName,
  productDescription,
  price,
  onSuccess,
  onError,
  metadata
}: PaymentOptionsProps) {
  const [loading, setLoading] = useState<'crypto' | 'fiat' | null>(null);

  const handleCryptoPayment = async () => {
    try {
      setLoading('crypto');
      
      const checkoutUrl = await createHelioCheckout({
        productId,
        name: productName,
        description: productDescription,
        price,
        successUrl: `${window.location.origin}/checkout/success?payment_method=crypto`,
        cancelUrl: `${window.location.origin}/pricing`,
        metadata
      });
      
      window.location.href = checkoutUrl;
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Crypto payment error:', error);
      if (onError) onError(error instanceof Error ? error : new Error('Crypto payment failed'));
    } finally {
      setLoading(null);
    }
  };

  const handleFiatPayment = async () => {
    try {
      setLoading('fiat');
      
      const checkoutUrl = await createStripeCheckout({
        productId,
        name: productName,
        description: productDescription,
        price,
        successUrl: `${window.location.origin}/checkout/success?payment_method=fiat`,
        cancelUrl: `${window.location.origin}/pricing`,
        metadata
      });
      
      window.location.href = checkoutUrl;
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Fiat payment error:', error);
      if (onError) onError(error instanceof Error ? error : new Error('Fiat payment failed'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleCryptoPayment}
        disabled={loading === 'crypto'}
        className="w-full py-3 px-6 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'crypto' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            <span>Pay with USDC</span>
          </>
        )}
      </button>

      <button
        onClick={handleFiatPayment}
        disabled={loading === 'fiat'}
        className="w-full py-3 px-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'fiat' ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Pay with Card</span>
          </>
        )}
      </button>
    </div>
  );
}
