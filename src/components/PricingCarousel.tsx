import React, { useState, useEffect } from 'react';
import { Check, CreditCard, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface PricingPlan {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  trackLimit?: number;
  isSingleTrack?: boolean;
  usageLimit?: string;
  discount?: {
    type: 'percentage' | 'amount';
    value: number;
  };
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Ultimate Access',
    price: 299,
    period: 'year',
    description: 'Unlimited lifetime access',
    features: [
      'Unlimited track downloads',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access to downloaded tracks',
      'Priority support',
      'No time limit on track usage'
    ]
  },
  {
    name: 'Platinum Access',
    price: 59.99,
    period: 'month',
    description: 'Unlimited, non-exclusive track use',
    features: [
      'Unlimited track downloads',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access to downloaded tracks',
      'Priority support',
      '3 year usage limit'
    ],
    usageLimit: '3 years'
  },
  {
    name: 'Gold Access',
    price: 34.99,
    period: 'month',
    description: '10 tracks per month',
    trackLimit: 10,
    features: [
      '10 track downloads per month',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access to downloaded tracks',
      'Email support',
      '1 year usage limit'
    ],
    usageLimit: '1 year'
  },
  {
    name: 'Single Track',
    price: 9.99,
    period: 'track',
    description: 'Pay per track',
    isSingleTrack: true,
    features: [
      'Single track download',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access',
      'Basic support',
      '1 year usage limit'
    ],
    usageLimit: '1 year'
  }
];

export function PricingCarousel() {
  const [plans, setPlans] = useState<PricingPlan[]>(pricingPlans);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const { data: discounts, error } = await supabase
          .from('discounts')
          .select('*')
          .eq('active', true)
          .gte('end_date', new Date().toISOString());

        if (error) throw error;

        if (discounts) {
          const updatedPlans = plans.map(plan => {
            const discount = discounts.find(
              d => d.plan_name === plan.name &&
                  new Date(d.start_date) <= new Date() &&
                  new Date(d.end_date) >= new Date()
            );

            if (discount) {
              return {
                ...plan,
                discount: {
                  type: discount.discount_type as 'percentage' | 'amount',
                  value: discount.discount_value
                }
              };
            }

            return plan;
          });

          setPlans(updatedPlans);
        }
      } catch (err) {
        console.error('Error fetching discounts:', err);
      }
    };

    fetchDiscounts();
  }, []);

  const calculateDiscountedPrice = (plan: PricingPlan) => {
    if (!plan.discount) return plan.price;

    if (plan.discount.type === 'percentage') {
      return plan.price * (1 - plan.discount.value / 100);
    } else {
      return plan.price - plan.discount.value;
    }
  };

  const handleSubscribe = (plan: PricingPlan) => {
    if (!user) {
      navigate('/login');
    } else {
      // Handle subscription for logged-in users
      console.log('Selected plan:', plan);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className="bg-white/5 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-8 h-full hover:border-blue-500/40 transition-colors"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
            <p className="text-gray-400 mb-4">{plan.description}</p>
            <div className="flex items-baseline justify-center">
              {plan.discount ? (
                <>
                  <span className="text-4xl font-bold text-white">
                    ${calculateDiscountedPrice(plan).toFixed(2)}
                  </span>
                  <span className="text-gray-400 ml-2">/{plan.period}</span>
                  <span className="ml-2 text-sm line-through text-gray-500">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="ml-2 text-sm text-green-400">
                    {plan.discount.type === 'percentage'
                      ? `${plan.discount.value}% off`
                      : `$${plan.discount.value} off`}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-white">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="text-gray-400 ml-2">/{plan.period}</span>
                </>
              )}
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-white mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {!plan.isSingleTrack && (
            <div className="space-y-4">
              <button
                onClick={() => handleSubscribe(plan)}
                className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-5 h-5" />
                <span>Subscribe with Card</span>
              </button>
              
              <button
                onClick={() => handleSubscribe(plan)}
                className="w-full py-3 px-6 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-white font-semibold transition-all flex items-center justify-center space-x-2"
              >
                <Coins className="w-5 h-5" />
                <span>Subscribe with Crypto</span>
              </button>

              <p className="text-center text-sm text-gray-400 mt-4">
                Accepts USDC, USDT, and Solana
              </p>
            </div>
          )}

          {plan.isSingleTrack && (
            <button
              onClick={() => handleSubscribe(plan)}
              className="w-full py-3 px-6 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 text-white font-semibold transition-all"
            >
              Browse Tracks
            </button>
          )}
        </div>
      ))}
    </div>
  );
}