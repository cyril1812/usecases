import logging
from typing import Dict, Any
from app.services.pubmed_service import PubMedService

logger = logging.getLogger(__name__)

async def run_pubmed_searcher(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    PubMed Search Agent.
    Formulates optimal NCBI search strings using extracted keywords and MeSH terms,
    queries the PubMed/PMC databases, and retrieves candidate PMID identifiers.
    """
    keywords = state.get("keywords", [])
    query = state.get("query", "")
    
    # Formulate search query string
    search_query = " OR ".join(keywords) if keywords else query
    logger.info(f"Running PubMed Searcher Agent with query: '{search_query}'")

    try:
        # Search PubMed
        pmids = await PubMedService.search_pubmed(search_query, max_results=5)
        logger.info(f"PubMed Searcher retrieved {len(pmids)} PMIDs: {pmids}")
        return {"pmids": pmids}
    except Exception as e:
        logger.error(f"Error in PubMed Searcher Agent: {str(e)}")
        return {"pmids": []}
