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

type ImageData = { mimeType: string; data: string };

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};


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
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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

      // Store result in localStorage for chat context
      const analysisData = {
        claim: text,
        result: data,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };
      localStorage.setItem('truthlens_latest_analysis', JSON.stringify(analysisData));

      // Initialize chat with the verification result
      const initialChatMessage: ChatMessage = {
        id: 'initial-' + Date.now(),
        role: 'assistant',
        content: `I've completed the verification of your claim: "${text}". The analysis shows it's ${data.verdictLabel === 'true' ? 'likely true' : data.verdictLabel === 'false' ? 'likely false' : 'uncertain'} with a ${data.truthLikelihood}% confidence score. You can ask me any follow-up questions about this analysis!`,
        timestamp: new Date()
      };
      setChatMessages([initialChatMessage]);

      // Auto-show chat interface after verification
      setTimeout(() => {
        setShowChat(true);
      }, 2000);

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

  async function handleChatSubmit() {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Get stored analysis data
      const storedData = localStorage.getItem('truthlens_latest_analysis');
      if (!storedData) {
        throw new Error('No analysis data found');
      }

      const analysisData = JSON.parse(storedData);

      // Send follow-up question to existing verify API
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: chatInput.trim(),
          chatMode: true,
          analysisData: analysisData,
          chatHistory: chatMessages
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Chat failed");

      const assistantMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: data.chatResponse || data.verdict || "I couldn't process your question.",
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 text-gray-900">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "white",
            color: "#111",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            backdropFilter: "blur(10px)",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">TruthLens</span>
                <p className="text-xs text-gray-500 -mt-1">AI Fact Checker</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-8 text-sm">
              <a className="relative font-medium text-gray-600 hover:text-gray-900 transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-blue-600 after:to-purple-600 after:transition-all hover:after:w-full" href="/features">Features</a>
              <a className="relative font-medium text-gray-600 hover:text-gray-900 transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-blue-600 after:to-purple-600 after:transition-all hover:after:w-full" href="/how-it-works">How it works</a>
              <button
                onClick={() => {
                  const inputSection = document.querySelector('[data-input-section]');
                  if (inputSection) {
                    inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r hover:cursor-pointer from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Get Started
              </button>
            </nav>
            {/* Mobile menu button */}
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-8 mt-6">
            Verify Facts or News with
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              AI Precision
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
            Get instant, multi-source fact verification powered by advanced AI models, authoritative websites, and real-time news analysis.
          </p>
        </div>
      </section>

      {/* Main */}
      <main className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Input Section */}
          <section data-input-section className="relative mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xl border border-gray-200/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Verify Your Claim</h2>
                  <p className="text-gray-600">Enter any statement to get comprehensive fact-checking</p>
                </div>
              </div>

              <div className="space-y-6">
                {previews.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    {previews.map((src, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg group">
                        <Image src={src} alt={`Attached ${idx + 1}`} fill sizes="80px" className="object-cover" />
                        <button
                          type="button"
                          onClick={() => { setImages((p) => p.filter((_, i) => i !== idx)); setPreviews((p) => p.filter((_, i) => i !== idx)); }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
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
                    placeholder="Enter any claim to verify... e.g., 'The James Webb Space Telescope detected CO₂ on WASP-39b'"
                    className="w-full min-h-[150px] rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm p-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-none text-sm leading-relaxed shadow-inner"
                    suppressHydrationWarning
                  />
                  <div className="absolute bottom-4 right-4 text-xs text-gray-400">
                    {text.length} characters
                  </div>
                </div>

                {/* Input toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files || undefined)} />
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{previews.length > 0 ? 'Add more images' : 'Attach images'}</span>
                    </label>
                    {previews.length > 0 && (
                      <button type="button" onClick={() => { setImages([]); setPreviews([]); }} className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline">
                        Remove all
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> to verify
                  </div>
                </div>

                {/* Example chips */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Does COVID-19 vaccine alter DNA?',
                      'Did JWST find life on exoplanets?',
                      'Does 5G cause cancer?'
                    ].map((ex, i) => (
                      <button key={i} type="button" onClick={() => setText(ex)} className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 shadow-sm">
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                  <button
                    onClick={verify}
                    disabled={loading || text.trim().length === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-110 transition-all duration-300 shadow-lg"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Verify Claim</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setText(''); setResult(null); }}
                    className="px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Loading Animation */}
          {loading && (
            <section data-loading-section className="mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xl border border-gray-200/50">
                {/* User's Claim Display */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 rounded-xl border border-blue-200/50 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                      <Search className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-gray-900 mb-3">Verifying Your Claim</h4>
                      <p className="text-gray-700 font-medium leading-relaxed text-lg">{text}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-8">
                  {/* Main Loading Animation */}
                  <div className="relative">
                    <div className="w-32 h-32 mx-auto relative">
                      {/* Outer rotating ring */}
                      <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin"></div>

                      {/* Inner pulsing circle */}
                      <div className="absolute inset-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse shadow-lg"></div>

                      {/* Center icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </div>

                  {/* Current Stage Display */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900">
                      {loadingStages[loadingStage]?.title || "Analyzing..."}
                    </h3>
                    <p className="text-gray-600 max-w-2xl mx-auto font-medium text-lg leading-relaxed">
                      {loadingStages[loadingStage]?.description || "Processing your request..."}
                    </p>

                    {/* Stage Icon */}
                    <div className="text-6xl">
                      {loadingStages[loadingStage]?.icon || "🔍"}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-semibold text-gray-700">
                      <span>Deep Analysis Progress</span>
                      <span className="text-blue-600">{isClient ? Math.round(((loadingStage + 1) / loadingStages.length) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out shadow-lg"
                        style={{ width: isClient ? `${Math.min(((loadingStage + 1) / loadingStages.length) * 100, 100)}%` : '0%' }}
                      ></div>
                    </div>
                  </div>

                  {/* Stage Indicators */}
                  <div className="flex justify-center gap-3">
                    {loadingStages.map((_, index) => (
                      <div
                        key={index}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${isClient && index <= loadingStage
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg'
                          : 'bg-gray-300'
                          }`}
                      />
                    ))}
                  </div>


                  {/* Status Message */}
                  <div className="text-lg text-gray-600 font-medium italic bg-gray-50 px-6 py-4 rounded-2xl border border-gray-200">
                    &ldquo;Analyzing sources across multiple databases...&rdquo;
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Results */}
          {result && (
            <section ref={resultRef} className="space-y-6">
              {/* Verdict */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xl border border-gray-200/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Verification Result</h3>
                    <p className="text-gray-600">Comprehensive analysis completed</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid lg:grid-cols-3 gap-4 items-center p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-lg">
                    {/* Circular truth score */}
                    <div className="flex items-center justify-center">
                      {(() => {
                        const pct = typeof result.truthLikelihood === 'number' ? Math.min(Math.max(result.truthLikelihood, 0), 100) : 50;
                        const size = 100;
                        const stroke = 8;
                        const radius = (size - stroke) / 2;
                        const circumference = 2 * Math.PI * radius;
                        const offset = circumference - (pct / 100) * circumference;
                        const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
                        return (
                          <div className="relative" style={{ width: size, height: size }}>
                            <svg width={size} height={size} className="rotate-[-90deg] drop-shadow-lg">
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
                                <div className="text-sm font-bold" style={{ color }}>{pct}%</div>
                                <div className="text-xs text-gray-600 font-medium">truth score</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Verdict tags and summary */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1.5 rounded-full border-2 border-gray-300 text-sm font-bold tracking-wide bg-white shadow-sm">
                          {result.verdictLabel === 'true' && 'TRUTH'}
                          {result.verdictLabel === 'false' && 'BLUFF'}
                          {(!result.verdictLabel || result.verdictLabel === 'uncertain') && 'UNCERTAIN'}
                        </span>
                        <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold shadow-lg">
                          {result.verdictLabel === 'true' && 'Truth Bomb 💣'}
                          {result.verdictLabel === 'false' && 'Lies as hell 🔥'}
                          {(!result.verdictLabel || result.verdictLabel === 'uncertain') && 'Could go either way 🤔'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-900 font-semibold text-base">
                          {result.verdictLabel === 'true' && (
                            <>✅ Yes — likely true{typeof result.truthLikelihood === 'number' ? ` (${result.truthLikelihood}%)` : ''}</>
                          )}
                          {result.verdictLabel === 'false' && (
                            <>❌ No — likely false{typeof result.truthLikelihood === 'number' ? ` (${result.truthLikelihood}%)` : ''}</>
                          )}
                          {(!result.verdictLabel || result.verdictLabel === 'uncertain') && (
                            <>❓ Uncertain{typeof result.truthLikelihood === 'number' ? ` (${result.truthLikelihood}%)` : ''}</>
                          )}
                        </p>
                        <div className="bg-white/70 backdrop-blur-sm p-3 rounded-xl border border-gray-200">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{cleanText(result.verdict)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3-Method Verification Results */}
                  {result.methods && result.methods.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-sm font-semibold">Multi-Method Verification Analysis</h4>
                      </div>

                      <div className="grid gap-3">
                        {result.methods.map((method, i) => (
                          <div key={i} className="p-4 border border-black/10 rounded-xl bg-gradient-to-br from-white to-gray-50/50 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"></div>
                                <div>
                                  <h5 className="font-semibold text-sm">
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
                                  <div className="text-sm font-bold text-black">{method.confidence}%</div>
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
                                  <span className="text-lg">
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
                          <h4 className="text-sm font-bold text-gray-900">What Authorized Websites Say</h4>
                        </div>
                        <div className="grid gap-2">
                          {webSources.map((source, i) => {
                            const webSource = source as WebSource;
                            return (
                              <div key={i} className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                                        {webSource.reliability === 'high' ? 'HIGH AUTHORITY' :
                                          webSource.reliability === 'medium' ? 'MEDIUM AUTHORITY' : 'LOW AUTHORITY'}
                                      </span>
                                      <span className="text-xs text-gray-600 font-medium">{webSource.domain}</span>
                                    </div>
                                    <h5 className="font-bold text-sm text-gray-900 mb-1">{cleanText(webSource.title)}</h5>
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

          {/* Chat Interface */}
          {result && (
            <section className="mt-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-xl border border-gray-200/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Ask Follow-up Questions</h3>
                      <p className="text-gray-600">Chat with AI about this verification</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                  >
                    {showChat ? 'Hide Chat' : 'Start Chat'}
                  </button>
                </div>

                {showChat && (
                  <div className="space-y-4">
                    {/* Chat Messages */}
                    <div className="h-96 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-2xl ${message.role === 'user'
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                              : 'bg-white border border-gray-200 text-gray-900'
                              }`}
                          >
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 p-3 rounded-2xl">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <span className="text-sm text-gray-500 ml-2">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleChatSubmit();
                          }
                        }}
                        placeholder="Ask a follow-up question about this verification..."
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        disabled={chatLoading}
                      />
                      <button
                        onClick={handleChatSubmit}
                        disabled={!chatInput.trim() || chatLoading}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {chatLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Suggested Questions */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Suggested questions:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Can you explain the confidence score?",
                          "What sources were most reliable?",
                          "Are there any conflicting reports?",
                          "What additional evidence would strengthen this?",
                          "How recent is this information?"
                        ].map((question, i) => (
                          <button
                            key={i}
                            onClick={() => setChatInput(question)}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* API Integration CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-2xl border border-gray-200/50">
            <div className="mb-8">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-semibold mb-6 shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Developer Ready
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Loving our service?
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Integrate it to your application
                </span>
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Add AI-powered fact verification to your apps with our simple REST API.
                Perfect for news platforms, content moderation, educational tools, and more.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Simple Integration</h3>
                <p className="text-sm text-gray-600">Get started with just a few lines of code. Comprehensive documentation and examples included.</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Powerful Results</h3>
                <p className="text-sm text-gray-600">6 verification methods, confidence scoring, and detailed source analysis in every response.</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Flexible Pricing</h3>
                <p className="text-sm text-gray-600">Start free with 100 calls/day, upgrade to unlimited Pro for $29/month. No hidden fees.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/api-docs"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                View API Documentation
              </a>
              <a
                href="/api-docs#pricing"
                className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                See Pricing Plans
              </a>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">
                Trusted by developers building fact-checking tools, content moderation systems, and educational platforms
              </p>
              <div className="flex items-center justify-center gap-8 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>99.9% Uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Sub-second Response</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Enterprise Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">TruthLens</span>
              </div>
              <p className="text-gray-600 mb-6 max-w-md">
                AI-powered fact verification platform that helps you distinguish truth from misinformation using advanced machine learning and authoritative sources.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </a>

                <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a></li>
                <li><a href="/how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">How it works</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">API</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Support</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Privacy</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              © {new Date().getFullYear()} TruthLens. All rights reserved. Built with ❤️ for truth and accuracy by <a href="https://harshthakur.xyz" target="_blank" className="text-gray-800 font-bold hover:text-gray-900 transition-colors">Harsh Thakur</a>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
