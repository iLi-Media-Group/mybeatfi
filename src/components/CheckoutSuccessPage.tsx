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
          // Check if a license was created for this order
          if (user && matchingOrder.amount_total === 999) { // $9.99 single track price
            const { count } = await supabase
              .from('sales')
              .select('*', { count: 'exact', head: true })
              .eq('transaction_id', matchingOrder.payment_intent_id);
            
            setLicenseCreated(count > 0);
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
              : `Your payment has been processed successfully. ${licenseCreated ? 'Your license has been created and is ready to use.' : ''}`}
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
                
                {licenseCreated && (
                  <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm">
                      Your license has been created successfully. You can view it in your dashboard.
                    </p>
                  </div>
                )}
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