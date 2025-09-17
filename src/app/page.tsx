"use client";
import { useState } from "react";
import type { ClipboardEvent } from "react";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { Search, Shield, CheckCircle, ExternalLink, Sparkles, X } from "lucide-react";

type VerifyResponse = {
  claim: string;
  verdict: string;
  verdictLabel?: 'true' | 'false' | 'uncertain';
  truthLikelihood?: number;
  responses: {
    provider: string;
    verdict: string;
    error?: string;
  }[];
  research?: string[];
};

type ImageData = { mimeType: string; data: string };

export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);


  async function verify() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: text, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verification failed");
      setResult(data);
      toast.success("Verification completed");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Verification failed";
      toast.error(message);
    } finally {
      setLoading(false);
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
      <header className="border-b border-black/10">
        <div className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-black rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">TruthLens</h1>
                <p className="text-sm text-black/60">AI-Powered Misinformation Detection</p>
              </div>
            </div>
            <p className="text-base text-black/70 max-w-2xl">
              Detect potential misinformation, verify credibility, and learn how to critically analyze information.
            </p>
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
                <div className="text-xs text-black/50">{text.length} chars · Press Enter to verify</div>
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
              </div>

              {/* Example chips */}
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  'COVID-19 vaccine alters DNA',
                  'JWST found life on exoplanet',
                  '5G causes cancer'
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
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/90 transition-all duration-200 shadow-sm"
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
                  className="px-6 py-3 border-2 border-black/20 text-black rounded-xl font-medium hover:bg-black/5 transition-all duration-200"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        {result && (
          <section className="space-y-6">
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
                    <p className="text-black/60 mt-2 whitespace-pre-wrap">{result.verdict}</p>
                  </div>
                </div>

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
                          {response.error ? `Error: ${response.error}` : response.verdict}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

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
    </div>
  );
}
