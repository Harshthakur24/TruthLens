# TruthLens RAG Integration

RAG system that enhances your verification API with research methodology from your PDF.

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Add OpenAI API Key to `.env.local`
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 3. Create Vector Database
```bash
python create_vector_db.py
```

## 📁 Files

- `create_vector_db.py` - Creates vector database from PDF
- `rag_api.py` - API for querying research guidance  
- `requirements.txt` - Python dependencies
- `vector_db/` - Chroma database (created after setup)

## 🔧 How It Works

1. Your verification API calls `python rag_api.py "claim"`
2. RAG provides research methodology guidance
3. Final AI verdict uses both verification results + research guidance

## ✅ Integration Complete

Your `src/app/api/verify/route.ts` already includes the RAG integration. Just run the setup above and it will work automatically!