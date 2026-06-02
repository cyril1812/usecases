import logging
from typing import Dict, Any
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

async def run_rag_retriever(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    RAG Retrieval Agent.
    Executes semantic similarity search over local and corporate uploaded documents.
    Retrieves evidence chunks and returns them for citation mapping.
    """
    query = state.get("query", "")
    logger.info(f"Running RAG Retriever Agent for query: '{query}'")

    try:
        # Search uploaded files
        results = await RAGService.query_similarity(query, top_k=3)
        logger.info(f"RAG Retriever retrieved {len(results)} matching document chunks")
        return {"rag_results": results}
    except Exception as e:
        logger.error(f"Error in RAG Retriever Agent: {str(e)}")
        return {"rag_results": []}
