'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Invoice {
  id: string;
  supplier: string;
  amount: number;
  invoice_number: string;
  payment_terms: string;
  risk_score: number;
  risk_level: string;
  flags: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  created_at: string;
}

export default function InvoiceHistory() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState<string>('all');

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('sb-user-id') : null;
        if (!storedUserId) {
          router.push('/login');
          return;
        }

        setUserId(storedUserId);

        // Fetch all invoices for user
        const { data: invoiceData, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', storedUserId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching invoices:', error);
          setLoading(false);
          return;
        }

        setInvoices(invoiceData || []);
        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        router.push('/login');
      }
    };

    fetchInvoices();
  }, [router]);

  const filteredInvoices = filterRisk === 'all' 
    ? invoices 
    : invoices.filter((inv) => inv.risk_level === filterRisk);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Analysis History</h2>
          <Link href="/analyze" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
            Analyze New Invoice
          </Link>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setFilterRisk('all')}
            className={`px-4 py-2 rounded-lg transition ${
              filterRisk === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            onClick={() => setFilterRisk('CRITICAL')}
            className={`px-4 py-2 rounded-lg transition ${
              filterRisk === 'CRITICAL'
                ? 'bg-red-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Critical ({invoices.filter((i) => i.risk_level === 'CRITICAL').length})
          </button>
          <button
            onClick={() => setFilterRisk('HIGH')}
            className={`px-4 py-2 rounded-lg transition ${
              filterRisk === 'HIGH'
                ? 'bg-orange-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            High ({invoices.filter((i) => i.risk_level === 'HIGH').length})
          </button>
          <button
            onClick={() => setFilterRisk('MEDIUM')}
            className={`px-4 py-2 rounded-lg transition ${
              filterRisk === 'MEDIUM'
                ? 'bg-yellow-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Medium ({invoices.filter((i) => i.risk_level === 'MEDIUM').length})
          </button>
          <button
            onClick={() => setFilterRisk('LOW')}
            className={`px-4 py-2 rounded-lg transition ${
              filterRisk === 'LOW'
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Low ({invoices.filter((i) => i.risk_level === 'LOW').length})
          </button>
        </div>

        {/* Table */}
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No invoices analyzed yet</p>
            <Link href="/analyze" className="text-blue-600 hover:underline">
              Analyze your first invoice
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      £{invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {invoice.risk_score}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(invoice.risk_level)}`}>
                        {invoice.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.flags && invoice.flags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {invoice.flags.slice(0, 2).map((flag, idx) => (
                            <span key={idx} className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                              {flag.type}
                            </span>
                          ))}
                          {invoice.flags.length > 2 && (
                            <span className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                              +{invoice.flags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(invoice.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}