import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Music, Calendar, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserSubscription, getUserOrders, formatCurrency, formatDate, getMembershipPlanFromPriceId } from '../lib/stripe';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshMembership } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Try to fetch subscription first
        const subscriptionData = await getUserSubscription();
        if (subscriptionData) {
          setSubscription(subscriptionData);
          
          // Update user's membership plan in the database based on subscription
          if (user) {
            const membershipPlan = getMembershipPlanFromPriceId(subscriptionData.price_id);
            await supabase
              .from('profiles')
              .update({ membership_plan: membershipPlan })
              .eq('id', user.id);
              
            // Refresh the membership in the auth context
            await refreshMembership();
          }
          
          setLoading(false);
          return;
        }
        
        // If no subscription, try to fetch order
        const orders = await getUserOrders();
        const matchingOrder = orders.find(o => o.checkout_session_id === sessionId);
        if (matchingOrder) {
          setOrder(matchingOrder);
          
          // For single track purchases, create a license record
          if (user && matchingOrder.amount_total === 999) { // $9.99 single track price
            // Get the track ID from localStorage if available
            const trackId = localStorage.getItem('pending_license_track_id');
            
            if (trackId) {
              try {
                // Get track details to get producer_id
                const { data: trackData } = await supabase
                  .from('tracks')
                  .select('id, producer_id')
                  .eq('id', trackId)
                  .single();
                
                if (trackData) {
                  // Get user profile for licensee info
                  const { data: profileData } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, email')
                    .eq('id', user.id)
                    .single();
                  
                  if (profileData) {
                    // Create license record
                    await supabase
                      .from('sales')
                      .insert({
                        track_id: trackData.id,
                        buyer_id: user.id,
                        license_type: 'Single Track',
                        amount: matchingOrder.amount_total / 100, // Convert from cents
                        payment_method: 'stripe',
                        transaction_id: matchingOrder.payment_intent_id,
                        created_at: new Date().toISOString(),
                        licensee_info: {
                          name: `${profileData.first_name} ${profileData.last_name}`,
                          email: profileData.email
                        }
                      });
                    
                    // Clear the pending track ID
                    localStorage.removeItem('pending_license_track_id');
                  }
                }
              } catch (err) {
                console.error('Error creating license record:', err);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching checkout data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, navigate, user, refreshMembership]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-green-500/20 p-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">
            {subscription ? 'Subscription Activated!' : 'Payment Successful!'}
          </h1>
          
          <p className="text-xl text-gray-300 mb-8">
            {subscription 
              ? 'Your membership has been successfully activated. You now have access to all the features of your plan.'
              : 'Your payment has been processed successfully. Thank you for your purchase!'}
          </p>

          <div className="bg-white/5 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>
            
            {subscription && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Music className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-white">Plan:</span>
                  </div>
                  <span className="text-white font-medium">
                    {getMembershipPlanFromPriceId(subscription.price_id)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-white">Current Period:</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-white">Payment Method:</span>
                  </div>
                  <span className="text-white font-medium">
                    {subscription.payment_method_brand ? (
                      `${subscription.payment_method_brand.toUpperCase()} •••• ${subscription.payment_method_last4}`
                    ) : (
                      'Card'
                    )}
                  </span>
                </div>
              </div>
            )}

            {order && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Music className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-white">Product:</span>
                  </div>
                  <span className="text-white font-medium">
                    Single Track License
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-white">Amount:</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatCurrency(order.amount_total, order.currency)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-purple-400 mr-2" />
                    <span className="text-white">Date:</span>
                  </div>
                  <span className="text-white font-medium">
                    {new Date(order.order_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center space-y-4">
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/25 flex items-center"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>

            <Link
              to="/catalog"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Browse Music Catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}