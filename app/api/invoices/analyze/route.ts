import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { userId, supplier, amount, invoiceNumber, paymentTerms } = await request.json();

    // Validate input
    if (!userId || !supplier || !amount || !invoiceNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check user's quota
    const { data: profileData, error: profileError } = await supabaseServer
      .from('profiles')
      .select('invoices_used, invoices_limit')
      .eq('id', userId)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (profileData.invoices_used >= profileData.invoices_limit) {
      return NextResponse.json(
        { error: 'Monthly invoice quota exceeded' },
        { status: 402 }
      );
    }

    // Fetch historical invoices for context
    const { data: historicalInvoices, error: invoiceError } = await supabaseServer
      .from('invoices')
      .select('supplier, amount, payment_terms, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (invoiceError) {
      console.error('Error fetching historical invoices:', invoiceError);
    }

    // Build historical context
    const historicalContext = (historicalInvoices || [])
      .map((inv) => `${inv.supplier}: £${inv.amount} (${inv.payment_terms})`)
      .join('\n');

    // Call Gemini for analysis
    const geminiPrompt = `You are an AP fraud detection expert. Analyze this new invoice against the user's historical patterns.

HISTORICAL INVOICES (last 20):
${historicalContext || 'No historical invoices'}

NEW INVOICE:
Supplier: ${supplier}
Amount: £${amount}
Invoice Number: ${invoiceNumber}
Payment Terms: ${paymentTerms}

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "riskScore": <number 0-100>,
  "riskLevel": "<LOW|MEDIUM|HIGH|CRITICAL>",
  "flags": [
    {
      "type": "<DUPLICATE|PRICE_ANOMALY|NEW_SUPPLIER|PAYMENT_TERM_RISK|FREQUENCY_ANOMALY>",
      "severity": "<LOW|MEDIUM|HIGH>",
      "description": "<explanation>"
    }
  ],
  "summary": "<brief risk assessment>",
  "recommendation": "<approve|hold|reject>"
}`;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: geminiPrompt,
              },
            ],
          },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API error:', errorData);
      console.error('Gemini response status:', geminiResponse.status);
      return NextResponse.json(
        { error: 'Failed to analyze invoice with Gemini', details: errorData },
        { status: 500 }
      );
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Gemini response:', analysisText);

    // Parse JSON response from Gemini
    let analysisResult;
    try {
      // Extract JSON from response (Gemini might add extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }
      analysisResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Response:', analysisText);
      return NextResponse.json(
        { error: 'Failed to parse Gemini response' },
        { status: 500 }
      );
    }

    // Store analysis in database
    const { error: storeError } = await supabaseServer
      .from('invoices')
      .insert([
        {
          user_id: userId,
          supplier,
          amount,
          invoice_number: invoiceNumber,
          payment_terms: paymentTerms,
          analysis_result: analysisResult,
          risk_score: analysisResult.riskScore,
          risk_level: analysisResult.riskLevel,
          flags: analysisResult.flags,
        },
      ]);

    if (storeError) {
      console.error('Error storing invoice analysis:', storeError);
      return NextResponse.json(
        { error: 'Failed to store analysis' },
        { status: 500 }
      );
    }

    // Increment user's invoice count
    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({ invoices_used: profileData.invoices_used + 1 })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating quota:', updateError);
      // Don't fail here - analysis succeeded, just quota didn't update
    }

    return NextResponse.json(
      {
        analysis: analysisResult,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Analyze route error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during analysis' },
      { status: 500 }
    );
  }
}