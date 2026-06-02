import httpx
import logging
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class ClinicalTrialsService:
    @staticmethod
    async def search_trials(
        condition: Optional[str] = None,
        intervention: Optional[str] = None,
        status: Optional[str] = None,
        phase: Optional[str] = None,
        limit: int = 10,
        page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search ClinicalTrials.gov and return a dictionary containing studies list and nextPageToken."""
        url = "https://clinicaltrials.gov/api/v2/studies"
        params = {}
        
        if condition:
            params["query.cond"] = condition
        if intervention:
            params["query.term"] = intervention
        
        filter_status = []
        if status:
            filter_status.append(status.upper())
        if filter_status:
            # ClinicalTrials.gov API v2 uses status parameter
            params["filter.overallStatus"] = ",".join(filter_status)
            
        if phase:
            params["filter.phase"] = phase.upper()
            
        params["pageSize"] = limit
        
        if page_token:
            params["pageToken"] = page_token

        # Filter the fields to keep response payload small and context-efficient
        params["fields"] = "NCTId,BriefTitle,OverallStatus,Phase,BriefSummary,ConditionsModule,ArmsInterventionsModule,EligibilityModule"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    studies_raw = data.get("studies", [])
                    next_page_token = data.get("nextPageToken")
                    
                    studies = []
                    for study in studies_raw:
                        protocol = study.get("protocolSection", {})
                        nct_id = protocol.get("identificationModule", {}).get("nctId")
                        title = protocol.get("identificationModule", {}).get("briefTitle")
                        overall_status = protocol.get("statusModule", {}).get("overallStatus")
                        study_phase = protocol.get("statusModule", {}).get("phase") or protocol.get("statusModule", {}).get("phases", ["NA"])[0]
                        summary = protocol.get("descriptionModule", {}).get("briefSummary", "")
                        
                        conditions = protocol.get("conditionsModule", {}).get("conditions", [])
                        
                        interventions_raw = protocol.get("armsInterventionsModule", {}).get("interventions", [])
                        interventions = [{"type": i.get("type", "DRUG"), "name": i.get("name", "")} for i in interventions_raw]
                        
                        eligibility = protocol.get("eligibilityModule", {})
                        eligibility_criteria = eligibility.get("eligibilityCriteria", "")
                        std_ages = eligibility.get("stdAges", [])
                        
                        studies.append({
                            "nct_id": nct_id,
                            "title": title,
                            "status": overall_status,
                            "phase": study_phase,
                            "summary": summary,
                            "conditions": conditions,
                            "interventions": interventions,
                            "eligibility": eligibility_criteria,
                            "std_ages": std_ages
                        })
                    return {
                        "studies": studies,
                        "nextPageToken": next_page_token,
                        "totalCount": len(studies) # Fallback count
                    }
                else:
                    logger.error(f"ClinicalTrials.gov search failed with status {response.status_code}")
        except Exception as e:
            logger.error(f"Error during ClinicalTrials.gov search: {str(e)}")

        # Fallback to local mock data if call fails or is offline
        return ClinicalTrialsService._get_mock_trials(condition, intervention, status, phase, limit)

    @staticmethod
    async def get_study_by_id(nct_id: str) -> Optional[Dict[str, Any]]:
        """Fetch details of a specific clinical trial by NCT ID."""
        url = f"https://clinicaltrials.gov/api/v2/studies/{nct_id}"
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    study = response.json()
                    protocol = study.get("protocolSection", {})
                    nct_id = protocol.get("identificationModule", {}).get("nctId")
                    title = protocol.get("identificationModule", {}).get("briefTitle")
                    overall_status = protocol.get("statusModule", {}).get("overallStatus")
                    study_phase = protocol.get("statusModule", {}).get("phase") or protocol.get("statusModule", {}).get("phases", ["NA"])[0]
                    summary = protocol.get("descriptionModule", {}).get("briefSummary", "")
                    
                    conditions = protocol.get("conditionsModule", {}).get("conditions", [])
                    interventions_raw = protocol.get("armsInterventionsModule", {}).get("interventions", [])
                    interventions = [{"type": i.get("type", "DRUG"), "name": i.get("name", "")} for i in interventions_raw]
                    
                    eligibility = protocol.get("eligibilityModule", {})
                    eligibility_criteria = eligibility.get("eligibilityCriteria", "")
                    std_ages = eligibility.get("stdAges", [])
                    
                    return {
                        "nct_id": nct_id,
                        "title": title,
                        "status": overall_status,
                        "phase": study_phase,
                        "summary": summary,
                        "conditions": conditions,
                        "interventions": interventions,
                        "eligibility": eligibility_criteria,
                        "std_ages": std_ages
                    }
        except Exception as e:
            logger.error(f"Error fetching study {nct_id}: {str(e)}")
            
        # Fallback to mock study
        trials = ClinicalTrialsService._get_mock_trials(nct_id=nct_id)
        if trials["studies"]:
            return trials["studies"][0]
        return None

    @staticmethod
    def _get_mock_trials(
        condition: Optional[str] = None,
        intervention: Optional[str] = None,
        status: Optional[str] = None,
        phase: Optional[str] = None,
        limit: int = 10,
        nct_id: Optional[str] = None
    ) -> Dict[str, Any]:
        mock_database = [
            {
                "nct_id": "NCT03700001",
                "title": "Study of Pembrolizumab vs. Paclitaxel in Advanced Non-Small Cell Lung Cancer",
                "status": "COMPLETED",
                "phase": "PHASE3",
                "summary": "This clinical trial compares the efficacy and safety profiles of Pembrolizumab (PD-1 inhibitor monotherapy) against Paclitaxel chemotherapy in patients with metastatic non-small cell lung cancer whose tumors express high PD-L1 levels.",
                "conditions": ["Non-Small Cell Lung Cancer", "Carcinoma, Non-Small-Cell Lung"],
                "interventions": [
                    {"type": "DRUG", "name": "Pembrolizumab (Keytruda)"},
                    {"type": "DRUG", "name": "Paclitaxel (Taxol)"}
                ],
                "eligibility": "Inclusion Criteria:\n- Histologically confirmed stage IV non-small cell lung cancer\n- High PD-L1 expression (TPS >= 50%)\n- No prior systemic chemotherapy for metastatic disease\n- Age >= 18 years\n\nExclusion Criteria:\n- Active autoimmune disease requiring systemic steroids\n- Untreated central nervous system metastases\n- History of interstitial lung disease",
                "std_ages": ["ADULT", "OLDER_ADULT"]
            },
            {
                "nct_id": "NCT04500002",
                "title": "Combination Therapy of Pembrolizumab and Paclitaxel in Triple-Negative Breast Cancer",
                "status": "RECRUITING",
                "phase": "PHASE2",
                "summary": "Evaluation of the synergistic antitumor response when administering Pembrolizumab concurrently with Paclitaxel chemotherapy as a neoadjuvant treatment protocol for women diagnosed with stage II-III triple-negative breast cancer.",
                "conditions": ["Triple-Negative Breast Cancer", "Breast Neoplasms"],
                "interventions": [
                    {"type": "DRUG", "name": "Pembrolizumab"},
                    {"type": "DRUG", "name": "Paclitaxel"}
                ],
                "eligibility": "Inclusion Criteria:\n- Triple-negative breast cancer (ER-, PR-, HER2-)\n- Stage II or III disease candidate for neoadjuvant chemotherapy\n- Adequate organ function\n- Females age >= 18 years\n\nExclusion Criteria:\n- Prior treatment for breast cancer\n- Active systemic infection\n- Significant cardiac history",
                "std_ages": ["ADULT", "OLDER_ADULT"]
            },
            {
                "nct_id": "NCT05200003",
                "title": "Safety Study of CRISPR-Cas9 Edited T-Cells (CTX110) in B-Cell Malignancies",
                "status": "RECRUITING",
                "phase": "PHASE1",
                "summary": "A phase 1 clinical trial assessing the safety, tolerability, and pharmacokinetics of CTX110, an allogeneic CRISPR-Cas9 gene-edited CAR-T cell therapy targeting CD19, in adult patients with relapsed or refractory B-cell malignancies.",
                "conditions": ["B-Cell Lymphoma", "Leukemia, B-Cell, Acute"],
                "interventions": [
                    {"type": "GENETIC", "name": "CTX110 (CRISPR Edited CAR-T)"}
                ],
                "eligibility": "Inclusion Criteria:\n- Relapsed or refractory B-cell lymphoma (DLBCL, FL, MZL, or CLL)\n- Prior treatment with at least 2 lines of therapy\n- ECOG performance status 0 or 1\n- Age >= 18 years\n\nExclusion Criteria:\n- Prior CD19-targeted CAR-T cell therapy\n- History of severe central nervous system pathology\n- Pregnant or lactating women",
                "std_ages": ["ADULT"]
            }
        ]

        if nct_id:
            matched = [t for t in mock_database if t["nct_id"].lower() == nct_id.lower()]
            return {"studies": matched, "nextPageToken": None, "totalCount": len(matched)}

        matched = mock_database
        if condition:
            cond_lower = condition.lower()
            matched = [t for t in matched if any(cond_lower in c.lower() for c in t["conditions"])]
        if intervention:
            int_lower = intervention.lower()
            matched = [t for t in matched if any(int_lower in i["name"].lower() for i in t["interventions"])]
        if status:
            matched = [t for t in matched if t["status"].lower() == status.lower()]
        if phase:
            matched = [t for t in matched if t["phase"].lower() == phase.lower()]

        return {
            "studies": matched[:limit],
            "nextPageToken": None,
            "totalCount": len(matched)
        }
