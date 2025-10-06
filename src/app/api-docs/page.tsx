"use client";
import { useState } from "react";
import { Shield, Code, Zap, CheckCircle, Copy, CreditCard, Star, Globe, Database, Cpu, MessageSquare, Loader2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function APIDocs() {
    const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('free');
    const [paymentLoading, setPaymentLoading] = useState(false);
    const { data: session } = useSession();

    const handlePayment = async () => {
        setPaymentLoading(true);
        try {
            // If user is not authenticated, sign them in with Google
            if (!session?.user?.email) {
                await signIn('google', { callbackUrl: '/api-docs' });
                return;
            }

            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
                    customerEmail: session.user.email,
                }),
            });

            const { sessionId } = await response.json();

            // Redirect to Stripe Checkout
            const stripe = await import('@stripe/stripe-js').then(({ loadStripe }) =>
                loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
            );

            if (stripe) {
                await stripe.redirectToCheckout({ sessionId });
            }
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Failed to start payment process');
        } finally {
            setPaymentLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const codeExample = `curl -X POST https://truthlens.com/api/verify \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "claim": "The James Webb Space Telescope detected CO₂ on exoplanet WASP-39b",
    "images": [
      {
        "mimeType": "image/jpeg",
        "data": "base64_encoded_image_data"
      }
    ]
  }'`;

    const responseExample = `{
  "claim": "The James Webb Space Telescope detected CO₂ on exoplanet WASP-39b",
  "verdict": "TRUE - This claim is accurate. NASA's James Webb Space Telescope...",
  "verdictLabel": "true",
  "truthLikelihood": 87,
  "methods": [
    {
      "method": "llm",
      "sources": [],
      "summary": "Multiple AI models analyzed the claim...",
      "confidence": 85
    },
    {
      "method": "web",
      "sources": [
        {
          "url": "https://www.nasa.gov/...",
          "title": "Webb Detects CO2 in Exoplanet Atmosphere",
          "content": "NASA's James Webb Space Telescope has detected...",
          "domain": "nasa.gov",
          "reliability": "high"
        }
      ],
      "summary": "Found 3 authoritative sources...",
      "confidence": 90
    }
  ],
  "responses": [
    {
      "provider": "openai",
      "verdict": "This claim is true based on NASA's official announcement...",
      "error": null
    }
  ],
  "research": ["https://example.com/research1", "https://example.com/research2"],
  "imageAnalysis": {
    "reverseSearchResults": [],
    "tineyeResults": [],
    "deepfakeScore": 15
  },
  "urlSafety": []
}`;

    const pricingPlans = {
        free: {
            name: "Free Tier",
            price: "$0",
            period: "/month",
            description: "Perfect for personal projects and testing",
            features: [
                "100 API calls per day",
                "Basic fact-checking",
                "Standard response time",
                "Community support",
                "Rate limit: 10 requests/minute"
            ],
            limitations: [
                "No priority processing",
                "Limited to 3 verification methods",
                "No advanced analytics"
            ]
        },
        pro: {
            name: "Pro Plan",
            price: "$9",
            period: "/month",
            description: "Ideal for developers and businesses",
            features: [
                "Unlimited API calls",
                "Advanced fact-checking with all 6 methods",
                "Priority processing (< 2s response time)",
                "Priority email support",
                "Rate limit: 100 requests/minute",
                "Advanced analytics dashboard",
                "Webhook notifications",
                "Custom confidence thresholds",
                "Bulk verification API",
                "White-label integration"
            ],
            limitations: []
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
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
                                <p className="text-xs text-gray-500 -mt-1">API Documentation</p>
                            </div>
                        </div>
                        <nav className="hidden md:flex items-center gap-8 text-sm">
                            <Link className="relative font-medium text-gray-600 hover:text-gray-900 transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-blue-600 after:to-purple-600 after:transition-all hover:after:w-full" href="/">Home</Link>
                            <Link className="relative font-medium text-gray-600 hover:text-gray-900 transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-blue-600 after:to-purple-600 after:transition-all hover:after:w-full" href="/features">Features</Link>
                            <button
                                onClick={() => {
                                    const pricingSection = document.querySelector('[data-pricing-section]');
                                    if (pricingSection) {
                                        pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className="px-4 py-2 bg-gradient-to-r hover:cursor-pointer from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                            >
                                Get API Key
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                        TruthLens
                        <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            API Documentation
                        </span>
                    </h1>
                    <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                        Integrate AI-powered fact verification into your applications with our comprehensive REST API.
                        Verify claims, check sources, and ensure accuracy with just a few lines of code.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => {
                                const pricingSection = document.querySelector('[data-pricing-section]');
                                if (pricingSection) {
                                    pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 shadow-lg"
                        >
                            <CreditCard className="w-5 h-5 inline mr-2" />
                            Get Started Free
                        </button>
                        <a
                            href="#quick-start"
                            className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
                        >
                            <Code className="w-5 h-5 inline mr-2" />
                            View Examples
                        </a>
                    </div>
                </div>
            </section>

            {/* Quick Start Section */}
            <section id="quick-start" className="px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Quick Start</h2>
                        <p className="text-lg text-gray-600">Get up and running in minutes</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Request Example */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                                    <Zap className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Make a Request</h3>
                                    <p className="text-gray-600">Send a POST request to our verify endpoint</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-900">cURL Example</h4>
                                </div>
                                <div className="relative">
                                    <div className="absolute top-3 left-4 flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(codeExample)}
                                        className="absolute top-3 right-3 p-2 bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-gray-600/50 hover:border-gray-500/70 z-10"
                                        title="Copy code"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 pt-8 overflow-x-auto border border-gray-700 shadow-2xl">
                                        <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                                            <span className="text-blue-400">curl</span> <span className="text-yellow-400">-X POST</span> <span className="text-green-400">https://truthlens.com/api/verify</span> <span className="text-gray-500">\</span>
                                            <br />  <span className="text-yellow-400">-H</span> <span className="text-orange-400">"Content-Type: application/json"</span> <span className="text-gray-500">\</span>
                                            <br />  <span className="text-yellow-400">-H</span> <span className="text-orange-400">"Authorization: Bearer YOUR_API_KEY"</span> <span className="text-gray-500">\</span>
                                            <br />  <span className="text-yellow-400">-d</span> <span className="text-orange-400">{"'{"}</span>
                                            <br />    <span className="text-purple-400">"claim"</span><span className="text-gray-300">:</span> <span className="text-green-400">"The James Webb Space Telescope detected CO₂ on exoplanet WASP-39b"</span><span className="text-gray-300">,</span>
                                            <br />    <span className="text-purple-400">"images"</span><span className="text-gray-300">:</span> <span className="text-gray-300">[</span>
                                            <br />      <span className="text-gray-300">{"{"}</span>
                                            <br />        <span className="text-purple-400">"mimeType"</span><span className="text-gray-300">:</span> <span className="text-green-400">"image/jpeg"</span><span className="text-gray-300">,</span>
                                            <br />        <span className="text-purple-400">"data"</span><span className="text-gray-300">:</span> <span className="text-green-400">"base64_encoded_image_data"</span>
                                            <br />      <span className="text-gray-300">{"}"}</span>
                                            <br />    <span className="text-gray-300">]</span>
                                            <br />  <span className="text-orange-400">{"'}"}</span>
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Response Example */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg">
                                    <CheckCircle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Response</h3>
                                    <p className="text-gray-600">Comprehensive verification results</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-900">JSON Response</h4>
                                </div>
                                <div className="relative">
                                    <div className="absolute top-3 left-4 flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(responseExample)}
                                        className="absolute top-3 right-3 p-2 bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-gray-600/50 hover:border-gray-500/70 z-10"
                                        title="Copy response"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 pt-8 overflow-x-auto max-h-96 overflow-y-auto border border-gray-700 shadow-2xl">
                                        <pre className="text-sm text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                                            <span className="text-gray-300">{"{"}</span>
                                            <br />  <span className="text-purple-400">"claim"</span><span className="text-gray-300">:</span> <span className="text-green-400">"The James Webb Space Telescope detected CO₂ on exoplanet WASP-39b"</span><span className="text-gray-300">,</span>
                                            <br />  <span className="text-purple-400">"verdict"</span><span className="text-gray-300">:</span> <span className="text-green-400">"TRUE - This claim is accurate. NASA's James Webb Space Telescope..."</span><span className="text-gray-300">,</span>
                                            <br />  <span className="text-purple-400">"verdictLabel"</span><span className="text-gray-300">:</span> <span className="text-yellow-400">"true"</span><span className="text-gray-300">,</span>
                                            <br />  <span className="text-purple-400">"truthLikelihood"</span><span className="text-gray-300">:</span> <span className="text-blue-400">87</span><span className="text-gray-300">,</span>
                                            <br />  <span className="text-purple-400">"methods"</span><span className="text-gray-300">:</span> <span className="text-gray-300">[</span>
                                            <br />    <span className="text-gray-300">{"{"}</span>
                                            <br />      <span className="text-purple-400">"method"</span><span className="text-gray-300">:</span> <span className="text-yellow-400">"llm"</span><span className="text-gray-300">,</span>
                                            <br />      <span className="text-purple-400">"sources"</span><span className="text-gray-300">:</span> <span className="text-gray-300">[]</span><span className="text-gray-300">,</span>
                                            <br />      <span className="text-purple-400">"summary"</span><span className="text-gray-300">:</span> <span className="text-green-400">"Multiple AI models analyzed the claim..."</span><span className="text-gray-300">,</span>
                                            <br />      <span className="text-purple-400">"confidence"</span><span className="text-gray-300">:</span> <span className="text-blue-400">85</span>
                                            <br />    <span className="text-gray-300">{"}"}</span>
                                            <br />  <span className="text-gray-300">]</span><span className="text-gray-300">,</span>
                                            <br />  <span className="text-purple-400">"responses"</span><span className="text-gray-300">:</span> <span className="text-gray-300">[</span>
                                            <br />    <span className="text-gray-300">{"{"}</span>
                                            <br />      <span className="text-purple-400">"provider"</span><span className="text-gray-300">:</span> <span className="text-yellow-400">"openai"</span><span className="text-gray-300">,</span>
                                            <br />      <span className="text-purple-400">"verdict"</span><span className="text-gray-300">:</span> <span className="text-green-400">"This claim is true based on NASA's official announcement..."</span><span className="text-gray-300">,</span>
                                            <br />      <span className="text-purple-400">"error"</span><span className="text-gray-300">:</span> <span className="text-gray-500">null</span>
                                            <br />    <span className="text-gray-300">{"}"}</span>
                                            <br />  <span className="text-gray-300">]</span>
                                            <br /><span className="text-gray-300">{"}"}</span>
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* API Reference */}
            <section className="px-4 sm:px-6 lg:px-8 py-12 bg-white/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">API Reference</h2>
                        <p className="text-lg text-gray-600">Complete documentation for all endpoints</p>
                    </div>

                    <div className="grid gap-8">
                        {/* Verify Endpoint */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                                    <Database className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">POST /api/verify</h3>
                                    <p className="text-gray-600">Verify a claim using our multi-method analysis</p>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">Request Parameters</h4>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">claim</code>
                                                    <span className="text-sm font-semibold text-gray-900">string (required)</span>
                                                </div>
                                                <p className="text-sm text-gray-600">The statement or claim you want to verify</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">images</code>
                                                    <span className="text-sm font-semibold text-gray-900">array (optional)</span>
                                                </div>
                                                <p className="text-sm text-gray-600">Array of base64-encoded images to analyze</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">agentic</code>
                                                    <span className="text-sm font-semibold text-gray-900">boolean (optional)</span>
                                                </div>
                                                <p className="text-sm text-gray-600">Enable intelligent tool selection (default: true)</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">Headers</h4>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <code className="text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded">Authorization</code>
                                                <span className="text-sm font-semibold text-gray-900">Bearer YOUR_API_KEY</span>
                                            </div>
                                            <p className="text-sm text-gray-600">Your API key for authentication</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 mb-3">Response Fields</h4>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">verdictLabel</code>
                                                    <span className="text-sm font-semibold text-gray-900">string</span>
                                                </div>
                                                <p className="text-sm text-gray-600">"true", "false", or "uncertain"</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">truthLikelihood</code>
                                                    <span className="text-sm font-semibold text-gray-900">number</span>
                                                </div>
                                                <p className="text-sm text-gray-600">Confidence score from 0-100</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">methods</code>
                                                    <span className="text-sm font-semibold text-gray-900">array</span>
                                                </div>
                                                <p className="text-sm text-gray-600">Detailed verification methods and sources</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <code className="text-sm font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">verdict</code>
                                                    <span className="text-sm font-semibold text-gray-900">string</span>
                                                </div>
                                                <p className="text-sm text-gray-600">Human-readable explanation of the verification</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Verification Methods */}
            <section className="px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Methods</h2>
                        <p className="text-lg text-gray-600">Our AI uses 6 different methods to ensure accuracy</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Cpu,
                                title: "AI Model Analysis",
                                description: "Multiple AI models (OpenAI, Gemini, Perplexity, Grok) analyze the claim",
                                color: "from-blue-500 to-blue-600"
                            },
                            {
                                icon: Globe,
                                title: "Web Source Verification",
                                description: "Scrapes authoritative websites, government sites, and news sources",
                                color: "from-green-500 to-green-600"
                            },
                            {
                                icon: Database,
                                title: "Research Papers",
                                description: "Searches Google Scholar, PubMed, and ArXiv for academic sources",
                                color: "from-purple-500 to-purple-600"
                            },
                            {
                                icon: MessageSquare,
                                title: "News Verification",
                                description: "Checks latest news articles and reports from reliable sources",
                                color: "from-orange-500 to-orange-600"
                            },
                            {
                                icon: Zap,
                                title: "Image Analysis",
                                description: "Reverse image search and deepfake detection for visual content",
                                color: "from-pink-500 to-pink-600"
                            },
                            {
                                icon: Shield,
                                title: "URL Safety Check",
                                description: "Verifies link safety and provides archive links",
                                color: "from-indigo-500 to-indigo-600"
                            }
                        ].map((method, index) => (
                            <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300">
                                <div className={`p-3 bg-gradient-to-r ${method.color} rounded-xl shadow-lg mb-4 inline-block`}>
                                    <method.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{method.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{method.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section data-pricing-section className="px-4 sm:px-6 lg:px-8 py-12 bg-white/50">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-lg text-gray-600">Choose the plan that fits your needs</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {Object.entries(pricingPlans).map(([key, plan]) => (
                            <div
                                key={key}
                                className={`relative bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 transition-all duration-500 ${selectedPlan === key
                                    ? 'border-blue-500 shadow-2xl scale-105 bg-gradient-to-br from-blue-50/50 to-purple-50/50'
                                    : 'border-gray-200/50 hover:shadow-2xl hover:border-blue-300/50'
                                    }`}
                            >
                                {key === 'pro' && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                                            ⭐ Most Popular
                                        </div>
                                    </div>
                                )}
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline justify-center mb-2">
                                        <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                                        <span className="text-gray-600 ml-1">{plan.period}</span>
                                    </div>
                                    <p className="text-gray-600">{plan.description}</p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {plan.features.map((feature, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-gray-700">{feature}</span>
                                        </div>
                                    ))}
                                    {plan.limitations.map((limitation, index) => (
                                        <div key={index} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0" />
                                            <span className="text-gray-500 line-through">{limitation}</span>
                                        </div>
                                    ))}
                                </div>

                                {key === 'free' ? (
                                    <button
                                        onClick={() => setSelectedPlan(key as 'free' | 'pro')}
                                        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${selectedPlan === key
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl'
                                            : 'border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                    >
                                        Start Free
                                    </button>
                                ) : (
                                    <button
                                        onClick={handlePayment}
                                        disabled={paymentLoading}
                                        className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden w-full"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-purple-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        {paymentLoading ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                                                <span className="relative z-10">
                                                    {session?.user?.email ? 'Processing Payment...' : 'Signing in...'}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="relative z-10 flex items-center gap-2">
                                                    <CreditCard className="w-6 h-6" />
                                                    <span className="text-white font-bold">
                                                        {session?.user?.email
                                                            ? `Upgrade to Pro - $9/month`
                                                            : 'Upgrade to Pro - $9/month'
                                                        }
                                                    </span>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {session?.user?.email && (
                        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 font-bold text-sm">
                                        {session.user.email.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-green-800 font-medium">Signed in as</p>
                                    <p className="text-green-600 text-sm">{session.user.email}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="text-center mt-8">
                        <p className="text-gray-600 mb-4">
                            Need more than Pro? <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">Contact us</a> for enterprise pricing.
                        </p>
                        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                <span>Secure payments</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <span>Cancel anytime</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                <span>30-day money back</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Integration Examples */}
            <section className="px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Integration Examples</h2>
                        <p className="text-lg text-gray-600">See how to integrate TruthLens into your favorite languages</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* JavaScript/Node.js */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
                                    <Code className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">JavaScript / Node.js</h3>
                                    <p className="text-gray-600">Using fetch API</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute top-3 left-4 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(`const response = await fetch('https://truthlens.com/api/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    claim: "The claim you want to verify",
    images: [
      {
        mimeType: "image/jpeg",
        data: "base64_encoded_data"
      }
    ]
  })
});

const result = await response.json();
console.log('Verdict:', result.verdictLabel);
console.log('Confidence:', result.truthLikelihood + '%');`)}
                                    className="absolute top-3 right-3 p-2 bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-gray-600/50 hover:border-gray-500/70 z-10"
                                    title="Copy JavaScript code"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 pt-8 overflow-x-auto border border-gray-700 shadow-2xl">
                                    <pre className="text-sm text-gray-100 font-mono leading-relaxed">
                                        <span className="text-blue-400">const</span> <span className="text-yellow-400">response</span> <span className="text-gray-300">=</span> <span className="text-blue-400">await</span> <span className="text-green-400">fetch</span><span className="text-gray-300">(</span><span className="text-orange-400">'https://truthlens.com/api/verify'</span><span className="text-gray-300">,</span> <span className="text-gray-300">{"{"}</span>
                                        <br />  <span className="text-purple-400">method</span><span className="text-gray-300">:</span> <span className="text-orange-400">'POST'</span><span className="text-gray-300">,</span>
                                        <br />  <span className="text-purple-400">headers</span><span className="text-gray-300">:</span> <span className="text-gray-300">{"{"}</span>
                                        <br />    <span className="text-orange-400">'Content-Type'</span><span className="text-gray-300">:</span> <span className="text-orange-400">'application/json'</span><span className="text-gray-300">,</span>
                                        <br />    <span className="text-orange-400">'Authorization'</span><span className="text-gray-300">:</span> <span className="text-orange-400">'Bearer YOUR_API_KEY'</span>
                                        <br />  <span className="text-gray-300">{"}"}</span><span className="text-gray-300">,</span>
                                        <br />  <span className="text-purple-400">body</span><span className="text-gray-300">:</span> <span className="text-green-400">JSON.stringify</span><span className="text-gray-300">(</span><span className="text-gray-300">{"{"}</span>
                                        <br />    <span className="text-purple-400">claim</span><span className="text-gray-300">:</span> <span className="text-orange-400">"The claim you want to verify"</span><span className="text-gray-300">,</span>
                                        <br />    <span className="text-purple-400">images</span><span className="text-gray-300">:</span> <span className="text-gray-300">[</span>
                                        <br />      <span className="text-gray-300">{"{"}</span>
                                        <br />        <span className="text-purple-400">mimeType</span><span className="text-gray-300">:</span> <span className="text-orange-400">"image/jpeg"</span><span className="text-gray-300">,</span>
                                        <br />        <span className="text-purple-400">data</span><span className="text-gray-300">:</span> <span className="text-orange-400">"base64_encoded_data"</span>
                                        <br />      <span className="text-gray-300">{"}"}</span>
                                        <br />    <span className="text-gray-300">]</span>
                                        <br />  <span className="text-gray-300">{"}"}</span><span className="text-gray-300">)</span>
                                        <br /><span className="text-gray-300">{"}"}</span><span className="text-gray-300">);</span>
                                        <br />
                                        <br /><span className="text-blue-400">const</span> <span className="text-yellow-400">result</span> <span className="text-gray-300">=</span> <span className="text-blue-400">await</span> <span className="text-yellow-400">response</span><span className="text-gray-300">.</span><span className="text-green-400">json</span><span className="text-gray-300">();</span>
                                        <br /><span className="text-green-400">console.log</span><span className="text-gray-300">(</span><span className="text-orange-400">'Verdict:'</span><span className="text-gray-300">,</span> <span className="text-yellow-400">result</span><span className="text-gray-300">.</span><span className="text-purple-400">verdictLabel</span><span className="text-gray-300">);</span>
                                        <br /><span className="text-green-400">console.log</span><span className="text-gray-300">(</span><span className="text-orange-400">'Confidence:'</span><span className="text-gray-300">,</span> <span className="text-yellow-400">result</span><span className="text-gray-300">.</span><span className="text-purple-400">truthLikelihood</span> <span className="text-gray-300">+</span> <span className="text-orange-400">'%'</span><span className="text-gray-300">);</span>
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Python */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-gray-200/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl shadow-lg">
                                    <Code className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Python</h3>
                                    <p className="text-gray-600">Using requests library</p>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute top-3 left-4 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(`import requests
import base64

def verify_claim(claim, image_path=None):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    }
    
    data = {'claim': claim}
    
    if image_path:
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode()
            data['images'] = [{
                'mimeType': 'image/jpeg',
                'data': image_data
            }]
    
    response = requests.post(
        'https://truthlens.com/api/verify',
        headers=headers,
        json=data
    )
    
    return response.json()

# Usage
result = verify_claim("Your claim here")
print(f"Verdict: {result['verdictLabel']}")
print(f"Confidence: {result['truthLikelihood']}%")`)}
                                    className="absolute top-3 right-3 p-2 bg-gray-800/80 hover:bg-gray-700/90 text-gray-300 hover:text-white rounded-lg transition-all duration-200 backdrop-blur-sm border border-gray-600/50 hover:border-gray-500/70 z-10"
                                    title="Copy Python code"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 pt-8 overflow-x-auto border border-gray-700 shadow-2xl">
                                    <pre className="text-sm text-gray-100 font-mono leading-relaxed">
                                        <span className="text-blue-400">import</span> <span className="text-yellow-400">requests</span>
                                        <br /><span className="text-blue-400">import</span> <span className="text-yellow-400">base64</span>
                                        <br />
                                        <br />                                        <span className="text-blue-400">def</span> <span className="text-green-400">verify_claim</span><span className="text-gray-300">(</span><span className="text-purple-400">claim</span><span className="text-gray-300">,</span> <span className="text-purple-400">image_path</span><span className="text-gray-300">=</span><span className="text-orange-400">None</span><span className="text-gray-300">):</span>
                                        <br />    <span className="text-purple-400">headers</span> <span className="text-gray-300">= </span><span className="text-gray-300">{"{"}</span>
                                        <br />        <span className="text-orange-400">'Content-Type'</span><span className="text-gray-300">:</span> <span className="text-orange-400">'application/json'</span><span className="text-gray-300">,</span>
                                        <br />        <span className="text-orange-400">'Authorization'</span><span className="text-gray-300">:</span> <span className="text-orange-400">'Bearer YOUR_API_KEY'</span>
                                        <br />    <span className="text-gray-300">{"}"}</span>
                                        <br />
                                        <br />    <span className="text-purple-400">data</span> <span className="text-gray-300">= </span><span className="text-gray-300">{"{"}</span><span className="text-orange-400">'claim'</span><span className="text-gray-300">:</span> <span className="text-purple-400">claim</span><span className="text-gray-300">{"}"}</span>
                                        <br />
                                        <br />    <span className="text-blue-400">if</span> <span className="text-purple-400">image_path</span><span className="text-gray-300">:</span>
                                        <br />        <span className="text-blue-400">with</span> <span className="text-green-400">open</span><span className="text-gray-300">(</span><span className="text-purple-400">image_path</span><span className="text-gray-300">,</span> <span className="text-orange-400">'rb'</span><span className="text-gray-300">)</span> <span className="text-blue-400">as</span> <span className="text-purple-400">f</span><span className="text-gray-300">:</span>
                                        <br />            <span className="text-purple-400">image_data</span> <span className="text-gray-300">=</span> <span className="text-yellow-400">base64</span><span className="text-gray-300">.</span><span className="text-green-400">b64encode</span><span className="text-gray-300">(</span><span className="text-purple-400">f</span><span className="text-gray-300">.</span><span className="text-green-400">read</span><span className="text-gray-300">()).</span><span className="text-green-400">decode</span><span className="text-gray-300">()</span>
                                        <br />            <span className="text-purple-400">data</span><span className="text-gray-300">[</span><span className="text-orange-400">&apos;images&apos;</span><span className="text-gray-300">]</span> <span className="text-gray-300">= [</span><span className="text-gray-300">{"{"}</span>
                                        <br />                <span className="text-orange-400">&apos;mimeType&apos;</span><span className="text-gray-300">:</span> <span className="text-orange-400">&apos;image/jpeg&apos;</span><span className="text-gray-300">,</span>
                                        <br />                <span className="text-orange-400">&apos;data&apos;</span><span className="text-gray-300">:</span> <span className="text-purple-400">image_data</span>
                                        <br />            <span className="text-gray-300">{"}"}</span><span className="text-gray-300">]</span>
                                        <br />
                                        <br />    <span className="text-purple-400">response</span> <span className="text-gray-300">=</span> <span className="text-yellow-400">requests</span><span className="text-gray-300">.</span><span className="text-green-400">post</span><span className="text-gray-300">(</span>
                                        <br />        <span className="text-orange-400">&apos;https://truthlens.com/api/verify&apos;</span><span className="text-gray-300">,</span>
                                        <br />        <span className="text-purple-400">headers</span><span className="text-gray-300">=</span><span className="text-purple-400">headers</span><span className="text-gray-300">,</span>
                                        <br />        <span className="text-purple-400">json</span><span className="text-gray-300">=</span><span className="text-purple-400">data</span>
                                        <br />    <span className="text-gray-300">)</span>
                                        <br />
                                        <br />    <span className="text-blue-400">return</span> <span className="text-purple-400">response</span><span className="text-gray-300">.</span><span className="text-green-400">json</span><span className="text-gray-300">()</span>
                                        <br />
                                        <br /><span className="text-gray-500"># Usage</span>
                                        <br /><span className="text-purple-400">result</span> <span className="text-gray-300">=</span> <span className="text-green-400">verify_claim</span><span className="text-gray-300">(</span><span className="text-orange-400">&quot;Your claim here&quot;</span><span className="text-gray-300">)</span>
                                        <br /><span className="text-green-400">print</span><span className="text-gray-300">(</span><span className="text-orange-400">f&quot;Verdict: </span><span className="text-gray-300">{"{result['verdictLabel']}"}</span><span className="text-orange-400">&quot;</span><span className="text-gray-300">)</span>
                                        <br /><span className="text-green-400">print</span><span className="text-gray-300">(</span><span className="text-orange-400">f&quot;Confidence: </span><span className="text-gray-300">{"{result['truthLikelihood']}"}</span><span className="text-orange-400">%&quot;</span><span className="text-gray-300">)</span>
                                    </pre>
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
                                AI-powered fact verification API that helps developers build trustworthy applications with comprehensive verification capabilities.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Resources</h3>
                            <ul className="space-y-3">
                                <li><Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">Home</Link></li>
                                <li><a href="/features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a></li>
                                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Documentation</a></li>
                                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Status</a></li>
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
                            © {new Date().getFullYear()} TruthLens. All rights reserved. Built with ❤️ for truth and accuracy.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
