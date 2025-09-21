"use client";
import { useState, useRef, useEffect } from "react";
import type { ClipboardEvent } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { Search, Shield, CheckCircle, ExternalLink, Sparkles, X } from "lucide-react";

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
    metadata?: any;
    deepfakeScore?: number;
  };
  urlSafety?: Array<{
    isSafe: boolean;
    threats: string[];
    reputation: 'good' | 'suspicious' | 'malicious';
    archiveLinks: string[];
  }>;
};

type ImageData = { mimeType: string; data: string };


function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadingStages = [
    {
      title: "Initializing Deep Analysis",
      description: "Setting up multi-model verification system",
      icon: "🔧",
      duration: 2000
    },
    {
      title: "AI Model Analysis",
      description: "Querying OpenAI, Gemini, Perplexity & Grok for insights",
      icon: "🤖",
      duration: 4000
    },
    {
      title: "Web Source Discovery",
      description: "Scanning government sites, news outlets & fact-checkers",
      icon: "🌐",
      duration: 3000
    },
    {
      title: "Content Extraction",
      description: "Scraping authoritative sources for evidence",
      icon: "📄",
      duration: 3000
    },
    {
      title: "Research Paper Search",
      description: "Searching Google Scholar, PubMed & ArXiv databases",
      icon: "📚",
      duration: 4000
    },
    {
      title: "News Source Verification",
      description: "Checking latest news articles and reports",
      icon: "📰",
      duration: 3000
    },
    {
      title: "Image Analysis",
      description: "Reverse image search and deepfake detection",
      icon: "🖼️",
      duration: 3000
    },
    {
      title: "URL Safety Check",
      description: "Verifying link safety and archive availability",
      icon: "🔗",
      duration: 2000
    },
    {
      title: "Cross-Reference Analysis",
      description: "Comparing findings across all verification methods",
      icon: "🔍",
      duration: 3000
    },
    {
      title: "Final Consensus",
      description: "Generating comprehensive verdict with confidence scoring",
      icon: "⚖️",
      duration: 2000
    }
  ];

  async function verify() {
    setLoading(true);
    setLoadingStage(0);
    setResult(null);

    // Scroll to loading section immediately
    requestAnimationFrame(() => {
      const loadingSection = document.querySelector('[data-loading-section]');
      if (loadingSection) {
        loadingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Simulate loading stages
    const stageInterval = setInterval(() => {
      setLoadingStage(prev => {
        if (prev < loadingStages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: text, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verification failed");

      // Ensure we show the final stage
      setLoadingStage(loadingStages.length - 1);

      // Small delay to show final stage
      await new Promise(resolve => setTimeout(resolve, 1000));

      setResult(data);
      // Smooth scroll to results
      requestAnimationFrame(() => {
        if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      toast.success("Verification completed");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Verification failed";
      toast.error(message);
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
      setLoadingStage(0);
    }
  }

  function handleFiles(fileList: FileList | undefined) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1] || '';
        setImages((prev) => [...prev, { mimeType: file.type || 'image/*', data: base64 }]);
        setPreviews((prev) => [...prev, dataUrl]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          e.preventDefault();
          handleFiles({ 0: file, length: 1, item: () => file } as unknown as FileList);
          break;
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "white",
            color: "#111",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
          },
          success: { iconTheme: { primary: "#111", secondary: "#fff" } },
          error: { iconTheme: { primary: "#111", secondary: "#fff" } },
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="px-6">
          <div className="max-w-4xl mx-auto h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">TruthLens</span>
            </div>
            <nav className="hidden sm:flex items-center gap-6 text-sm text-black/60">
              <a className="relative hover:text-black transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full" href="#features">Features</a>
              <a className="relative hover:text-black transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full" href="#how">How it works</a>
            </nav>
          </div>
        </div>
        <div className="px-6 pb-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-black/60">Verify claims with a clean, high‑contrast interface.</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto p-6 flex flex-col gap-8">
        {/* Input Section */}
        <section className="relative">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-black rounded-lg">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold">Verify Claim</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium" htmlFor="input">
                Enter a factual claim to verify using multiple AI models
              </label>
              {previews.length > 0 && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-black/10 shadow-sm">
                      <Image src={src} alt={`Attached ${idx + 1}`} fill sizes="64px" className="object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImages((p) => p.filter((_, i) => i !== idx)); setPreviews((p) => p.filter((_, i) => i !== idx)); }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs hover:bg-black/80"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <textarea
                  id="input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!loading && text.trim().length > 0) {
                        verify();
                      }
                    }
                  }}
                  placeholder="e.g., The James Webb Space Telescope detected CO₂ on WASP-39b..."
                  className="w-full min-h-[180px] rounded-xl border-2 border-black/10 bg-white p-4 focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black transition-all duration-200 resize-none"
                />
              </div>

              {/* Input toolbar */}
              <div className="flex items-center justify-between gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-black/20 rounded-lg text-xs font-medium cursor-pointer hover:bg-black/5 transition-colors">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files || undefined)} />
                    <span>{previews.length > 0 ? 'Add more' : '+ Attach image'}</span>
                  </label>
                  {previews.length > 0 && (
                    <button type="button" onClick={() => { setImages([]); setPreviews([]); }} className="text-xs text-black/60 hover:underline">
                      Remove all
                    </button>
                  )}
                </div>
                <div className="text-xs text-black/50">{text.length} chars · Press Enter to verify</div>
              </div>

              {/* Example chips */}
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  'Does COVID-19 vaccine alters DNA?',
                  'Does JWST found life on exoplanet?',
                  'Does 5G causes cancer?'
                ].map((ex, i) => (
                  <button key={i} type="button" onClick={() => setText(ex)} className="px-2.5 py-1 rounded-full border border-black/15 text-xs text-black/60 hover:bg-black/5">
                    {ex}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={verify}
                  disabled={loading || text.trim().length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer hover:scale-110 hover:bg-black/90 transition-all duration-200 shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Verify Claim
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setText(''); setResult(null); }}
                  className="px-6 py-3 border-2 border-black/20 text-black rounded-xl font-medium hover:cursor-pointer hover:bg-black/5 transition-all duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Loading Animation */}
        {loading && (
          <section data-loading-section className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/10">
              {/* User's Claim Display */}
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-900 mb-2">Verifying Your Claim</h4>
                    <p className="text-gray-700 font-medium leading-relaxed">{text}</p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-6">
                {/* Main Loading Animation */}
                <div className="relative">
                  <div className="w-24 h-24 mx-auto relative">
                    {/* Outer rotating ring */}
                    <div className="absolute inset-0 border-4 border-black/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>

                    {/* Inner pulsing circle */}
                    <div className="absolute inset-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>

                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                {/* Current Stage Display */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {loadingStages[loadingStage]?.title || "Analyzing..."}
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto font-medium">
                    {loadingStages[loadingStage]?.description || "Processing your request..."}
                  </p>

                  {/* Stage Icon */}
                  <div className="text-5xl">
                    {loadingStages[loadingStage]?.icon || "🔍"}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-semibold text-gray-700">
                    <span>Deep Analysis Progress</span>
                    <span>{isClient ? Math.round(((loadingStage + 1) / loadingStages.length) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
                      style={{ width: isClient ? `${Math.min(((loadingStage + 1) / loadingStages.length) * 100, 100)}%` : '0%' }}
                    ></div>
                  </div>
                </div>

                {/* Stage Indicators */}
                <div className="flex justify-center gap-2">
                  {loadingStages.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${isClient && index <= loadingStage
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                        : 'bg-black/20'
                        }`}
                    />
                  ))}
                </div>

                {/* Analysis Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                  <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-3xl mb-3">🤖</div>
                    <h4 className="font-bold text-lg text-blue-900 mb-2">AI Analysis</h4>
                    <p className="text-sm text-blue-700 font-medium">Multiple AI models cross-referencing</p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-3xl mb-3">🌐</div>
                    <h4 className="font-bold text-lg text-green-900 mb-2">Web Sources</h4>
                    <p className="text-sm text-green-700 font-medium">Authoritative websites & news</p>
                  </div>
                  <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="text-3xl mb-3">📚</div>
                    <h4 className="font-bold text-lg text-purple-900 mb-2">Research Papers</h4>
                    <p className="text-sm text-purple-700 font-medium">Academic & scientific sources</p>
                  </div>
                  <div className="p-6 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="text-3xl mb-3">📰</div>
                    <h4 className="font-bold text-lg text-orange-900 mb-2">News Sources</h4>
                    <p className="text-sm text-orange-700 font-medium">Latest news & reports</p>
                  </div>
                  <div className="p-6 bg-pink-50 rounded-xl border border-pink-100">
                    <div className="text-3xl mb-3">🖼️</div>
                    <h4 className="font-bold text-lg text-pink-900 mb-2">Image Analysis</h4>
                    <p className="text-sm text-pink-700 font-medium">Reverse search & deepfake detection</p>
                  </div>
                  <div className="p-6 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="text-3xl mb-3">🔗</div>
                    <h4 className="font-bold text-lg text-indigo-900 mb-2">URL Safety</h4>
                    <p className="text-sm text-indigo-700 font-medium">Link verification & archives</p>
                  </div>
                </div>

                {/* Status Message */}
                <div className="text-sm text-gray-600 font-medium italic">
                  "Analyzing sources across multiple databases..."
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {result && (
          <section ref={resultRef} className="space-y-6">
            {/* Verdict */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-black/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-black rounded-lg">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold">Verification Result</h3>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-6 items-center p-4 bg-black/5 rounded-xl">
                  {/* Circular truth score */}
                  <div className="flex items-center justify-center">
                    {(() => {
                      const pct = typeof result.truthLikelihood === 'number' ? Math.min(Math.max(result.truthLikelihood, 0), 100) : 50;
                      const size = 120;
                      const stroke = 10;
                      const radius = (size - stroke) / 2;
                      const circumference = 2 * Math.PI * radius;
                      const offset = circumference - (pct / 100) * circumference;
                      const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#dc2626';
                      return (
                        <div className="relative" style={{ width: size, height: size }}>
                          <svg width={size} height={size} className="rotate-[-90deg]">
                            <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={radius}
                              stroke={color}
                              strokeWidth={stroke}
                              strokeLinecap="round"
                              fill="none"
                              strokeDasharray={circumference}
                              strokeDashoffset={offset}
                              style={{ transition: 'stroke-dashoffset 1s ease' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold" style={{ color }}>{pct}%</div>
                              <div className="text-xs text-black/60">truth score</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Verdict tags and summary */}
                  <div className="md:col-span-2">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full border border-black/20 text-xs font-semibold tracking-wide">
                        {result.verdictLabel === 'true' && 'TRUTH'}
                        {result.verdictLabel === 'false' && 'BLUFF'}
                        {(!result.verdictLabel || result.verdictLabel === 'uncertain') && 'UNCERTAIN'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-black text-white text-xs font-medium">
                        {result.verdictLabel === 'true' && 'Truth Bomb'}
                        {result.verdictLabel === 'false' && 'Lies as hell'}
                        {(!result.verdictLabel || result.verdictLabel === 'uncertain') && 'Could go either way'}
                      </span>
                    </div>
                    <p className="text-black/90 font-medium">
                      {result.verdictLabel === 'true' && (
                        <>Yes — likely true{typeof result.truthLikelihood === 'number' ? ` (${result.truthLikelihood}%)` : ''}</>
                      )}
                      {result.verdictLabel === 'false' && (
                        <>No — likely false{typeof result.truthLikelihood === 'number' ? ` (${result.truthLikelihood}%)` : ''}</>
                      )}
                      {(!result.verdictLabel || result.verdictLabel === 'uncertain') && (
                        <>Uncertain{typeof result.truthLikelihood === 'number' ? ` (${result.truthLikelihood}%)` : ''}</>
                      )}
                    </p>
                    <p className="text-black/60 mt-2 whitespace-pre-wrap">{cleanText(result.verdict)}</p>
                  </div>
                </div>

                {/* 3-Method Verification Results */}
                {result.methods && result.methods.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold">Multi-Method Verification Analysis</h4>
                    </div>

                    <div className="grid gap-6">
                      {result.methods.map((method, i) => (
                        <div key={i} className="p-6 border border-black/10 rounded-2xl bg-gradient-to-br from-white to-gray-50/50 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"></div>
                              <div>
                                <h5 className="font-semibold text-lg">
                                  {method.method === 'llm' && '🤖 AI Model Analysis'}
                                  {method.method === 'web' && '🌐 Web Source Verification'}
                                  {method.method === 'research' && '📚 Academic Research Papers'}
                                  {method.method === 'news' && '📰 News Source Verification'}
                                  {method.method === 'image' && '🖼️ Image Analysis'}
                                  {method.method === 'url' && '🔗 URL Safety Check'}
                                </h5>
                                <p className="text-sm text-black/60 mt-1">
                                  {method.method === 'llm' && 'Advanced AI models analyzing claim validity'}
                                  {method.method === 'web' && 'Authoritative websites and news sources'}
                                  {method.method === 'research' && 'Peer-reviewed academic publications'}
                                  {method.method === 'news' && 'Latest news articles and reports'}
                                  {method.method === 'image' && 'Reverse image search and deepfake detection'}
                                  {method.method === 'url' && 'Link safety verification and archive checking'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-2xl font-bold text-black">{method.confidence}%</div>
                                <div className="text-xs text-black/60">Confidence</div>
                              </div>
                              <div className="w-20 h-3 bg-black/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-out"
                                  style={{ width: `${method.confidence}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Sources Display */}
                          {method.sources.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h6 className="font-medium text-black/80">
                                  {method.sources.length} Source{method.sources.length !== 1 ? 's' : ''} Found
                                </h6>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-xs text-green-600 font-medium">Verified Sources</span>
                                </div>
                              </div>

                              <div className="grid gap-4 max-h-96 overflow-y-auto pr-2">
                                {method.sources.map((source, j) => (
                                  <div key={j} className="group p-4 bg-white border border-black/5 rounded-xl hover:border-black/20 hover:shadow-md transition-all duration-200">
                                    {method.method === 'web' ? (
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <h6 className="font-semibold text-black group-hover:text-blue-600 transition-colors line-clamp-2">
                                              {cleanText((source as WebSource).title)}
                                            </h6>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-sm text-black/60">{(source as WebSource).domain}</span>
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${(source as WebSource).reliability === 'high' ? 'bg-green-100 text-green-700' :
                                                (source as WebSource).reliability === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-gray-100 text-gray-700'
                                                }`}>
                                                {(source as WebSource).reliability} reliability
                                              </span>
                                            </div>
                                          </div>
                                          <a
                                            href={(source as WebSource).url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            View
                                          </a>
                                        </div>
                                        <p className="text-sm text-black/70 line-clamp-3">
                                          {cleanText((source as WebSource).content)}
                                        </p>
                                      </div>
                                    ) : method.method === 'news' ? (
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <h6 className="font-semibold text-black group-hover:text-blue-600 transition-colors line-clamp-2">
                                              {cleanText((source as NewsSource).title)}
                                            </h6>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-sm text-black/60">{(source as NewsSource).source}</span>
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${(source as NewsSource).reliability === 'high' ? 'bg-green-100 text-green-700' :
                                                (source as NewsSource).reliability === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                  'bg-gray-100 text-gray-700'
                                                }`}>
                                                {(source as NewsSource).reliability} reliability
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-xs text-black/50">
                                                {new Date((source as NewsSource).publishedAt).toLocaleDateString()}
                                              </span>
                                              {(source as NewsSource).author && (
                                                <span className="text-xs text-black/50">• {(source as NewsSource).author}</span>
                                              )}
                                            </div>
                                          </div>
                                          <a
                                            href={(source as NewsSource).url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            Read Article
                                          </a>
                                        </div>
                                        <p className="text-sm text-black/70 line-clamp-3">
                                          {cleanText((source as NewsSource).description)}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <h6 className="font-semibold text-black group-hover:text-blue-600 transition-colors line-clamp-2">
                                              {cleanText((source as ResearchSource).title)}
                                            </h6>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-sm text-black/60">
                                                {(source as ResearchSource).authors.slice(0, 3).join(', ')}
                                                {(source as ResearchSource).authors.length > 3 && ' et al.'}
                                              </span>
                                              {(source as ResearchSource).year && (
                                                <span className="text-sm text-black/60">• {(source as ResearchSource).year}</span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                {(source as ResearchSource).source}
                                              </span>
                                              {(source as ResearchSource).journal && (
                                                <span className="text-xs text-black/60 italic">
                                                  {(source as ResearchSource).journal}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <a
                                            href={(source as ResearchSource).url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                            Read Paper
                                          </a>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                          <p className="text-sm text-black/70 line-clamp-4">
                                            {cleanText((source as ResearchSource).abstract)}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {method.sources.length === 0 && (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">
                                  {method.method === 'llm' && '🤖'}
                                  {method.method === 'web' && '🌐'}
                                  {method.method === 'research' && '📚'}
                                </span>
                              </div>
                              <p className="text-black/50 font-medium">No sources found for this method</p>
                              <p className="text-sm text-black/40 mt-1">Try a different claim or check your API keys</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-medium">Individual Model Responses</h4>
                  <div className="grid gap-3">
                    {result.responses.map((response, i) => (
                      <div key={i} className="p-3 border border-black/10 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{response.provider}</span>
                          {response.error && (
                            <span className="text-xs text-red-600">Error</span>
                          )}
                        </div>
                        <p className="text-sm text-black/70">
                          {response.error ? `Error: ${response.error}` : cleanText(response.verdict)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authorized Website Analysis */}
                {(() => {
                  const webMethod = result.methods?.find(m => m.method === 'web');
                  const webSources = webMethod?.sources;
                  return webSources && webSources.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">What Authorized Websites Say</h4>
                      </div>
                      <div className="grid gap-4">
                        {webSources.map((source, i) => {
                          const webSource = source as WebSource;
                          return (
                            <div key={i} className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                                      {webSource.reliability === 'high' ? 'HIGH AUTHORITY' :
                                        webSource.reliability === 'medium' ? 'MEDIUM AUTHORITY' : 'LOW AUTHORITY'}
                                    </span>
                                    <span className="text-sm text-gray-600 font-medium">{webSource.domain}</span>
                                  </div>
                                  <h5 className="font-bold text-lg text-gray-900 mb-2">{cleanText(webSource.title)}</h5>
                                </div>
                                <a
                                  href={webSource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Visit Source
                                </a>
                              </div>

                              <div className="bg-white p-4 rounded-lg border border-green-100">
                                <h6 className="font-semibold text-gray-800 mb-2">What this website says:</h6>
                                <p className="text-gray-700 leading-relaxed">
                                  {cleanText(webSource.content)}
                                  {webSource.content.length >= 1000 && '...'}
                                </p>
                              </div>

                              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-medium">Source Type:</span>
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                  {webSource.domain.includes('.gov') ? 'Government Official' :
                                    webSource.domain.includes('.edu') ? 'Educational Institution' :
                                      webSource.domain.includes('nasa.gov') ? 'NASA Official' :
                                        webSource.domain.includes('who.int') ? 'WHO Official' :
                                          webSource.domain.includes('cdc.gov') ? 'CDC Official' :
                                            webSource.domain.includes('reuters.com') ? 'Reuters News' :
                                              webSource.domain.includes('bbc.com') ? 'BBC News' :
                                                webSource.domain.includes('ap.org') ? 'Associated Press' :
                                                  webSource.domain.includes('snopes.com') ? 'Snopes Fact-Check' :
                                                    webSource.domain.includes('factcheck.org') ? 'FactCheck.org' :
                                                      'News Source'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {result.research && result.research.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Deep Research Links</h4>
                    <div className="grid gap-2">
                      {result.research.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-black/70 hover:text-black">
                          <ExternalLink className="w-4 h-4" />
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      {/* Footer */}
      <footer className="mt-8 border-t border-black/10">
        <div className="max-w-4xl mx-auto px-6 py-6 text-sm text-black/60 flex items-center justify-between">
          <span>© {new Date().getFullYear()} TruthLens</span>
          <div className="flex items-center gap-4">
            <a className="relative hover:text-black transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full" href="#privacy">Privacy</a>
            <a className="relative hover:text-black transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full" href="#terms">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
