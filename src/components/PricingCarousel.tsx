import React, { useState } from 'react';
import { PRODUCTS, StripeProduct } from '../stripe-config';
import { createCheckoutSession } from '../lib/stripe';
import { CryptoPaymentButton } from './CryptoPaymentButton';
import { formatCurrency } from '../lib/stripe';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Coins, CreditCard } from 'lucide-react';

export function PricingCarousel() {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null);

  const handleStripePayment = async (product: StripeProduct) => {
    if (!user) {
      toast.error('Please log in to make a purchase');
      return;
    }

    try {
      const checkoutUrl = await createCheckoutSession(
        product.priceId, 
        product.mode, 
        undefined, 
        { product_name: product.name }
      );
      
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to initiate checkout. Please try again.');
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRODUCTS.map((product) => (
          <div 
            key={product.id} 
            className={`
              bg-white/5 backdrop-blur-sm rounded-xl border 
              ${product.popular ? 'border-purple-500/40 scale-105' : 'border-white/10'}
              p-6 flex flex-col transition-all duration-300 hover:border-purple-500/40
              h-full
            `}
          >
            <div className="flex flex-col h-full">
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-gray-400 mb-4 min-h-[50px]">{product.description}</p>
              
              <div className="mb-6">
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(product.price)}
                  <span className="text-sm text-gray-400 ml-1">
                    {product.mode === 'subscription' ? '/mo' : ''}
                  </span>
                </p>
              </div>

              <ul className="space-y-3 mb-6 flex-grow">
                {product.features.map((feature, index) => (
                  <li 
                    key={index} 
                    className="flex items-center text-gray-300 text-sm"
                  >
                    <svg 
                      className="w-4 h-4 mr-2 text-purple-400" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="space-y-3 mt-auto">
                <button
                  onClick={() => handleStripePayment(product)}
                  className="w-full py-3 px-6 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 text-white font-semibold transition-all flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay with Card
                </button>

                {product.cryptoEnabled && (
                  <CryptoPaymentButton
                    productId={product.id}
                    productName={product.name}
                    productDescription={product.description}
                    price={product.price}
                    metadata={{ product_name: product.name }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
