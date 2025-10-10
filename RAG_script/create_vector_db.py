"""
TruthLens RAG Vector Database Creator
Converts PDF documents into vector embeddings for fact verification
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

try:
    # Try newer LangChain imports
    from langchain_community.document_loaders import PyPDFLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_openai import OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain.schema import Document
except ImportError:
    # Fallback to older imports
    from langchain.document_loaders import PyPDFLoader
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.embeddings.openai import OpenAIEmbeddings
    from langchain.vectorstores import Chroma
    from langchain.schema import Document

def create_vector_database():
    """Create vector database from PDF documents"""
    
    print("Starting TruthLens RAG Vector Database Creation...")
    
    # Check if OpenAI API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("Error: OPENAI_API_KEY not found in environment variables")
        print("Please add your OpenAI API key to .env.local file")
        return False
    
    # Paths
    pdf_path = project_root / "public" / "research_steps.pdf"
    vector_db_path = project_root / "RAG_script" / "vector_db"
    
    # Check if PDF exists
    if not pdf_path.exists():
        print(f"Error: PDF file not found at {pdf_path}")
        return False
    
    print(f"Loading PDF: {pdf_path.name}")
    
    try:
        # 1. Load PDF document
        loader = PyPDFLoader(str(pdf_path))
        documents = loader.load()
        
        print(f"Loaded {len(documents)} pages from PDF")
        
        # 2. Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,      # Smaller chunks for better retrieval
            chunk_overlap=200,    # Overlap for context preservation
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        splits = text_splitter.split_documents(documents)
        print(f"Split into {len(splits)} text chunks")
        
        # 3. Create embeddings and vector store
        print("Creating embeddings...")
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",  # Cost-effective embedding model
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # 4. Create persistent vector database
        vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=embeddings,
            persist_directory=str(vector_db_path)
        )
        
        # Persist the database
        vectorstore.persist()
        
        print(f"Vector database created successfully!")
        print(f"Database location: {vector_db_path}")
        print(f"Total chunks: {len(splits)}")
        
        # 5. Test the database
        print("\nTesting the vector database...")
        test_query = "How do I verify facts?"
        results = vectorstore.similarity_search(test_query, k=3)
        
        print(f"Test query: '{test_query}'")
        print(f"Found {len(results)} relevant chunks")
        
        for i, doc in enumerate(results, 1):
            print(f"\n--- Chunk {i} ---")
            print(f"Content preview: {doc.page_content[:200]}...")
            print(f"Source: {doc.metadata.get('source', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"Error creating vector database: {str(e)}")
        return False

def create_rag_query_function():
    """Create a reusable RAG query function"""
    
    rag_code = '''
def query_research_database(query: str, k: int = 5) -> list:
    """
    Query the research database for relevant information
    
    Args:
        query (str): The research question or topic
        k (int): Number of relevant chunks to retrieve
        
    Returns:
        list: List of relevant document chunks
    """
    import os
    from pathlib import Path
    
    try:
        # Try newer imports first
        from langchain_openai import OpenAIEmbeddings
        from langchain_community.vectorstores import Chroma
    except ImportError:
        # Fallback to older imports
        from langchain.embeddings.openai import OpenAIEmbeddings
        from langchain.vectorstores import Chroma
    
    # Paths
    project_root = Path(__file__).parent.parent
    vector_db_path = project_root / "RAG_script" / "vector_db"
    
    if not vector_db_path.exists():
        print("❌ Vector database not found. Run create_vector_db.py first.")
        return []
    
    # Load embeddings and vector store
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=os.getenv('OPENAI_API_KEY')
    )
    
    vectorstore = Chroma(
        persist_directory=str(vector_db_path),
        embedding_function=embeddings
    )
    
    # Perform similarity search
    results = vectorstore.similarity_search(query, k=k)
    
    return results

def get_research_context(query: str) -> str:
    """
    Get formatted research context for verification
    
    Args:
        query (str): The fact or claim to verify
        
    Returns:
        str: Formatted research context
    """
    chunks = query_research_database(query, k=3)
    
    if not chunks:
        return "No research methodology found for this topic."
    
    context = "Research Methodology Context:\\n\\n"
    
    for i, chunk in enumerate(chunks, 1):
        context += f"{i}. {chunk.page_content}\\n\\n"
    
    return context
'''
    
    with open("RAG_script/rag_query.py", "w") as f:
        f.write(rag_code)
    
    print("Created rag_query.py with reusable functions")

if __name__ == "__main__":
    success = create_vector_database()
    
    if success:
        create_rag_query_function()
        print("\nRAG setup complete!")
        print("\nNext steps:")
        print("1. The vector database is now ready for your verification API")
        print("2. Use rag_query.py functions in your API to query research methods")
        print("3. Import: from RAG_script.rag_query import get_research_context")
    else:
        print("\nRAG setup failed. Please check the errors above.")
