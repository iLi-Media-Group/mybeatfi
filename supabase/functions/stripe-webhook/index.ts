import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
          metadata
          metadata
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed', // assuming we want to mark it as completed since payment is successful
          status: 'completed', // assuming we want to mark it as completed since payment is successful
          metadata
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }
        
        // Get the user_id associated with this customer
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single();
        
        if (customerError) {
          console.error('Error fetching customer data:', customerError);
          return;
        }
        
        // Check if this is a sync proposal payment
        if (metadata?.proposal_id) {
          // Get proposal details
          const { data: proposalData, error: proposalError } = await supabase
            .from('sync_proposals')
            .select(`
              id, 
              track_id, 
              client_id,
              track:tracks!inner (
                producer_id,
                title
              )
            `)
            .eq('id', metadata.proposal_id)
            .single();
            
          if (proposalError) {
            console.error('Error fetching proposal data:', proposalError);
            return;
          }
          
          // Update proposal payment status
          const { error: updateError } = await supabase
            .from('sync_proposals')
            .update({
              payment_status: 'paid',
              payment_date: new Date().toISOString(),
              invoice_id: payment_intent
            })
            .eq('id', metadata.proposal_id);
            
          if (updateError) {
            console.error('Error updating proposal payment status:', updateError);
            return;
          }
          
          // Get producer email for notification
          const { data: producerData, error: producerError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', proposalData.track.producer_id)
            .single();
            
          if (producerError) {
            console.error('Error fetching producer email:', producerError);
            return;
          }
          
          // Get client email for notification
          const { data: clientData, error: clientError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', proposalData.client_id)
            .single();
            
          if (clientError) {
            console.error('Error fetching client email:', clientError);
            return;
          }
          
          // Send notifications
          try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-proposal-update`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                proposalId: metadata.proposal_id,
                action: 'payment_complete',
                trackTitle: proposalData.track.title,
                producerEmail: producerData.email,
                clientEmail: clientData.email
              })
            });
          } catch (notifyError) {
            console.error('Error sending payment notification:', notifyError);
          }
          
          console.info(`Successfully processed sync proposal payment for proposal: ${metadata.proposal_id}`);
          return;
        }
        
        // Handle regular track purchase
        const trackId = metadata?.track_id;
        
        if (trackId && customerData?.user_id) {
          // Get track details to get producer_id
          const { data: trackData, error: trackError } = await supabase
            .from('tracks')
            .select('id, producer_id')
            .eq('id', trackId)
            .single();
          
          if (trackError) {
            console.error('Error fetching track data:', trackError);
            return;
          }
          
          // Get user profile for licensee info
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', customerData.user_id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile data:', profileError);
            return;
          }
          
          // Create license record
          const { error: saleError } = await supabase
            .from('sales')
            .insert({
              track_id: trackData.id,
              producer_id: trackData.producer_id,
              buyer_id: customerData.user_id,
              license_type: 'Single Track',
              amount: amount_total / 100, // Convert from cents to dollars
              payment_method: 'stripe',
              transaction_id: payment_intent,
              created_at: new Date().toISOString(),
              licensee_info: {
                name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
                email: profileData.email
              }
            });
          
          if (saleError) {
            console.error('Error creating license record:', saleError);
            return;
          }
          
          console.info(`Successfully created license record for track ${trackId}`);
        }
        
        
        // Get the user_id associated with this customer
        const { data: customerData, error: customerError } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('customer_id', customerId)
          .single();
        
        if (customerError) {
          console.error('Error fetching customer data:', customerError);
          return;
        }
        
        // Get the track ID from metadata if available
        const trackId = metadata?.track_id;
        
        if (trackId && customerData?.user_id) {
          // Get track details to get producer_id
          const { data: trackData, error: trackError } = await supabase
            .from('tracks')
            .select('id, producer_id')
            .eq('id', trackId)
            .single();
          
          if (trackError) {
            console.error('Error fetching track data:', trackError);
            return;
          }
          
          // Get user profile for licensee info
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', customerData.user_id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile data:', profileError);
            return;
          }
          
          // Create license record
          const { error: saleError } = await supabase
            .from('sales')
            .insert({
              track_id: trackData.id,
              producer_id: trackData.producer_id,
              buyer_id: customerData.user_id,
              license_type: 'Single Track',
              amount: amount_total / 100, // Convert from cents to dollars
              payment_method: 'stripe',
              transaction_id: payment_intent,
              created_at: new Date().toISOString(),
              licensee_info: {
                name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
                email: profileData.email
              }
            });
          
          if (saleError) {
            console.error('Error creating license record:', saleError);
            return;
          }
          
          console.info(`Successfully created license record for track ${trackId}`);
        }
        
        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // TODO verify if needed
    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
