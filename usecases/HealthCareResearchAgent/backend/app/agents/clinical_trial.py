import logging
from typing import Dict, Any
from app.services.clinical_trials_service import ClinicalTrialsService

logger = logging.getLogger(__name__)

async def run_clinical_trial_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clinical Trial Agent.
    Interfaces with ClinicalTrials.gov to find trials matching keywords.
    Extracts phase, summary, interventions, and eligibility criteria.
    """
    keywords = state.get("keywords", [])
    query = state.get("query", "")
    
    # Try condition-based matching using primary keywords
    condition = keywords[0] if keywords else query
    intervention = keywords[1] if len(keywords) > 1 else None
    
    logger.info(f"Running Clinical Trial Agent for condition: '{condition}', intervention: '{intervention}'")

    try:
        # Search ClinicalTrials.gov
        result = await ClinicalTrialsService.search_trials(
            condition=condition,
            intervention=intervention,
            limit=5
        )
        studies = result.get("studies", [])
        logger.info(f"Clinical Trial Agent retrieved {len(studies)} study records")
        return {"trials": studies}
    except Exception as e:
        logger.error(f"Error in Clinical Trial Agent: {str(e)}")
        return {"trials": []}
