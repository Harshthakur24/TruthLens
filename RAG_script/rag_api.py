"""
RAG API for TruthLens Verification
Provides research methodology guidance for fact verification
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

def get_research_guidance(claim: str) -> str:
    """
    Get research methodology guidance for a claim
    This function is called by the TypeScript verification API
    
    Args:
        claim: The claim to get research guidance for
        
    Returns:
        str: Research methodology guidance
    """
    
    # Check if vector database exists
    vector_db_path = project_root / "RAG_script" / "vector_db"
    
    if not vector_db_path.exists():
        return "Research methodology database not available."
    
    try:
        # Try to import and use the RAG functions
        from RAG_script.rag_query import get_research_context
        return get_research_context(claim)
    except ImportError:
        return "RAG functions not available. Please check installation."
    except Exception as e:
        return f"Error querying research database: {str(e)}"

def main():
    """
    Command line interface for the RAG API
    Called from TypeScript with: python RAG_script/rag_api.py "claim text"
    """
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python rag_api.py \"claim text\""}))
        return
    
    claim = sys.argv[1]
    guidance = get_research_guidance(claim)
    
    # Return JSON response
    response = {
        "claim": claim,
        "research_guidance": guidance,
        "success": True
    }
    
    print(json.dumps(response))

if __name__ == "__main__":
    main()
