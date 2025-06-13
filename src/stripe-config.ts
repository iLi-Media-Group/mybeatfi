export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  priceId: string;
  mode: 'payment' | 'subscription';
  price: number;
  features: string[];
  popular?: boolean;
  interval: string;
}

export const PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_SQOjd8nu1u5xMc',
    name: 'Ultimate Access',
    description: 'Unlimited annual subscription',
    priceId: 'price_1RVXvoIkn3xpidKHRzHgSFn1',
    mode: 'subscription',
    price: 499.99,
    interval: 'year',
    features: [
      'Unlimited track downloads',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access to downloaded tracks',
      'Priority support',
      'No time limit on track usage'
    ],
    popular: false,
    cryptoEnabled: true
  },
  {
    id: 'prod_SQOiS7N3ApTh7C',
    name: 'Platinum Access',
    description: 'Unlimited track use',
    priceId: 'price_1RVXurIkn3xpidKH18dW0FYC',
    mode: 'subscription',
    price: 59.99,
    interval: 'month',
    features: [
      'Unlimited track downloads',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access to downloaded tracks',
      'Priority support',
      '3 year usage limit'
    ],
    popular: true,
    cryptoEnabled: true
  },
  {
    id: 'prod_SQOhLQJIM6Rji8',
    name: 'Gold Access',
    description: '10 tracks per month',
    priceId: 'price_1RVXu9Ikn3xpidKHqxoSb6bC',
    mode: 'subscription',
    price: 34.99,
    interval: 'month',
    features: [
      '10 track downloads per month',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access to downloaded tracks',
      'Email support',
      '1 year usage limit'
    ],
    popular: false,
    cryptoEnabled: true
  },
  {
    id: 'prod_SQOgYj7gpZae0k',
    name: 'Single Track',
    description: 'Pay per track',
    priceId: 'price_1RVXtSIkn3xpidKHaI8hnYLU',
    mode: 'payment',
    price: 9.99,
    interval: 'track',
    features: [
      'Single track download',
      'Non-exclusive license',
      'Commercial use',
      'Worldwide rights',
      'Lifetime access',
      'Basic support',
      '1 year usage limit'
    ],
    popular: false,
    cryptoEnabled: true
  }
];
