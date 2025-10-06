# TruthLens API Setup Guide

## Overview
TruthLens now includes a comprehensive API with Stripe payment integration for monetizing the fact verification service.

## Features Added

### 1. API Documentation Page (`/api-docs`)
- Complete API reference with examples
- Interactive code snippets for JavaScript/Python
- Rate limiting information
- Verification methods explanation

### 2. Stripe Payment Integration
- Pro subscription: $29/month for unlimited API calls
- Free tier: 100 API calls per day
- Secure checkout process
- Webhook handling for subscription management

### 3. Rate Limiting
- Free tier: 10 requests/minute, 100 requests/day
- Pro tier: 100 requests/minute, unlimited daily
- IP-based limiting for requests without API keys
- Rate limit headers in API responses

### 4. API Authentication
- Bearer token authentication
- Pro keys start with `pk_pro_`
- Free keys start with `pk_free_`

## Environment Variables Required

Add these to your `.env.local` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...

# Existing AI API Keys
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
PERPLEXITY_API_KEY=...
GROK_API_KEY=...
```

## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Create a product and price for the Pro plan ($29/month)
3. Get your API keys from the Stripe dashboard
4. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
5. Add the webhook secret to your environment variables

## API Usage Examples

### Basic Request
```bash
curl -X POST https://truthlens.com/api/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "claim": "The James Webb Space Telescope detected CO₂ on exoplanet WASP-39b"
  }'
```

### JavaScript Example
```javascript
const response = await fetch('https://truthlens.com/api/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    claim: "Your claim here"
  })
});

const result = await response.json();
console.log('Verdict:', result.verdictLabel);
console.log('Confidence:', result.truthLikelihood + '%');
```

## Response Format

```json
{
  "claim": "The claim that was verified",
  "verdict": "Human-readable explanation",
  "verdictLabel": "true|false|uncertain",
  "truthLikelihood": 87,
  "methods": [
    {
      "method": "llm",
      "sources": [],
      "summary": "AI analysis summary",
      "confidence": 85
    }
  ],
  "responses": [
    {
      "provider": "openai",
      "verdict": "Model response",
      "error": null
    }
  ]
}
```

## Rate Limit Headers

All API responses include rate limiting information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pricing Plans

### Free Tier
- 100 API calls per day
- 10 requests per minute
- Basic fact-checking
- Community support

### Pro Tier ($29/month)
- Unlimited API calls
- 100 requests per minute
- All 6 verification methods
- Priority processing
- Advanced analytics
- Email support

## Development

1. Install dependencies: `pnpm install`
2. Set up environment variables
3. Run development server: `pnpm dev`
4. Visit `/api-docs` for the documentation page

## Production Deployment

1. Set up Stripe webhooks
2. Configure production environment variables
3. Deploy to your hosting platform
4. Test payment flow
5. Monitor API usage and rate limits

## Security Notes

- API keys should be kept secure
- Rate limiting prevents abuse
- Stripe handles secure payment processing
- Webhook signatures are verified
- CORS is configured for API endpoints

## Support

For API support or questions:
- Check the documentation at `/api-docs`
- Review rate limiting in responses
- Monitor Stripe dashboard for payments
- Check webhook logs for subscription events
