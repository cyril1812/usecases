import logging
from typing import Dict, Any, List
from app.services.report_service import ReportService
from app.services.graph_service import GraphService

logger = logging.getLogger(__name__)

async def run_report_generator(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Research Report Agent.
    Compiles executive summary, evidence metrics, comparative profiles, and references
    into a structured markdown report. Populates extracted medical entities to Neo4j.
    """
    query = state.get("query", "")
    planner_data = {
        "research_goal": state.get("research_goal", ""),
        "keywords": state.get("keywords", []),
        "mesh_terms": state.get("mesh_terms", []),
        "execution_plan": state.get("execution_plan", [])
    }
    papers = state.get("papers", [])
    trials = state.get("trials", [])
    comparisons = state.get("comparisons", [])
    evidence_ranking = state.get("evidence_ranking", [])

    logger.info(f"Running Report Generator Agent for query: '{query}'")

    # 1. Populate Medical Knowledge Graph based on the findings
    try:
        # Extract and insert entities
        for comp in comparisons:
            drug_name = comp.get("drug", "")
            drug_class = comp.get("class", "Drug")
            
            # Simple clean names
            clean_drug = drug_name.split("(")[0].strip()
            
            # Save node
            await GraphService.add_entity(clean_drug, "Drug")
            
            # Extract possible disease context from state
            keywords = state.get("keywords", [])
            disease = keywords[3] if len(keywords) > 3 else (keywords[0] if keywords else "Disease Target")
            
            # Save disease node
            await GraphService.add_entity(disease, "Disease")
            
            # Link them
            await GraphService.add_relationship(clean_drug, disease, "TREATS")
            logger.info(f"Linked graph relationship: {clean_drug} -> TREATS -> {disease}")

        # Extract genes/biomarkers from keywords
        mesh_terms = state.get("mesh_terms", [])
        for term in mesh_terms:
            if "receptor" in term.lower() or "gene" in term.lower() or term in ["PD-L1", "EGFR", "BRCA1"]:
                await GraphService.add_entity(term, "Gene")
    except Exception as e:
        logger.error(f"Failed to populate graph database from agent findings: {str(e)}")

    # 2. Compile structured markdown report
    report_content = ReportService.compile_report(
        query=query,
        planner_data=planner_data,
        papers=papers,
        trials=trials,
        comparisons=comparisons,
        evidence_ranking=evidence_ranking
    )

    # 3. Assemble citation objects
    citations = []
    for idx, p in enumerate(papers):
        citations.append({
            "source": f"PubMed (PMID {p.get('paper_id')})",
            "doi": f"10.1038/pmid{p.get('paper_id')}",
            "url": p.get("url")
        })
    for idx, t in enumerate(trials):
        citations.append({
            "source": f"ClinicalTrials.gov ({t.get('nct_id')})",
            "doi": None,
            "url": f"https://clinicaltrials.gov/study/{t.get('nct_id')}"
        })

    title = f"Medical Research Report: {query[:40]}"
    
    return {
        "title": title,
        "report_content": report_content,
        "citations": citations
    }
