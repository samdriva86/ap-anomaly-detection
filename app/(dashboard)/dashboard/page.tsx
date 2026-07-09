'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  tier: string;
  invoices_used: number;
  invoices_limit: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const checkAuth = async () => {
    try {
      // Check localStorage first (our manual backup)
      const userIdFromStorage = typeof window !== 'undefined' ? localStorage.getItem('sb-user-id') : null;
      
      if (!userIdFromStorage) {
        router.push('/login');
        return;
      }

      // Get current session from Supabase
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // Try to refresh the session if it exists in auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userIdFromStorage)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        router.push('/login');
        return;
      }

      setUser(profileData);
      setLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  checkAuth();
}, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            AP Anomaly Detection
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* User Welcome Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome, {user.email}
          </h2>
          <p className="text-gray-600">
            You're on the <span className="font-semibold capitalize">{user.tier}</span> plan
          </p>
        </div>

        {/* Quota Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Invoice Analysis Quota
          </h3>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Invoices analyzed this month
              </span>
              <span className="text-sm font-medium text-gray-900">
                {user.invoices_used} / {user.invoices_limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(user.invoices_used / user.invoices_limit) * 100}%`,
                }}
              />
            </div>
          </div>
          {user.invoices_used >= user.invoices_limit ? (
            <p className="text-sm text-red-600 font-medium">
              You've reached your monthly quota. Upgrade to analyze more invoices.
            </p>
          ) : (
            <p className="text-sm text-green-600 font-medium">
              {user.invoices_limit - user.invoices_used} invoices remaining this month
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Analyze Invoice Card */}
          <Link href="/analyze">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Analyze Invoice
              </h3>
              <p className="text-gray-600 text-sm">
                Upload or enter a new invoice for fraud analysis
              </p>
              <div className="mt-4">
                <span className="text-blue-600 font-medium text-sm">Get started →</span>
              </div>
            </div>
          </Link>

          {/* Invoice History Card */}
          <Link href="/history">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Analysis History
              </h3>
              <p className="text-gray-600 text-sm">
                View all analyzed invoices and their risk scores
              </p>
              <div className="mt-4">
                <span className="text-blue-600 font-medium text-sm">View history →</span>
              </div>
            </div>
          </Link>

          {/* Pricing Card */}
          <Link href="/pricing">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition cursor-pointer">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upgrade Plan
              </h3>
              <p className="text-gray-600 text-sm">
                Unlock more invoice analyses and advanced features
              </p>
              <div className="mt-4">
                <span className="text-blue-600 font-medium text-sm">See plans →</span>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}