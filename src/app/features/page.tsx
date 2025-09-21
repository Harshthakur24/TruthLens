"use client";
import { Shield, Search, Globe, BookOpen, Newspaper, Image, Link as LinkIcon, CheckCircle, Sparkles, Users, Zap, Lock } from "lucide-react";
import Link from "next/link";

export default function Features() {
    const features = [
        {
            icon: <Shield className="w-8 h-8" />,
            title: "6-Method Verification System",
            description: "Comprehensive fact-checking using AI models, web scraping, research papers, news sources, image analysis, and URL safety checks.",
            color: "from-blue-500 to-purple-600"
        },
        {
            icon: <Search className="w-8 h-8" />,
            title: "AI-Powered Analysis",
            description: "Advanced AI models (OpenAI, Gemini, Perplexity, Grok) cross-reference information for accurate verification.",
            color: "from-green-500 to-teal-600"
        },
        {
            icon: <Globe className="w-8 h-8" />,
            title: "Authoritative Web Sources",
            description: "Scrapes content from government sites, educational institutions, news outlets, and fact-checking organizations.",
            color: "from-orange-500 to-red-600"
        },
        {
            icon: <BookOpen className="w-8 h-8" />,
            title: "Academic Research",
            description: "Searches Google Scholar, PubMed, and ArXiv for peer-reviewed scientific papers and academic sources.",
            color: "from-purple-500 to-pink-600"
        },
        {
            icon: <Newspaper className="w-8 h-8" />,
            title: "Real-Time News Verification",
            description: "Checks latest news articles and reports from 1000+ sources with reliability scoring.",
            color: "from-indigo-500 to-blue-600"
        },
        {
            icon: <Image className="w-8 h-8" />,
            title: "Image Analysis",
            description: "Reverse image search, deepfake detection, and metadata analysis for visual content verification.",
            color: "from-pink-500 to-rose-600"
        },
        {
            icon: <LinkIcon className="w-8 h-8" />,
            title: "URL Safety Check",
            description: "Verifies link safety, checks for malware, and provides archive.org historical versions.",
            color: "from-cyan-500 to-blue-600"
        },
        {
            icon: <CheckCircle className="w-8 h-8" />,
            title: "Confidence Scoring",
            description: "Provides percentage-based confidence scores with detailed explanations for each verification method.",
            color: "from-emerald-500 to-green-600"
        }
    ];

    const benefits = [
        {
            icon: <Users className="w-6 h-6" />,
            title: "Media Literacy",
            description: "Educates users on how to critically analyze information and identify misinformation patterns."
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "Real-Time Results",
            description: "Provides instant verification results with comprehensive analysis in seconds."
        },
        {
            icon: <Lock className="w-6 h-6" />,
            title: "Privacy Focused",
            description: "Respects user privacy with secure data handling and no personal information storage."
        },
        {
            icon: <Sparkles className="w-6 h-6" />,
            title: "User-Friendly",
            description: "Intuitive interface with clear visual indicators and easy-to-understand results."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-black rounded-lg">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">TruthLens</h1>
                                <p className="text-sm text-gray-600">AI-Powered Misinformation Detection</p>
                            </div>
                        </div>
                        <nav className="flex items-center gap-6">
                            <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">Home</Link>
                            <Link href="/features" className="text-black font-bold">Features</Link>
                            <Link href="/how-it-works" className="text-gray-600 hover:text-gray-900 font-medium">How it Works</Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                        Powerful Features for
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Truth Verification</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
                        TruthLens combines cutting-edge AI technology with comprehensive data sources to provide the most thorough fact-checking experience available.
                    </p>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="group p-8 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose TruthLens?</h2>
                        <p className="text-lg text-gray-600">Built for accuracy, transparency, and user empowerment</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="text-center">
                                <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
                                    <div className="text-blue-600">{benefit.icon}</div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                                <p className="text-gray-600">{benefit.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                        <div className="p-6">
                            <div className="text-3xl font-bold text-blue-600 mb-2">6+</div>
                            <div className="text-gray-600">Verification Methods</div>
                        </div>
                        <div className="p-6">
                            <div className="text-3xl font-bold text-green-600 mb-2">1000+</div>
                            <div className="text-gray-600">News Sources</div>
                        </div>
                        <div className="p-6">
                            <div className="text-3xl font-bold text-purple-600 mb-2">4</div>
                            <div className="text-gray-600">AI Models</div>
                        </div>
                        <div className="p-6">
                            <div className="text-3xl font-bold text-orange-600 mb-2">Real-time</div>
                            <div className="text-gray-600">Analysis</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Verify the Truth?</h2>
                    <p className="text-xl text-blue-100 mb-8">Start fact-checking claims with our comprehensive verification system</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                    >
                        <Sparkles className="w-5 h-5" />
                        Try TruthLens Now
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg">
                                <Shield className="w-6 h-6 text-gray-900" />
                            </div>
                            <span className="text-lg font-bold">TruthLens</span>
                        </div>
                        <div className="text-gray-400">
                            © {new Date().getFullYear()} TruthLens. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
