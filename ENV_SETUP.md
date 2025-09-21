# TruthLens Environment Setup

## Required API Keys

To enable the full 6-method verification system, you need the following API keys:

### 1. LLM APIs (Method 1: AI Analysis)
```bash
# OpenAI (for GPT models)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Google Gemini (for Gemini models)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# Perplexity (for real-time web search)
PPLX_API_KEY=your_perplexity_api_key_here
PPLX_MODEL=sonar-small-online

# Grok (X.AI)
GROK_API_KEY=your_grok_api_key_here
GROK_MODEL=grok-2-latest
```

### 2. Web Scraping & Research APIs (Methods 2 & 3)
```bash
# SerpAPI (for Google Scholar search)
SERP_API_KEY=your_serpapi_key_here

# Note: PubMed and ArXiv APIs are free and don't require keys
```

### 3. News & Media APIs (Method 4)
```bash
# NewsAPI.org (for real-time news verification)
NEWS_API_KEY=your_newsapi_key_here

# Google Custom Search (for reverse image search)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

### 4. Image & URL Analysis APIs (Methods 5 & 6)
```bash
# TinEye (for reverse image search)
TINEYE_API_KEY=your_tineye_key_here

# VirusTotal (for URL safety checking)
VIRUSTOTAL_API_KEY=your_virustotal_key_here

# Note: Archive.org API is free and doesn't require a key
```

## How to Get API Keys

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up/Login
3. Go to API Keys section
4. Create a new API key
5. Add billing information (pay-per-use)

### Google Gemini
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Create a new API key
4. Free tier available with limits

### Perplexity
1. Go to [Perplexity API](https://www.perplexity.ai/settings/api)
2. Sign up/Login
3. Generate API key
4. Free tier available with limits

### Grok (X.AI)
1. Go to [X.AI Console](https://console.x.ai/)
2. Sign up/Login
3. Create API key
4. Add billing information

### SerpAPI
1. Go to [SerpAPI](https://serpapi.com/)
2. Sign up for free account
3. Get API key from dashboard
4. Free tier: 100 searches/month

### NewsAPI
1. Go to [NewsAPI](https://newsapi.org/)
2. Sign up for free account
3. Get API key from dashboard
4. Free tier: 1000 requests/day

### Google Custom Search
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Custom Search API
4. Create credentials (API key)
5. Go to [Custom Search Engine](https://cse.google.com/)
6. Create a new search engine
7. Get Search Engine ID
8. Free tier: 100 searches/day

### TinEye
1. Go to [TinEye API](https://tineye.com/api/)
2. Sign up for free account
3. Get API key from dashboard
4. Free tier: 500 searches/month

### VirusTotal
1. Go to [VirusTotal](https://www.virustotal.com/gui/join-us)
2. Sign up for free account
3. Get API key from profile
4. Free tier: 4 requests/minute

## Environment File Setup

Create a `.env.local` file in your project root:

```bash
# Copy this template and fill in your actual API keys

# LLM APIs (Method 1)
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here
PPLX_API_KEY=pplx-your-perplexity-key-here
GROK_API_KEY=xai-your-grok-key-here

# Research APIs (Method 3)
SERP_API_KEY=your-serpapi-key-here

# News APIs (Method 4)
NEWS_API_KEY=your-newsapi-key-here

# Image & URL APIs (Methods 5 & 6)
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here
TINEYE_API_KEY=your-tineye-key-here
VIRUSTOTAL_API_KEY=your-virustotal-key-here

# Optional: Customize models
OPENAI_MODEL=gpt-4o-mini
GEMINI_MODEL=gemini-2.0-flash
PPLX_MODEL=sonar-small-online
GROK_MODEL=grok-2-latest
```

## Verification Methods

### Method 1: LLM Analysis
- OpenAI GPT: General knowledge and reasoning
- Google Gemini: Multimodal analysis (text + images)
- Perplexity: Real-time web search with citations
- Grok: Alternative perspective and reasoning

### Method 2: Web Scraping
- Government sites (.gov): Official information
- Educational sites (.edu): Academic sources
- News organizations: BBC, Reuters, AP, CNN, etc.
- Fact-checking sites: Snopes, FactCheck.org
- Scientific organizations: NASA, WHO, CDC

### Method 3: Research Papers
- Google Scholar: Academic papers and citations
- PubMed: Medical and scientific research
- ArXiv: Pre-print scientific papers

### Method 4: News Sources
- NewsAPI: Real-time news articles and reports
- Source reliability: High/Medium/Low based on outlet reputation
- Publication dates: Recent news coverage analysis
- Author verification: Journalist credibility checking

### Method 5: Image Analysis
- Reverse image search: Google Custom Search API
- TinEye integration: Duplicate image detection
- Deepfake detection: AI-powered authenticity scoring
- Metadata analysis: EXIF data extraction and verification

### Method 6: URL Safety
- VirusTotal: Malware and phishing detection
- Archive.org: Historical version checking
- Domain reputation: Safety scoring and threat analysis
- Redirect analysis: Link chain verification

## Cost Considerations

### Free Tiers Available:
- Gemini: 15 requests/minute, 1M tokens/day
- Perplexity: 5 requests/minute, 20 requests/day
- NewsAPI: 1000 requests/day
- Google Custom Search: 100 searches/day
- TinEye: 500 searches/month
- VirusTotal: 4 requests/minute
- Archive.org: Completely free
- PubMed/ArXiv: Completely free

### Paid Services:
- OpenAI: $0.15/1M input tokens, $0.60/1M output tokens
- Grok: Contact X.AI for pricing
- SerpAPI: $50/month for 5,000 searches
- NewsAPI: $449/month for 250,000 requests
- Google Custom Search: $5/1000 queries after free tier
- TinEye: $200/month for 10,000 searches
- VirusTotal: $600/month for 500,000 requests

## Minimum Setup for Testing

If you only have one API key, the system will still work:

```bash
# Minimum setup (only Gemini)
GEMINI_API_KEY=your-gemini-key-here
```

The system will:
- Use Gemini for all LLM analysis
- Skip web scraping if no Perplexity key
- Skip research papers if no SerpAPI key
- Skip news verification if no NewsAPI key
- Skip image analysis if no Google/TinEye keys
- Skip URL safety if no VirusTotal key
- Still provide verification with available methods

## Recommended Setup for Full Functionality

```bash
# For comprehensive verification
GEMINI_API_KEY=your-gemini-key-here
NEWS_API_KEY=your-newsapi-key-here
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id-here
```

## Security Notes

1. Never commit API keys to version control
2. Use environment variables only
3. Rotate keys regularly
4. Monitor usage and costs
5. Set up billing alerts

## Troubleshooting

### Common Issues:
1. "missing_key" errors: Check your .env.local file
2. Rate limit errors: Wait and retry, or upgrade your plan
3. Timeout errors: Some APIs are slower, this is normal
4. CORS errors: Make sure you're running on localhost:3000

### Testing Individual APIs:
```bash
# Test if your keys work
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```
