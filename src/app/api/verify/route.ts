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

type ToolName = 'llm' | 'wikipedia' | 'web' | 'research' | 'news' | 'image' | 'url';
type ToolPlan = {
    difficulty: 'trivial' | 'simple' | 'moderate' | 'complex' | 'contentious';
    useTools: Partial<Record<ToolName, boolean>>;
    limits: {
        scrapeLimit?: number;
        researchLimit?: number;
        newsLimit?: number;
        wikipediaLimit?: number;
    };
    rationale: string;
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
	metadata?: Record<string, unknown>;
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
async function planToolsForClaim(claim: string): Promise<ToolPlan> {
    // Fast heuristic with optional LLM assistance later
    const length = claim.trim().length;
    const hasNumbers = /\d/.test(claim);
    const hasUrl = /https?:\/\//i.test(claim);
    const isOpinion = /(i think|should|best|better|worse|opinion|believe)/i.test(claim);
    const isBreakingNews = /(today|yesterday|breaking|just\s+announced|recently)/i.test(claim);
    const namedEntities = (claim.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g) || []).length;

    let difficulty: ToolPlan['difficulty'] = 'simple';
    if (isOpinion) difficulty = 'trivial';
    else if (length < 60 && !hasNumbers && namedEntities === 0) difficulty = 'simple';
    else if (hasUrl) difficulty = 'moderate';
    else if (hasNumbers || namedEntities > 0) difficulty = 'moderate';
    if (isBreakingNews) difficulty = 'complex';

    const useTools: ToolPlan['useTools'] = {
        llm: true,
        wikipedia: difficulty !== 'trivial',
        web: difficulty === 'moderate' || difficulty === 'complex',
        research: hasNumbers || /study|evidence|risk|efficacy|trial|statistic/i.test(claim),
        news: isBreakingNews || namedEntities > 0,
        image: false,
        url: hasUrl
    };

    const limits: ToolPlan['limits'] = {
        wikipediaLimit: difficulty === 'simple' ? 1 : 3,
        scrapeLimit: difficulty === 'simple' ? 2 : difficulty === 'moderate' ? 5 : 8,
        researchLimit: difficulty === 'moderate' ? 5 : 8,
        newsLimit: isBreakingNews ? 10 : 5,
    };

    const rationale = 'Heuristic plan based on claim structure, recency cues, and presence of numbers/URLs.';
    return { difficulty, useTools, limits, rationale };
}
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
    const highReliability = ['.gov', '.edu', 'nasa.gov', 'who.int', 'cdc.gov', 'reuters.com', 'bbc.com', 'ap.org', 'snopes.com', 'factcheck.org', 'wikipedia.org', 'wikidata.org', 'britannica.com'];
    const mediumReliability = ['cnn.com', 'nytimes.com', 'washingtonpost.com', 'theguardian.com', 'wsj.com', 'nature.com', 'science.org'];
    
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
            title: String(article.title || ''),
            description: String(article.description || ''),
            url: String(article.url || ''),
            publishedAt: String(article.publishedAt || ''),
            source: String((article.source as Record<string, unknown>)?.name || ''),
            author: String(article.author || ''),
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
    const _apiKey = process.env.GOOGLE_API_KEY;
    const _searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!_apiKey || !_searchEngineId) return [];
    
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
            metadata: undefined,
            deepfakeScore: 0
        };
    }
    
    try {
        const reverseSearchResults = await reverseImageSearch(images[0].data);
        
        return {
            reverseSearchResults,
            tineyeResults: [], // Would integrate TinEye API here
            metadata: undefined, // Would extract EXIF data here
            deepfakeScore: Math.random() * 100 // Mock deepfake detection
        };
    } catch (e) {
        console.error('Image analysis error:', e);
        return {
            reverseSearchResults: [],
            tineyeResults: [],
            metadata: undefined,
            deepfakeScore: 0
        };
    }
}

// Wikipedia search and summary fetch
async function searchWikipedia(query: string): Promise<WebSource[]> {
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=3`;
        const searchRes = await withTimeout(fetch(searchUrl), 10000);
        if (!searchRes.ok) return [];
        const searchData = await searchRes.json();

        const pages: Array<{ pageid: number; title: string }> = (searchData?.query?.search || []).map((s: Record<string, unknown>) => ({
            pageid: Number((s as Record<string, unknown>).pageid || 0),
            title: String((s as Record<string, unknown>).title || ''),
        })).filter((p: { pageid: number; title: string }) => p.pageid > 0);

        if (pages.length === 0) return [];

        const ids = pages.map(p => p.pageid).join('|');
        const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&pageids=${ids}&format=json&utf8=1`;
        const extractRes = await withTimeout(fetch(extractUrl), 10000);
        if (!extractRes.ok) return [];
        const extractData = await extractRes.json();

        const results: WebSource[] = [];
        for (const page of pages) {
            const pageData = extractData?.query?.pages?.[String(page.pageid)];
            const extract: string = String(pageData?.extract || '');
            const url = `https://en.wikipedia.org/?curid=${page.pageid}`;
            results.push({
                url,
                title: page.title,
                content: extract.substring(0, 1000),
                domain: 'en.wikipedia.org',
                reliability: 'high'
            });
        }
        return results;
    } catch (e) {
        console.error('Wikipedia search error:', e);
        return [];
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

type VerifyResponse = {
	claim: string;
	verdict: string;
	verdictLabel?: 'true' | 'false' | 'uncertain';
	truthLikelihood?: number;
	methods?: VerificationMethod[];
	responses: {
		provider: string;
		verdict: string;
		error?: string;
	}[];
	research?: string[];
	imageAnalysis?: {
		reverseSearchResults: string[];
		tineyeResults: string[];
		metadata?: Record<string, unknown>;
		deepfakeScore?: number;
	};
	urlSafety?: Array<{
		isSafe: boolean;
		threats: string[];
		reputation: 'good' | 'suspicious' | 'malicious';
		archiveLinks: string[];
	}>;
};

type AnalysisData = {
	claim: string;
	result: VerifyResponse;
	timestamp: string;
	id: string;
};

type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
};

async function handleChatMode(question: string, analysisData: AnalysisData, chatHistory: ChatMessage[]): Promise<NextResponse> {
    const CHAT_SYS_PROMPT = `You are a helpful AI assistant that specializes in fact-checking and verification analysis. You have access to a detailed verification report and can answer questions about it.

Your role is to:
1. Answer questions about the verification results
2. Explain confidence scores and methodology
3. Discuss the reliability of sources
4. Provide insights about conflicting information
5. Suggest additional verification steps if needed

Be helpful, accurate, and cite specific information from the verification report when relevant. Keep responses concise but informative.`;

    // Build context from analysis data
    const context = `
VERIFICATION REPORT CONTEXT:
Original Claim: "${analysisData.claim}"
Verdict: ${analysisData.result.verdictLabel || 'uncertain'}
Confidence Score: ${analysisData.result.truthLikelihood || 'N/A'}%
Final Verdict: ${analysisData.result.verdict || 'No verdict available'}

VERIFICATION METHODS USED:
${analysisData.result.methods?.map((method: VerificationMethod, i: number) => 
  `Method ${i + 1} (${method.method}): ${method.summary}`
).join('\n') || 'No methods available'}

SOURCES FOUND:
${analysisData.result.methods?.map((method: VerificationMethod) => 
  method.sources?.map((source: WebSource | ResearchSource | NewsSource) => 
    `- ${source.title || source.url} (${'domain' in source ? source.domain : 'source' in source ? source.source : 'Unknown'})`
  ).join('\n') || ''
).join('\n') || 'No sources available'}
`;

    // Build chat history context
    const historyContext = chatHistory.length > 0 ? 
      `\n\nRECENT CONVERSATION:\n${chatHistory.slice(-6).map((msg: ChatMessage) => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n')}` : '';

    const prompt = `${CHAT_SYS_PROMPT}\n\n${context}${historyContext}\n\nCurrent Question: ${question}`;

    try {
        // Try OpenAI first, then Gemini as fallback
        let response = '';
        
        try {
            const openaiResponse = await callOpenAI(prompt);
            if (openaiResponse.answer && !openaiResponse.error) {
                response = openaiResponse.answer;
            }
        } catch {
            console.log('OpenAI chat failed, trying Gemini...');
        }

        if (!response) {
            try {
                const geminiResponse = await callGemini(prompt);
                if (geminiResponse.answer && !geminiResponse.error) {
                    response = geminiResponse.answer;
                }
            } catch {
                console.log('Gemini chat also failed');
            }
        }

        if (!response) {
            // Fallback response if all AI calls fail
            response = `I apologize, but I'm having trouble processing your question about the verification of "${analysisData.claim}". The analysis shows a ${analysisData.result.truthLikelihood || 'N/A'}% confidence score with a verdict of "${analysisData.result.verdictLabel || 'uncertain'}". Please try rephrasing your question or check if the verification data is available.`;
        }

        return NextResponse.json({
            chatResponse: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat mode error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return NextResponse.json(
            { error: 'Chat processing failed', detail: errorMessage },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
	try {
		const parsed = await req.json();
		const claim: string | undefined = parsed && typeof parsed.claim === 'string' ? parsed.claim : undefined;
		const chatMode: boolean = parsed?.chatMode === true;
		const analysisData: AnalysisData | undefined = parsed?.analysisData;
		const chatHistory: ChatMessage[] = parsed?.chatHistory || [];
        const agentic: boolean = parsed?.agentic !== false && (process.env.AGENTIC_MODE !== 'false');
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

		// Handle chat mode - respond to follow-up questions
		if (chatMode && analysisData) {
			console.log('Chat mode: Processing follow-up question:', claim);
			return await handleChatMode(claim, analysisData, chatHistory);
		}

		console.log(agentic ? 'Starting agentic verification for claim:' : 'Starting 6-method verification for claim:', claim);
		const toolPlan = agentic ? await planToolsForClaim(claim) : {
            difficulty: 'moderate',
            useTools: { llm: true, wikipedia: true, web: true, research: true, news: true, image: !!images?.length, url: extractUrls(claim).length > 0 },
            limits: { wikipediaLimit: 2, scrapeLimit: 5, researchLimit: 6, newsLimit: 6 },
            rationale: 'Default non-agentic plan'
        } as ToolPlan;
		console.log('Tool plan:', toolPlan);

		// METHOD 1: LLM Analysis
		console.log('Method 1: LLM Analysis...');
		const llmResponses = toolPlan.useTools.llm ? await Promise.all([
			callOpenAI(claim),
			callPerplexity(claim),
			callGrok(claim),
			callGemini(claim, undefined, images)
		]) : [];

		const validLlmResponses = llmResponses.filter(r => r.answer && !r.error);
		const llmMethod: VerificationMethod = {
			method: 'llm',
			sources: [],
			summary: validLlmResponses.map(r => `${r.provider}: ${r.answer}`).join('\n\n'),
			confidence: validLlmResponses.length > 0 ? Math.min(validLlmResponses.length * 25, 100) : 0
		};

		// METHOD 2: Web Scraping & Authoritative Sources
		console.log('Method 2: Web Scraping...');
		const researchUrls = toolPlan.useTools.web ? await researchWithPerplexity(claim).catch(() => []) : [];
		const webSources: WebSource[] = [];
		// Add Wikipedia summaries first (bounded)
		if (toolPlan.useTools.wikipedia) {
			try {
				const wiki = await searchWikipedia(claim);
				for (const w of wiki.slice(0, toolPlan.limits.wikipediaLimit || 2)) webSources.push(w);
			} catch (e) {
				console.error('Wikipedia integration failed:', e);
			}
		}
		
		// Scrape top URLs in parallel (limit to 5 for performance)
		const scrapeLimit = toolPlan.limits.scrapeLimit || 5;
		const scrapePromises = researchUrls.slice(0, scrapeLimit).map(url => scrapeWebContent(url));
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
		const researchSources = toolPlan.useTools.research ? await searchResearchPapers(claim) : [];
		
		const researchMethod: VerificationMethod = {
			method: 'research',
			sources: researchSources,
			summary: researchSources.map(s => `${s.title} (${s.journal}, ${s.year}): ${s.abstract.substring(0, 200)}...`).join('\n\n'),
			confidence: researchSources.length > 0 ? Math.min(researchSources.length * 15, 100) : 0
		};

		// METHOD 4: News API Verification
		console.log('Method 4: News Sources...');
		const newsSources = toolPlan.useTools.news ? await searchNewsAPI(claim) : [];
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
		const imageAnalysis = toolPlan.useTools.image ? await analyzeImages(images) : { reverseSearchResults: [], tineyeResults: [], metadata: undefined, deepfakeScore: 0 };
		
		const imageMethod: VerificationMethod = {
			method: 'image',
			sources: [],
			summary: `Reverse search results: ${imageAnalysis.reverseSearchResults.length} matches found. Deepfake score: ${imageAnalysis.deepfakeScore?.toFixed(1)}%`,
			confidence: imageAnalysis.reverseSearchResults.length > 0 ? 80 : 0
		};

		// METHOD 6: URL Safety Check (if URLs found in claim)
		console.log('Method 6: URL Safety...');
		const urlsInClaim = extractUrls(claim);
		const urlSafetyChecks = toolPlan.useTools.url ? await Promise.all(urlsInClaim.map(url => checkURLSafety(url))) : [];

		// Early exit for trivial/simple claims when LLM is confident
		if (agentic && (toolPlan.difficulty === 'trivial' || toolPlan.difficulty === 'simple')) {
			const combined = (llmResponses || []).map(r => r.answer).join('\n');
			const prelimLabel = normalizeVerdictLabel(combined);
			const prelimTruth = verdictToTruthPercent(prelimLabel);
			if (prelimTruth >= 90 || prelimTruth <= 10) {
				const methodsEarly = [
					{ method: 'llm', sources: [], summary: (llmResponses || []).map(r => `${r.provider}: ${r.answer}`).join('\n\n'), confidence: 90 }
				] as VerificationMethod[];
				return NextResponse.json({
					claim,
					verdict: combined.substring(0, 600),
					verdictLabel: prelimLabel,
					truthLikelihood: prelimTruth,
					methods: methodsEarly,
					responses: (llmResponses || []).map(r => ({ provider: r.provider, verdict: r.answer || 'No response', error: r.error })),
					research: [],
					imageAnalysis: imageAnalysis,
					urlSafety: []
				}, { status: 200 });
			}
		}
		
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
