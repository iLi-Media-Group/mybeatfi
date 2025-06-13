import React from 'react';
import { Check } from 'lucide-react';
import { PricingTier } from '../types';

interface PricingCardProps {
  tier: PricingTier;
  price: number;
  onSelect: () => void;
}

export function PricingCard({ tier, price, onSelect }: PricingCardProps) {
  return (
    <div className="flex flex-col p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
      <h3 className="text-xl font-bold text-white">{tier.name}</h3>
      <p className="mt-2 text-gray-400">{tier.description}</p>
      <div className="mt-4 text-3xl font-bold text-white">
        ${price.toFixed(2)}
      </div>
      <ul className="mt-6 space-y-4 flex-1">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-center text-gray-300">
            <Check className="w-5 h-5 text-purple-500 mr-2" />
            {feature}
          </li>
        ))}
      </ul>
      <button
        onClick={onSelect}
        className="mt-8 w-full py-3 px-6 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
      >
        Select License
      </button>
    </div>
  );
}