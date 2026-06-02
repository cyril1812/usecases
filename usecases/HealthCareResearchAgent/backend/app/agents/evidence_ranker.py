import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Ranking map based on clinical hierarchy
EVIDENCE_HIERARCHY = {
    "meta analysis": 1,
    "systematic review": 2,
    "randomized controlled trial": 3,
    "rct": 3,
    "phase 3 trial": 3,
    "phase 2 trial": 4,
    "cohort study": 5,
    "case-control study": 6,
    "case report": 7,
    "opinion article": 8,
    "opinion": 8,
    "unknown": 9
}

async def run_evidence_ranker(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evidence Ranking Agent.
    Evaluates study designs, sample sizes, and publication impact.
    Ranks combined evidence according to clinical validation hierarchy.
    """
    papers = state.get("papers", [])
    trials = state.get("trials", [])
    
    logger.info(f"Running Evidence Ranker Agent. Ingestion counts: papers={len(papers)}, trials={len(trials)}")

    candidates = []

    # Map papers to candidates
    for p in papers:
        design = p.get("study_design", "unknown").lower()
        # Find matching tier
        tier = 9
        for key, val in EVIDENCE_HIERARCHY.items():
            if key in design:
                tier = val
                break
                
        candidates.append({
            "source": f"PMID: {p.get('paper_id')}",
            "type": p.get("study_design", "Clinical Study"),
            "sample_size": p.get("sample_size", "N/A"),
            "finding": p.get("conclusion", p.get("results", "No findings summary")),
            "tier": tier,
            "title": p.get("title", "")
        })

    # Map trials to candidates
    for t in trials:
        phase = t.get("phase", "unknown").lower()
        # Map phase to tier
        tier = 9
        design = "Clinical Trial"
        if "phase 3" in phase:
            tier = 3
            design = "Phase 3 Trial"
        elif "phase 2" in phase:
            tier = 4
            design = "Phase 2 Trial"
        elif "phase 1" in phase:
            tier = 5
            design = "Phase 1 Trial"

        candidates.append({
            "source": f"NCTID: {t.get('nct_id')}",
            "type": design,
            "sample_size": "N/A",  # Try to extract or set N/A
            "finding": t.get("summary", "No trial summary"),
            "tier": tier,
            "title": t.get("title", "")
        })

    # Sort candidates by tier (lower tier is better evidence rank)
    candidates.sort(key=lambda x: x["tier"])

    # Assign rank numbers
    ranked_evidence = []
    for idx, cand in enumerate(candidates):
        ranked_evidence.append({
            "rank": idx + 1,
            "source": cand["source"],
            "type": cand["type"],
            "sample_size": cand["sample_size"],
            "finding": cand["finding"],
            "title": cand["title"]
        })

    logger.info(f"Evidence Ranker Agent ranked {len(ranked_evidence)} evidence units")
    return {"evidence_ranking": ranked_evidence}
