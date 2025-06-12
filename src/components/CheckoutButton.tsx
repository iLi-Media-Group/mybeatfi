import { createStripeCheckout } from '../lib/stripe';

// Example usage in your component:
async function handleCheckout() {
  try {
    const checkoutUrl = await createStripeCheckout({
      productId: 'prod_123',
      name: 'Premium License',
      description: '1-year music license',
      price: 99.99,
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/cancel`,
    });
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('Checkout error:', error);
  }
}
