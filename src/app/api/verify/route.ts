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
	} catch (e: any) {
		return { provider: 'openai', answer: '', latencyMs: Date.now() - start, error: e && e.message ? e.message : 'error' };
	}
}

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


		const parts: any[] = [ { text: prompt } ];
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
	} catch (e: any) {
		console.error('Gemini error:', e);
		return { provider: 'gemini', answer: '', latencyMs: Date.now() - start, error: e && e.message ? e.message : 'error' };
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
	} catch (e: any) {
		return { provider: 'perplexity', answer: '', latencyMs: Date.now() - start, error: e && e.message ? e.message : 'error' };
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
	} catch (e: any) {
		return { provider: 'grok', answer: '', latencyMs: Date.now() - start, error: e && e.message ? e.message : 'error' };
	}
}

// --- Deep research helpers ---
function extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]*)?/gi;
    const found = (text || '').match(urlRegex) || [];
    const unique = Array.from(new Set(found.map(u => u.replace(/[).,]+$/g, ''))));
    return unique.slice(0, 12);
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

    const calls = bodies.map(b => withTimeout(fetch('https://api.perplexity.ai/chat/completions', { method: 'POST', headers, body: JSON.stringify(b) }), 30000)
        .then(r => r.json()).catch(() => null));
    const results = await Promise.all(calls);
    const texts = results.map(d => d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content ? String(d.choices[0].message.content) : '').join('\n');
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
			images = parsed.images
				.map((im: any) => im && im.data && im.mimeType ? { mimeType: String(im.mimeType), data: String(im.data) } as ImagePart : null)
				.filter(Boolean) as ImagePart[];
		} else if (parsed?.image && parsed.image.data && parsed.image.mimeType) {
			images = [ { mimeType: String(parsed.image.mimeType), data: String(parsed.image.data) } ];
		}
		if (!claim) {
			return NextResponse.json({ error: 'claim is required' }, { status: 400 });
		}

		console.log('Verifying claim:', claim);

		// Get responses from all APIs
		const responses = await Promise.all([
			callOpenAI(claim),
			callPerplexity(claim),
			callGrok(claim),
			callGemini(claim, undefined, images)
		]);

		console.log('All responses:', responses);

		// Filter out failed responses but keep track of all responses
		const validResponses = responses.filter(r => r.answer && !r.error);
		
		let finalVerdict = { answer: '' };
		
		// If we have multiple valid responses, use Gemini for consensus
		if (validResponses.length > 1) {
			console.log('Getting consensus from Gemini...');
			finalVerdict = await callGemini(claim, validResponses, images);
		} else if (validResponses.length === 1) {
			// If only one valid response, use it directly
			finalVerdict = validResponses[0];
		} else {
			// If no valid responses, try to use any response that has an answer
			finalVerdict = responses.find(r => r.answer) || { answer: "Unable to verify claim - no API keys configured" };
		}

		console.log('Final verdict:', finalVerdict);

		const label = normalizeVerdictLabel(finalVerdict.answer || '');
		const truth = verdictToTruthPercent(label);

		// Deep research links
		const researchLinks = await researchWithPerplexity(claim).catch(() => []);

		return NextResponse.json({
			claim: claim,
			verdict: finalVerdict.answer || "Unable to verify claim at this time",
			verdictLabel: label,
			truthLikelihood: truth,
			responses: responses.map(r => ({
				provider: r.provider,
				verdict: r.answer || "No response",
				error: r.error
			})),
			research: researchLinks
		}, { status: 200 });
	} catch (e: any) {
		console.error('Verification error:', e);
		return NextResponse.json({ error: 'verification_failed', detail: e && e.message ? e.message : 'error' }, { status: 500 });
	}
}
