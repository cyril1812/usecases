import json
import logging
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

async def run_drug_intelligence(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Drug Intelligence Agent.
    Compares drug characteristics including drug class, efficacy, safety profiles,
    and associated adverse side effects.
    """
    query = state.get("query", "")
    papers = state.get("papers", [])
    trials = state.get("trials", [])
    
    logger.info(f"Running Drug Intelligence Agent for query: '{query}'")

    # MOCK MODE
    if settings.MOCK_LLM:
        query_lower = query.lower()
        comparisons = []
        if "pembrolizumab" in query_lower or "paclitaxel" in query_lower or "cancer" in query_lower:
            comparisons = [
                {
                    "drug": "Pembrolizumab (Keytruda)",
                    "class": "Monoclonal Antibody (PD-1 Checkpoint Inhibitor)",
                    "efficacy": "Superior progression-free survival (median 10.3 months) compared to standard chemotherapy in high-expressing PD-L1 cohorts.",
                    "safety": "Avoids traditional cytotoxic chemotoxicity; potential for auto-immune system reactions.",
                    "side_effects": "Pruritus, fatigue, thyroiditis, immune-mediated pneumonitis or colitis."
                },
                {
                    "drug": "Paclitaxel (Taxol)",
                    "class": "Taxane Chemotherapy (Microtubule Inhibitor)",
                    "efficacy": "Median progression-free survival of 6.0 months in NSCLC. Relies on stopping cell division division cycles.",
                    "safety": "Traditional systemic chemotherapy risk including severe bone marrow suppression and neurotoxic side effects.",
                    "side_effects": "Neutropenia, alopecia, peripheral sensory neuropathy, arthralgia/myalgia."
                }
            ]
        elif "crispr" in query_lower or "gene" in query_lower:
            comparisons = [
                {
                    "drug": "NTLA-2001 (Intellia)",
                    "class": "In-vivo CRISPR-Cas9 genome editing therapy",
                    "efficacy": "Single infusion leads to a mean reduction of 87% in serum transthyretin (TTR) protein levels.",
                    "safety": "High safety profile; targets liver-specific tissues; avoids off-target genomic cleavage.",
                    "side_effects": "Mild infusion-related reactions, temporary injection site soreness."
                },
                {
                    "drug": "CTX110 (CRISPR Therapeutics)",
                    "class": "Allogeneic ex-vivo CRISPR-Cas9 CAR-T cell therapy",
                    "efficacy": "Demonstrates dose-dependent responses in relapsed or refractory B-cell lymphomas; target dose yields stable remission.",
                    "safety": "Potential risk of Cytokine Release Syndrome (CRS) and Immune Effector Cell-Associated Neurotoxicity Syndrome (ICANS).",
                    "side_effects": "Cytopenias, pyrexia, mild cytokine release syndrome."
                }
            ]
        else:
            comparisons = [
                {
                    "drug": query,
                    "class": "Identified Agent class",
                    "efficacy": "Primary efficacy outcomes outlined in literature search.",
                    "safety": "Evaluated clinical safety metrics.",
                    "side_effects": "Reported patient side effects."
                }
            ]
        return {"comparisons": comparisons}

    # ONLINE MODE
    try:
        # Extract context from papers and trials
        context = ""
        for idx, p in enumerate(papers[:3]):
            context += f"Paper {idx+1}: {p.get('title')}. Findings: {p.get('results')}\n"
        for idx, t in enumerate(trials[:3]):
            context += f"Trial {idx+1}: {t.get('title')}. Summary: {t.get('summary')}\n"

        prompt = ChatPromptTemplate.from_template(
            "You are a Drug Intelligence Pharmacologist.\n"
            "Compare the therapeutic drugs mentioned in the query or search context below.\n"
            "Query: {query}\n"
            "Search context:\n{context}\n\n"
            "Respond ONLY with a valid JSON array of objects, where each object contains: "
            "'drug' (string), 'class' (string), 'efficacy' (string), 'safety' (string), and 'side_effects' (string)."
        )
        llm = ChatOpenAI(temperature=0, model=settings.LLM_MODEL, api_key=settings.OPENAI_API_KEY)
        chain = prompt | llm
        response = await chain.ainvoke({"query": query, "context": context})
        
        content = response.content.strip()
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
            
        comparisons = json.loads(content)
        return {"comparisons": comparisons}
    except Exception as e:
        logger.error(f"Error in Drug Intelligence Agent: {str(e)}")
        return {"comparisons": []}
