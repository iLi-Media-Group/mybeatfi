import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getUserSubscription, getMembershipPlanFromPriceId } from '../lib/stripe';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accountType: 'client' | 'producer' | 'admin' | null;
  membershipPlan: 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accountType, setAccountType] = useState<'client' | 'producer' | 'admin' | null>(null);
  const [membershipPlan, setMembershipPlan] = useState<'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccountType = async (userId: string, email: string) => {
    try {
      // Check if user is an admin
      if (['knockriobeats@gmail.com', 'info@mybeatfi.io', 'derykbanks@yahoo.com'].includes(email)) {
        setAccountType('admin');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('account_type, membership_plan')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setAccountType(data.account_type as 'client' | 'producer');
        setMembershipPlan(data.membership_plan as 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null);
        
        // If the user is a client, check for subscription
        if (data.account_type === 'client') {
          try {
            const subscription = await getUserSubscription();
            
            if (subscription?.subscription_id && subscription?.status === 'active') {
              // Update membership plan in profile based on subscription
              const newMembershipPlan = getMembershipPlanFromPriceId(subscription.price_id);
              
              if (newMembershipPlan !== data.membership_plan) {
                await supabase
                  .from('profiles')
                  .update({ membership_plan: newMembershipPlan })
                  .eq('id', userId);
                  
                setMembershipPlan(newMembershipPlan as 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access');
              }
            }
          } catch (subError) {
            console.error('Error checking subscription:', subError);
          }
        }
      } else {
        setAccountType('client'); // Default to client if no profile found
      }
    } catch (error) {
      console.error('Error fetching account type:', error);
      setAccountType(null);
    }
  };

  const refreshMembership = async () => {
    if (!user) return;
    
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('membership_plan, account_type')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Check for active subscription
      const subscription = await getUserSubscription();
      
      if (subscription?.subscription_id && subscription?.status === 'active') {
        // Get membership plan from subscription
        const newMembershipPlan = getMembershipPlanFromPriceId(subscription.price_id);
        
        // Update if different from current plan
        if (newMembershipPlan !== profileData.membership_plan) {
          await supabase
            .from('profiles')
            .update({ membership_plan: newMembershipPlan })
            .eq('id', user.id);
            
          setMembershipPlan(newMembershipPlan as 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access');
        } else {
          setMembershipPlan(profileData.membership_plan as 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null);
        }
      } else {
        setMembershipPlan(profileData.membership_plan as 'Single Track' | 'Gold Access' | 'Platinum Access' | 'Ultimate Access' | null);
      }
      
      // Also update account type if needed
      if (profileData.account_type) {
        setAccountType(profileData.account_type as 'client' | 'producer');
      }
    } catch (error) {
      console.error('Error refreshing membership:', error);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAccountType(session.user.id, session.user.email || '');
      }
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAccountType(session.user.id, session.user.email || '');
      } else {
        setAccountType(null);
        setMembershipPlan(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error };
    }
    if (data.user) {
      await fetchAccountType(data.user.id, data.user.email || '');
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    // First check if a profile already exists with this email
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      throw new Error('An account with this email already exists');
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            account_type: 'client', // Default to client for new signups
            membership_plan: 'Single Track' // Default membership plan
          });

        if (profileError) throw profileError;
        setAccountType('client');
        setMembershipPlan('Single Track');
      } catch (err) {
        // If profile creation fails, clean up by deleting the auth user
        await supabase.auth.admin.deleteUser(data.user.id);
        throw err;
      }
    }
  };

  const signOut = async () => {
    try {
      // Check if there's an active session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's no session or an error getting it, just clear local state
      if (sessionError || !session) {
        setUser(null);
        setAccountType(null);
        setMembershipPlan(null);
        return;
      }

      // Only attempt to sign out if we have a valid session
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Error during sign out:', error.message);
      }
    } catch (error) {
      console.warn('Unexpected error during sign out:', error);
    } finally {
      // Always clear the local state
      setUser(null);
      setAccountType(null);
      setMembershipPlan(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      accountType, 
      membershipPlan,
      signIn, 
      signUp, 
      signOut,
      refreshMembership
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}