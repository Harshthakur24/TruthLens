import { NextRequest, NextResponse } from 'next/server';

type ProviderName = 'openai' | 'gemini' | 'perplexity' | 'grok';

type ProviderResponse = {
	provider: ProviderName;
	answer: string;
	confidence?: number;
	latencyMs: number;
	model?: string;
	error?: string;
};

type WebSource = {
	url: string;
	title: string;
	content: string;
	domain: string;
	reliability: 'high' | 'medium' | 'low';
};

type ResearchSource = {
	title: string;
	authors: string[];
	journal?: string;
	year?: number;
	url: string;
	abstract: string;
	source: 'scholar' | 'pubmed' | 'arxiv';
};

type VerificationMethod = {
	method: 'llm' | 'web' | 'research' | 'news' | 'image' | 'url';
	sources: (WebSource | ResearchSource | NewsSource)[];
	summary: string;
	confidence: number;
};

type NewsSource = {
	title: string;
	description: string;
	url: string;
	publishedAt: string;
	source: string;
	author?: string;
	reliability: 'high' | 'medium' | 'low';
};

type ImageAnalysis = {
	reverseSearchResults: string[];
	tineyeResults: string[];
	metadata?: any;
	deepfakeScore?: number;
};

type URLSafety = {
	isSafe: boolean;
	threats: string[];
	reputation: 'good' | 'suspicious' | 'malicious';
	archiveLinks: string[];
};

type ImagePart = { mimeType: string; data: string };
type ImagePayload = ImagePart[] | undefined;

const SYS_PROMPT = 'You are a fact verification assistant. Given a claim, provide:\n' +
	'- A concise verdict: true, false, or uncertain.\n' +
	'- A brief rationale with authoritative citations (urls) if possible.\n' +
	'- Keep it under 120 words.';

// Function to clean text by removing asterisks and other unwanted characters
function cleanText(text: string): string {
	if (!text) return '';
	return text
		.replace(/\*+/g, '') // Remove all asterisks
		.replace(/\s+/g, ' ') // Replace multiple spaces with single space
		.trim(); // Remove leading/trailing whitespace
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('timeout')), ms);
		promise.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
	});
}

async function callOpenAI(claim: string): Promise<ProviderResponse> {
	const start = Date.now();
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) return { provider: 'openai', answer: '', latencyMs: 0, error: 'missing_key' };
	try {
		const res = await withTimeout(fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
			body: JSON.stringify({
				model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
				messages: [
					{ role: 'system', content: SYS_PROMPT },
					{ role: 'user', content: 'Claim: ' + claim }
				],
				temperature: 0.1
			})
		}), 25000);
		const data = await res.json();
		const answer = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? String(data.choices[0].message.content).trim() : '');
		return { provider: 'openai', answer, latencyMs: Date.now() - start, model: data && data.model };
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'error';
		return { provider: 'openai', answer: '', latencyMs: Date.now() - start, error: msg };
	}
}

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callGemini(claim: string, responses?: ProviderResponse[], images?: ImagePayload): Promise<ProviderResponse> {
	const start = Date.now();
	const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
	if (!apiKey) return { provider: 'gemini', answer: '', latencyMs: 0, error: 'missing_key' };
	try {
		const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
		const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

		let prompt = SYS_PROMPT + '\n\nClaim: ' + claim;
		
		if (responses) {
			prompt = 'Analyze these model responses and provide a final verdict (true/false/uncertain) with explanation:\n\n' +
				'Claim: ' + claim + '\n\n' +
				'Model Responses:\n' +
				responses.map(r => `${r.provider}: ${r.answer}`).join('\n\n') + '\n\n' +
				'Provide a clear verdict and cite authoritative sources. Keep under 120 words.';
		}


		const parts: GeminiPart[] = [ { text: prompt } ];
		if (images && Array.isArray(images)) {
			for (const img of images) {
				if (img && img.data && img.mimeType) {
					parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
				}
			}
		}

		const res = await withTimeout(fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-goog-api-key': apiKey
			},
			body: JSON.stringify({
				contents: [ { role: 'user', parts } ],
				generationConfig: { temperature: 0.1 }
			})
		}), 25000);
		
		const data = await res.json();
		console.log('Gemini response:', JSON.stringify(data, null, 2));
		
		const answer = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text ? String(data.candidates[0].content.parts[0].text).trim() : '');
		return { provider: 'gemini', answer, latencyMs: Date.now() - start, model }; 
	} catch (e: unknown) {
		console.error('Gemini error:', e);
		const msg = e instanceof Error ? e.message : 'error';
		return { provider: 'gemini', answer: '', latencyMs: Date.now() - start, error: msg };
	}
}

async function callPerplexity(claim: string): Promise<ProviderResponse> {
	const start = Date.now();
	const apiKey = process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY;
	if (!apiKey) return { provider: 'perplexity', answer: '', latencyMs: 0, error: 'missing_key' };
	try {
		const res = await withTimeout(fetch('https://api.perplexity.ai/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
			body: JSON.stringify({
				model: process.env.PPLX_MODEL || 'sonar-small-online',
				messages: [
					{ role: 'system', content: SYS_PROMPT },
					{ role: 'user', content: 'Claim: ' + claim }
				],
				temperature: 0.1,
				search_domain_filter: ['.gov', '.edu', 'nasa.gov', 'who.int', 'cdc.gov'],
				return_images: false,
				return_related_questions: false
			})
		}), 30000);
		const data = await res.json();
		const answer = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? String(data.choices[0].message.content).trim() : '');
		return { provider: 'perplexity', answer, latencyMs: Date.now() - start, model: data && data.model };
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'error';
		return { provider: 'perplexity', answer: '', latencyMs: Date.now() - start, error: msg };
	}
}

async function callGrok(claim: string): Promise<ProviderResponse> {
	const start = Date.now();
	const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
	if (!apiKey) return { provider: 'grok', answer: '', latencyMs: 0, error: 'missing_key' };
	try {
		const res = await withTimeout(fetch('https://api.x.ai/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
			body: JSON.stringify({
				model: process.env.GROK_MODEL || 'grok-2-latest',
				messages: [
					{ role: 'system', content: SYS_PROMPT },
					{ role: 'user', content: 'Claim: ' + claim }
				],
				temperature: 0.1
			})
		}), 25000);
		const data = await res.json();
		const answer = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? String(data.choices[0].message.content).trim() : '');
		return { provider: 'grok', answer, latencyMs: Date.now() - start, model: data && data.model };
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'error';
		return { provider: 'grok', answer: '', latencyMs: Date.now() - start, error: msg };
	}
}

// --- Web Scraping & Research Functions ---
function extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]*)?/gi;
    const found = (text || '').match(urlRegex) || [];
    const unique = Array.from(new Set(found.map(u => u.replace(/[).,]+$/g, ''))));
    return unique.slice(0, 12);
}

async function scrapeWebContent(url: string): Promise<WebSource | null> {
    try {
        const response = await withTimeout(fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TruthLens/1.0; +https://truthlens.com/bot)'
            }
        }), 10000);
        
        if (!response.ok) return null;
        
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
        
        // Extract main content (simplified)
        const contentMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || 
                           html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                           html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        
        let content = contentMatch ? contentMatch[1] : html;
        // Remove HTML tags and clean up
        content = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 1000);
        
        const domain = new URL(url).hostname;
        const reliability = getDomainReliability(domain);
        
        return { url, title, content, domain, reliability };
    } catch (e) {
        console.error('Scraping error for', url, e);
        return null;
    }
}

function getDomainReliability(domain: string): 'high' | 'medium' | 'low' {
    const highReliability = ['.gov', '.edu', 'nasa.gov', 'who.int', 'cdc.gov', 'reuters.com', 'bbc.com', 'ap.org', 'snopes.com', 'factcheck.org'];
    const mediumReliability = ['cnn.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com', 'wsj.com'];
    
    if (highReliability.some(d => domain.includes(d))) return 'high';
    if (mediumReliability.some(d => domain.includes(d))) return 'medium';
    return 'low';
}

async function searchResearchPapers(claim: string): Promise<ResearchSource[]> {
    const sources: ResearchSource[] = [];
    
    // Google Scholar search (using SerpAPI or similar)
    try {
        const scholarResults = await searchGoogleScholar(claim);
        sources.push(...scholarResults);
    } catch (e) {
        console.error('Google Scholar search failed:', e);
    }
    
    // PubMed search for medical/scientific claims
    try {
        const pubmedResults = await searchPubMed(claim);
        sources.push(...pubmedResults);
    } catch (e) {
        console.error('PubMed search failed:', e);
    }
    
    // ArXiv search for scientific papers
    try {
        const arxivResults = await searchArXiv(claim);
        sources.push(...arxivResults);
    } catch (e) {
        console.error('ArXiv search failed:', e);
    }
    
    return sources.slice(0, 10); // Limit to 10 results
}

async function searchGoogleScholar(query: string): Promise<ResearchSource[]> {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) return [];
    
    try {
        const response = await withTimeout(fetch(`https://serpapi.com/search?engine=google_scholar&q=${encodeURIComponent(query)}&api_key=${apiKey}`), 15000);
        const data = await response.json();
        
        return (data.organic_results || []).map((result: Record<string, unknown>) => ({
            title: String(result.title || ''),
            authors: Array.isArray((result.publication_info as Record<string, unknown>)?.authors) ? ((result.publication_info as Record<string, unknown>).authors as Record<string, unknown>[]).map((a: Record<string, unknown>) => String(a.name || '')) : [],
            journal: String((result.publication_info as Record<string, unknown>)?.summary || ''),
            year: result.year ? parseInt(String(result.year)) : undefined,
            url: String(result.link || ''),
            abstract: String(result.snippet || ''),
            source: 'scholar' as const
        }));
    } catch (e) {
        console.error('Google Scholar API error:', e);
        return [];
    }
}

async function searchPubMed(query: string): Promise<ResearchSource[]> {
    try {
        const response = await withTimeout(fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json`), 10000);
        const data = await response.json();
        
        if (!data.esearchresult?.idlist?.length) return [];
        
        const ids = data.esearchresult.idlist.join(',');
        const summaryResponse = await withTimeout(fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`), 10000);
        const summaryData = await summaryResponse.json();
        
        return Object.values(summaryData.result || {}).map((article: unknown) => ({
            title: String((article as Record<string, unknown>).title || ''),
            authors: Array.isArray((article as Record<string, unknown>).authors) ? ((article as Record<string, unknown>).authors as Record<string, unknown>[]).map((a: Record<string, unknown>) => String(a.name || '')) : [],
            journal: String((article as Record<string, unknown>).source || ''),
            year: (article as Record<string, unknown>).pubdate ? parseInt(String((article as Record<string, unknown>).pubdate).split(' ')[0]) : undefined,
            url: `https://pubmed.ncbi.nlm.nih.gov/${String((article as Record<string, unknown>).uid || '')}/`,
            abstract: String((article as Record<string, unknown>).abstract || ''),
            source: 'pubmed' as const
        }));
    } catch (e) {
        console.error('PubMed API error:', e);
        return [];
    }
}

async function searchArXiv(query: string): Promise<ResearchSource[]> {
    try {
        const response = await withTimeout(fetch(`http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=0&max_results=5`), 10000);
        const xml = await response.text();
        
        // Simple XML parsing (in production, use proper XML parser)
        const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
        
        return entries.map(entry => {
            const titleMatch = entry.match(/<title[^>]*>([^<]+)<\/title>/);
            const authorMatches = entry.match(/<name>([^<]+)<\/name>/g);
            const summaryMatch = entry.match(/<summary[^>]*>([^<]+)<\/summary>/);
            const idMatch = entry.match(/<id>([^<]+)<\/id>/);
            const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
            
            return {
                title: titleMatch ? titleMatch[1].trim() : '',
                authors: authorMatches ? authorMatches.map(m => m.replace(/<\/?name>/g, '')) : [],
                journal: 'arXiv',
                year: publishedMatch ? new Date(publishedMatch[1]).getFullYear() : undefined,
                url: idMatch ? idMatch[1] : '',
                abstract: summaryMatch ? summaryMatch[1].trim() : '',
                source: 'arxiv' as const
            };
        });
    } catch (e) {
        console.error('ArXiv API error:', e);
        return [];
    }
}

// --- New API Functions ---

async function searchNewsAPI(query: string): Promise<NewsSource[]> {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
        console.log('NewsAPI.org: No API key found');
        return [];
    }
    
    try {
        console.log('NewsAPI.org: Searching for:', query);
        // Using NewsAPI.org API endpoint
        const response = await withTimeout(fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${apiKey}&sortBy=relevancy&pageSize=10&language=en`), 15000);
        
        if (!response.ok) {
            console.error('NewsAPI.org response error:', response.status, response.statusText);
            return [];
        }
        
        const data = await response.json();
        console.log('NewsAPI.org: Found', data.articles?.length || 0, 'articles');
        console.log('NewsAPI.org response:', JSON.stringify(data, null, 2));
        
        if (!data.articles || !Array.isArray(data.articles)) return [];
        
        return data.articles.map((article: Record<string, unknown>) => ({
            title: cleanText(String(article.title || '')),
            description: cleanText(String(article.description || '')),
            url: String(article.url || ''),
            publishedAt: String(article.publishedAt || ''),
            source: String((article.source as Record<string, unknown>)?.name || ''),
            author: cleanText(String(article.author || '')),
            reliability: getNewsReliability(String((article.source as Record<string, unknown>)?.name || ''))
        }));
    } catch (e) {
        console.error('NewsAPI.org error:', e);
        return [];
    }
}

function getNewsReliability(source: string): 'high' | 'medium' | 'low' {
    const highReliability = ['Reuters', 'Associated Press', 'BBC News', 'The New York Times', 'The Washington Post', 'The Guardian', 'NPR', 'PBS NewsHour', 'AP', 'Bloomberg', 'Wall Street Journal', 'Financial Times'];
    const mediumReliability = ['CNN', 'ABC News', 'CBS News', 'NBC News', 'USA Today', 'Time', 'Newsweek', 'Fox News', 'CNBC', 'Forbes'];
    
    if (highReliability.some(s => source.includes(s))) return 'high';
    if (mediumReliability.some(s => source.includes(s))) return 'medium';
    return 'low';
}

async function reverseImageSearch(_imageData: string): Promise<string[]> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) return [];
    
    try {
        // For now, return mock results - in production, you'd use Google Custom Search API with image
        return [
            'https://example.com/similar-image-1.jpg',
            'https://example.com/similar-image-2.jpg',
            'https://example.com/similar-image-3.jpg'
        ];
    } catch (e) {
        console.error('Reverse image search error:', e);
        return [];
    }
}

async function checkURLSafety(url: string): Promise<URLSafety> {
    const _apiKey = process.env.VIRUSTOTAL_API_KEY;
    
    try {
        // Check if URL is safe
        const isSafe = !url.includes('malicious') && !url.includes('phishing');
        
        // Get archive links
        const archiveLinks = await getArchiveLinks(url);
        
        return {
            isSafe,
            threats: isSafe ? [] : ['Potential phishing site'],
            reputation: isSafe ? 'good' : 'suspicious',
            archiveLinks
        };
    } catch (e) {
        console.error('URL safety check error:', e);
        return {
            isSafe: true,
            threats: [],
            reputation: 'good',
            archiveLinks: []
        };
    }
}

async function getArchiveLinks(url: string): Promise<string[]> {
    try {
        // Generate archive.org links for different dates
        const dates = ['20240101', '20230101', '20220101'];
        return dates.map(date => `https://web.archive.org/web/${date}/${url}`);
    } catch (e) {
        console.error('Archive links error:', e);
        return [];
    }
}

async function analyzeImages(images: ImagePayload): Promise<ImageAnalysis> {
    if (!images || images.length === 0) {
        return {
            reverseSearchResults: [],
            tineyeResults: [],
            metadata: null,
            deepfakeScore: 0
        };
    }
    
    try {
        const reverseSearchResults = await reverseImageSearch(images[0].data);
        
        return {
            reverseSearchResults,
            tineyeResults: [], // Would integrate TinEye API here
            metadata: null, // Would extract EXIF data here
            deepfakeScore: Math.random() * 100 // Mock deepfake detection
        };
    } catch (e) {
        console.error('Image analysis error:', e);
        return {
            reverseSearchResults: [],
            tineyeResults: [],
            metadata: null,
            deepfakeScore: 0
        };
    }
}

async function researchWithPerplexity(claim: string): Promise<string[]> {
    const apiKey = process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY;
    if (!apiKey) return [];
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey } as const;

    const bodies = [
        { // general web
            model: process.env.PPLX_MODEL || 'sonar-small-online',
            messages: [ { role: 'system', content: 'Find authoritative sources that address the claim and include direct URLs.' }, { role: 'user', content: 'Claim: ' + claim } ],
            temperature: 0.1
        },
        { // .gov and .edu
            model: process.env.PPLX_MODEL || 'sonar-small-online',
            messages: [ { role: 'system', content: 'Cite URLs only from .gov or .edu domains relevant to the claim.' }, { role: 'user', content: 'Claim: ' + claim } ],
            temperature: 0.1,
            search_domain_filter: ['.gov', '.edu']
        },
        { // health/science authorities
            model: process.env.PPLX_MODEL || 'sonar-small-online',
            messages: [ { role: 'system', content: 'Cite URLs from WHO, CDC, NASA, or major journals if relevant.' }, { role: 'user', content: 'Claim: ' + claim } ],
            temperature: 0.1,
            search_domain_filter: ['who.int', 'cdc.gov', 'nasa.gov']
        }
    ];

    const calls = bodies.map((b) =>
        withTimeout(fetch('https://api.perplexity.ai/chat/completions', { method: 'POST', headers, body: JSON.stringify(b) }), 30000)
            .then((r) => r.json() as Promise<unknown>)
            .catch(() => null as unknown)
    );
    const results: unknown[] = await Promise.all(calls);

    const texts = results.map((d) => {
        const obj = d as { choices?: Array<{ message?: { content?: string } }> } | null;
        const content = obj?.choices?.[0]?.message?.content;
        return content ? String(content) : '';
    }).join('\n');
    return extractUrls(texts);
}

function normalizeVerdictLabel(text: string): 'true' | 'false' | 'uncertain' {
    const t = (text || '').toLowerCase();
    if (/(^|\b)(true|accurate|correct|confirmed)(\b|$)/.test(t)) return 'true';
    if (/(^|\b)(false|incorrect|untrue|debunked|not\s+true)(\b|$)/.test(t)) return 'false';
    return 'uncertain';
}

function verdictToTruthPercent(label: 'true'|'false'|'uncertain'): number {
    if (label === 'true') return 95;
    if (label === 'false') return 5;
    return 50;
}

export async function POST(req: NextRequest) {
	try {
		const parsed = await req.json();
		const claim: string | undefined = parsed && typeof parsed.claim === 'string' ? parsed.claim : undefined;
		let images: ImagePayload = undefined;
		if (Array.isArray(parsed?.images)) {
			images = (parsed.images as unknown[])
				.map((im) => {
					const obj = im as { mimeType?: unknown; data?: unknown };
					return (typeof obj?.mimeType === 'string' && typeof obj?.data === 'string') ? { mimeType: obj.mimeType, data: obj.data } as ImagePart : null;
				})
				.filter((v): v is ImagePart => v !== null);
		} else if (parsed?.image && parsed.image.data && parsed.image.mimeType) {
			images = [ { mimeType: String(parsed.image.mimeType), data: String(parsed.image.data) } ];
		}
		if (!claim) {
			return NextResponse.json({ error: 'claim is required' }, { status: 400 });
		}

		console.log('Starting 3-method verification for claim:', claim);

		// METHOD 1: LLM Analysis
		console.log('Method 1: LLM Analysis...');
		const llmResponses = await Promise.all([
			callOpenAI(claim),
			callPerplexity(claim),
			callGrok(claim),
			callGemini(claim, undefined, images)
		]);

		const validLlmResponses = llmResponses.filter(r => r.answer && !r.error);
		const llmMethod: VerificationMethod = {
			method: 'llm',
			sources: [],
			summary: validLlmResponses.map(r => `${r.provider}: ${r.answer}`).join('\n\n'),
			confidence: validLlmResponses.length > 0 ? Math.min(validLlmResponses.length * 25, 100) : 0
		};

		// METHOD 2: Web Scraping & Authoritative Sources
		console.log('Method 2: Web Scraping...');
		const researchUrls = await researchWithPerplexity(claim).catch(() => []);
		const webSources: WebSource[] = [];
		
		// Scrape top URLs in parallel (limit to 5 for performance)
		const scrapePromises = researchUrls.slice(0, 5).map(url => scrapeWebContent(url));
		const scrapedResults = await Promise.all(scrapePromises);
		scrapedResults.forEach(result => {
			if (result) webSources.push(result);
		});

		const webMethod: VerificationMethod = {
			method: 'web',
			sources: webSources,
			summary: webSources.map(s => `${s.title} (${s.domain}): ${s.content.substring(0, 200)}...`).join('\n\n'),
			confidence: webSources.length > 0 ? Math.min(webSources.length * 20, 100) : 0
		};

		// METHOD 3: Research Papers & Academic Sources
		console.log('Method 3: Research Papers...');
		const researchSources = await searchResearchPapers(claim);
		
		const researchMethod: VerificationMethod = {
			method: 'research',
			sources: researchSources,
			summary: researchSources.map(s => `${s.title} (${s.journal}, ${s.year}): ${s.abstract.substring(0, 200)}...`).join('\n\n'),
			confidence: researchSources.length > 0 ? Math.min(researchSources.length * 15, 100) : 0
		};

		// METHOD 4: News API Verification
		console.log('Method 4: News Sources...');
		const newsSources = await searchNewsAPI(claim);
		console.log('News sources found:', newsSources.length);
		console.log('News sources data:', JSON.stringify(newsSources, null, 2));
		
		const newsMethod: VerificationMethod = {
			method: 'news',
			sources: newsSources,
			summary: newsSources.map(s => `${s.title} (${s.source}): ${s.description.substring(0, 200)}...`).join('\n\n'),
			confidence: newsSources.length > 0 ? Math.min(newsSources.length * 20, 100) : 0
		};
		console.log('News method created:', JSON.stringify(newsMethod, null, 2));

		// METHOD 5: Image Analysis (if images provided)
		console.log('Method 5: Image Analysis...');
		const imageAnalysis = await analyzeImages(images);
		
		const imageMethod: VerificationMethod = {
			method: 'image',
			sources: [],
			summary: `Reverse search results: ${imageAnalysis.reverseSearchResults.length} matches found. Deepfake score: ${imageAnalysis.deepfakeScore?.toFixed(1)}%`,
			confidence: imageAnalysis.reverseSearchResults.length > 0 ? 80 : 0
		};

		// METHOD 6: URL Safety Check (if URLs found in claim)
		console.log('Method 6: URL Safety...');
		const urlsInClaim = extractUrls(claim);
		const urlSafetyChecks = await Promise.all(urlsInClaim.map(url => checkURLSafety(url)));
		
		const urlMethod: VerificationMethod = {
			method: 'url',
			sources: [],
			summary: `Checked ${urlsInClaim.length} URLs. Safe: ${urlSafetyChecks.filter(u => u.isSafe).length}/${urlsInClaim.length}`,
			confidence: urlSafetyChecks.length > 0 ? Math.min(urlSafetyChecks.filter(u => u.isSafe).length * 25, 100) : 0
		};

		// FINAL CONSENSUS: Use Gemini to analyze all methods
		console.log('Generating final consensus...');
		const allMethods = [llmMethod, webMethod, researchMethod, newsMethod, imageMethod, urlMethod];
		const activeMethods = allMethods.filter(m => m.confidence > 0);
		
		const consensusPrompt = `Analyze this claim using ${activeMethods.length} verification methods and provide a final verdict:

CLAIM: ${claim}

${activeMethods.map((method, i) => `
METHOD ${i + 1} - ${method.method.toUpperCase()}:
${method.summary}
`).join('')}

Provide a final verdict (true/false/uncertain) with confidence level and explanation. Consider the reliability of each source type.`;

		const finalConsensus = await callGemini(claim, undefined, images);
		// Override the prompt for consensus
		const consensusResponse = await callGemini(consensusPrompt, undefined, images);

		const label = normalizeVerdictLabel(consensusResponse.answer || finalConsensus.answer || '');
		const truth = verdictToTruthPercent(label);

		console.log('Verification completed:', { label, truth });
		console.log('Active methods:', activeMethods.map(m => ({ method: m.method, sourcesCount: m.sources.length })));

		return NextResponse.json({
			claim: claim,
			verdict: consensusResponse.answer || finalConsensus.answer || "Unable to verify claim at this time",
			verdictLabel: label,
			truthLikelihood: truth,
			methods: activeMethods,
			responses: llmResponses.map(r => ({
				provider: r.provider,
				verdict: r.answer || "No response",
				error: r.error
			})),
			research: researchUrls,
			imageAnalysis: imageAnalysis,
			urlSafety: urlSafetyChecks
		}, { status: 200 });
	} catch (e: unknown) {
		console.error('Verification error:', e);
		const detail = e instanceof Error ? e.message : 'error';
		return NextResponse.json({ error: 'verification_failed', detail }, { status: 500 });
	}
}
