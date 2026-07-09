'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    console.log('Login form submitted');
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      console.log('Missing email or password');
      setError('Email and password are required');
      setLoading(false);
      return;
    }

    console.log('Email:', email, 'Password length:', password.length);

    try {
      // Sign in directly with Supabase client
      console.log('About to call signInWithPassword');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('signInWithPassword response:', { data, signInError });

      if (signInError) {
        console.log('Sign in error:', signInError.message);
        setError(signInError.message || 'Login failed');
        setLoading(false);
        return;
      }

      if (!data.user || !data.session) {
        console.log('No user or session in response');
        setError('Login failed');
        setLoading(false);
        return;
      }

      console.log('Login successful, storing session');
      // Manually store session for MVP
      if (typeof window !== 'undefined' && data.user?.id) {
        console.log('Storing user ID:', data.user.id);
        localStorage.setItem('sb-user-id', data.user.id);
      }
      console.log('About to redirect in 500ms');
      setTimeout(() => {
        console.log('Redirecting to dashboard now');
        router.push('/dashboard');
      }, 500);

    } catch (err: any) {
      console.log('Catch error:', err.message);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AP Anomaly Detection
        </h1>
        <p className="text-gray-600 mb-8">Log in to your account</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}