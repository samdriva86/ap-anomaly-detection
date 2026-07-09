'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface AnalysisResult {
  riskScore: number;
  riskLevel: string;
  flags: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  summary: string;
  recommendation: string;
}

export default function AnalyzeInvoice() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [userQuota, setUserQuota] = useState({ used: 0, limit: 25 });

  // Get user ID and quota on mount
  useEffect(() => {
    const getUserData = async () => {
      try {
        const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('sb-user-id') : null;
        if (!storedUserId) {
          router.push('/login');
          return;
        }

        setUserId(storedUserId);

        // Fetch user's current quota
        const { data: profileData } = await supabase
          .from('profiles')
          .select('invoices_used, invoices_limit')
          .eq('id', storedUserId)
          .single();

        if (profileData) {
          setUserQuota({
            used: profileData.invoices_used,
            limit: profileData.invoices_limit,
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        router.push('/login');
      }
    };

    getUserData();
  }, [router]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setAnalyzing(true);

    // Validate inputs
    if (!supplier || !amount || !invoiceNumber) {
      setError('Supplier, amount, and invoice number are required');
      setAnalyzing(false);
      return;
    }

    // Check quota
    if (userQuota.used >= userQuota.limit) {
      setError(`You've reached your monthly quota of ${userQuota.limit} invoices. Upgrade to analyze more.`);
      setAnalyzing(false);
      return;
    }

    try {
      // Call backend analyze route
      const response = await fetch('/api/invoices/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          supplier,
          amount: parseFloat(amount),
          invoiceNumber,
          paymentTerms,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to analyze invoice');
        setAnalyzing(false);
        return;
      }

      setResult(data.analysis);
      setUserQuota({
        used: userQuota.used + 1,
        limit: userQuota.limit,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">AP Anomaly Detection</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Quota Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-800">
            Invoices analyzed: <span className="font-semibold">{userQuota.used} / {userQuota.limit}</span>
          </p>
          {userQuota.used >= userQuota.limit && (
            <p className="text-sm text-red-600 mt-2">
              You've reached your monthly quota. <Link href="/pricing" className="underline">Upgrade your plan</Link> to analyze more.
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analyze Invoice</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g., Acme Corp Ltd"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (£) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 5000.00"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g., INV-2024-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>Net 30</option>
                  <option>Net 60</option>
                  <option>Net 90</option>
                  <option>Due on Receipt</option>
                  <option>2/10 Net 30</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={analyzing || userQuota.used >= userQuota.limit}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {analyzing ? 'Analyzing with AI...' : 'Analyze Invoice'}
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Analysis Results</h3>

            {/* Risk Score */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-semibold text-gray-700">Risk Score</h4>
                <span className={`text-3xl font-bold ${
                  result.riskLevel === 'CRITICAL' ? 'text-red-600' :
                  result.riskLevel === 'HIGH' ? 'text-orange-600' :
                  result.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {result.riskScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    result.riskLevel === 'CRITICAL' ? 'bg-red-600' :
                    result.riskLevel === 'HIGH' ? 'bg-orange-600' :
                    result.riskLevel === 'MEDIUM' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${result.riskScore}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Risk Level: <span className="font-semibold">{result.riskLevel}</span>
              </p>
            </div>

            {/* Flags */}
            {result.flags && result.flags.length > 0 && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">Flags</h4>
                <div className="space-y-3">
                  {result.flags.map((flag, idx) => (
                    <div key={idx} className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-gray-900">{flag.type}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          flag.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          flag.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {flag.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{flag.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Summary</h4>
              <p className="text-gray-600 leading-relaxed">{result.summary}</p>
            </div>

            {/* Recommendation */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-1">Recommendation</h4>
              <p className="text-gray-700 capitalize">{result.recommendation.toLowerCase()}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}