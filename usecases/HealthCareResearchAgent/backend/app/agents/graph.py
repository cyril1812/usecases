import logging
from typing import Dict, Any, List, TypedDict
from langgraph.graph import StateGraph, END

# Import agents
from app.agents.planner import run_planner
from app.agents.pubmed_searcher import run_pubmed_searcher
from app.agents.clinical_trial import run_clinical_trial_agent
from app.agents.literature_reviewer import run_literature_reviewer
from app.agents.rag_retriever import run_rag_retriever
from app.agents.evidence_ranker import run_evidence_ranker
from app.agents.drug_intelligence import run_drug_intelligence
from app.agents.report_generator import run_report_generator

logger = logging.getLogger(__name__)

# Define LangGraph State
class ResearchAgentState(TypedDict):
    query: str
    research_goal: str
    keywords: List[str]
    mesh_terms: List[str]
    execution_plan: List[str]
    pmids: List[str]
    papers: List[Dict[str, Any]]
    trials: List[Dict[str, Any]]
    rag_results: List[Dict[str, Any]]
    evidence_ranking: List[Dict[str, Any]]
    comparisons: List[Dict[str, Any]]
    title: str
    report_content: str
    citations: List[Dict[str, Any]]

# Define State Graph
workflow = StateGraph(ResearchAgentState)

# Add Nodes
workflow.add_node("planner", run_planner)
workflow.add_node("pubmed_searcher", run_pubmed_searcher)
workflow.add_node("literature_reviewer", run_literature_reviewer)
workflow.add_node("clinical_trial", run_clinical_trial_agent)
workflow.add_node("rag_retriever", run_rag_retriever)
workflow.add_node("evidence_ranker", run_evidence_ranker)
workflow.add_node("drug_intelligence", run_drug_intelligence)
workflow.add_node("report_generator", run_report_generator)

# Establish Sequential Routing
workflow.set_entry_point("planner")
workflow.add_edge("planner", "pubmed_searcher")
workflow.add_edge("pubmed_searcher", "literature_reviewer")
workflow.add_edge("literature_reviewer", "clinical_trial")
workflow.add_edge("clinical_trial", "rag_retriever")
workflow.add_edge("rag_retriever", "evidence_ranker")
workflow.add_edge("evidence_ranker", "drug_intelligence")
workflow.add_edge("drug_intelligence", "report_generator")
workflow.add_edge("report_generator", END)

# Compile Graph
research_graph = workflow.compile()

async def execute_research_workflow(query: str) -> Dict[str, Any]:
    """Execute the compiled LangGraph workflow with an input query."""
    initial_state: ResearchAgentState = {
        "query": query,
        "research_goal": "",
        "keywords": [],
        "mesh_terms": [],
        "execution_plan": [],
        "pmids": [],
        "papers": [],
        "trials": [],
        "rag_results": [],
        "evidence_ranking": [],
        "comparisons": [],
        "title": "",
        "report_content": "",
        "citations": []
    }
    
    logger.info(f"Initiating LangGraph agent workflow for query: '{query}'")
    try:
        final_state = await research_graph.ainvoke(initial_state)
        logger.info("LangGraph agent workflow completed successfully")
        return final_state
    except Exception as e:
        import traceback
        logger.error(f"Error executing LangGraph workflow: {str(e)}\n{traceback.format_exc()}")
        raise e
