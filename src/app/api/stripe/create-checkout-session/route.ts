import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { priceId, customerEmail } = await request.json();

    console.log('Received request:', { priceId, customerEmail });

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }

    // For testing: always create a test price
    let finalPriceId = null;
    
    // Create a test price for testing
    if (true) { // Always create test price for now
      console.log('No price ID found, creating test product and price...');
      try {
        // Create a test product
        const product = await stripe.products.create({
          name: 'TruthLens Pro - Test',
          description: 'Test subscription for TruthLens Pro',
        });

        // Create a test price for the product
        const stripePrice = await stripe.prices.create({
          unit_amount: 999, // $9.99
          currency: 'usd',
          recurring: { interval: 'month' },
          product: product.id,
        });

        finalPriceId = stripePrice.id;
        console.log('Created test price:', finalPriceId);
      } catch (error) {
        console.error('Failed to create test price:', error);
        return NextResponse.json({ error: 'Failed to create test price' }, { status: 500 });
      }
    }

    console.log('Creating Stripe session with priceId:', finalPriceId);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/api-docs?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/api-docs?canceled=true`,
      customer_email: customerEmail,
      metadata: {
        plan: 'pro',
      },
    });

    console.log('Stripe session created:', session.id);
    console.log('Session details:', {
      id: session.id,
      url: session.url,
      mode: session.mode,
      status: session.status
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url // Also return the URL for debugging
    });
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
