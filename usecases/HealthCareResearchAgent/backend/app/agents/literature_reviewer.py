import json
import logging
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from app.config import settings
from app.services.pubmed_service import PubMedService

logger = logging.getLogger(__name__)

async def run_literature_reviewer(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Literature Reviewer Agent.
    Fetches article abstracts and metadata for PMIDs, analyzes study content,
    and extracts methodology, core findings, sample sizes, and study limitations.
    """
    pmids = state.get("pmids", [])
    logger.info(f"Running Literature Reviewer Agent for PMIDs: {pmids}")

    if not pmids:
        return {"papers": []}

    try:
        # Fetch abstracts
        articles = await PubMedService.fetch_abstracts(pmids)
        
        reviewed_papers = []
        for article in articles:
            # Extract structured summaries
            summary = await LiteratureReviewer.extract_structured_review(article)
            reviewed_papers.append(summary)
            
        logger.info(f"Literature Reviewer reviewed {len(reviewed_papers)} papers")
        return {"papers": reviewed_papers}
    except Exception as e:
        logger.error(f"Error in Literature Reviewer Agent: {str(e)}")
        return {"papers": []}

class LiteratureReviewer:
    @staticmethod
    async def extract_structured_review(article: Dict[str, Any]) -> Dict[str, Any]:
        """Review a single article abstract and extract methods, results, limitations."""
        pmid = article.get("paper_id")
        title = article.get("title")
        authors = article.get("authors", [])
        journal = article.get("journal")
        abstract = article.get("abstract", "")
        url = article.get("url")

        # MOCK LLM
        if settings.MOCK_LLM:
            # Generate deterministic mock parsing
            # Parse sample size out of abstract text if possible
            sample_size = "N/A"
            if "patients" in abstract.lower():
                import re
                match = re.search(r'(\d+)\s+patients', abstract.lower())
                if match:
                    sample_size = f"{match.group(1)} patients"
                elif "305" in abstract:
                    sample_size = "305 patients"
                elif "616" in abstract:
                    sample_size = "616 patients"
                elif "4,950" in abstract:
                    sample_size = "4,950 patients"
            
            # Simple heuristics for design
            study_design = "Clinical Study"
            if "randomized" in abstract.lower() or "phase 3" in abstract.lower():
                study_design = "Randomized Controlled Trial"
            elif "systematic" in abstract.lower() or "meta-analysis" in abstract.lower():
                study_design = "Systematic Review"
            
            return {
                "paper_id": pmid,
                "title": title,
                "authors": authors,
                "journal": journal,
                "url": url,
                "study_design": study_design,
                "sample_size": sample_size,
                "objective": f"Evaluate therapeutic interventions for patients described in: {title}.",
                "methods": "Randomized cohort assignments, statistical correlation calculations, and median survival metrics compared across study arms.",
                "results": abstract if len(abstract) < 300 else abstract[:300] + "...",
                "conclusion": "The therapy shows significant improvement in primary survival endpoints compared to control arms.",
                "limitations": "Short follow-up periods, exclusion of high-risk patient subgroups, and open-label treatment designs in selected arms.",
                "tldr": f"A study evaluating therapeutic efficacy and safety parameters in patients with {study_design.lower()}."
            }

        # ONLINE LLM
        try:
            prompt = ChatPromptTemplate.from_template(
                "You are an expert Clinical Literature Reviewer.\n"
                "Review the following research paper abstract and extract structured review details.\n"
                "Title: {title}\n"
                "Abstract: {abstract}\n\n"
                "Respond ONLY with a valid JSON containing:\n"
                "- 'study_design' (e.g. Randomized Controlled Trial, Systematic Review, Cohort Study, Case-Control Study, Case Report, Opinion Article)\n"
                "- 'sample_size' (e.g. 305 patients, 12 subjects, N/A)\n"
                "- 'objective' (string)\n"
                "- 'methods' (string)\n"
                "- 'results' (string)\n"
                "- 'conclusion' (string)\n"
                "- 'limitations' (string)\n"
                "- 'tldr' (a single-sentence summary under 20 words highlighting key clinical outcomes)"
            )
            llm = ChatOpenAI(temperature=0, model=settings.LLM_MODEL, api_key=settings.OPENAI_API_KEY)
            chain = prompt | llm
            response = await chain.ainvoke({"title": title, "abstract": abstract})
            
            content = response.content.strip()
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
                
            data = json.loads(content)
            return {
                "paper_id": pmid,
                "title": title,
                "authors": authors,
                "journal": journal,
                "url": url,
                "study_design": data.get("study_design", "Cohort Study"),
                "sample_size": data.get("sample_size", "N/A"),
                "objective": data.get("objective", ""),
                "methods": data.get("methods", ""),
                "results": data.get("results", ""),
                "conclusion": data.get("conclusion", ""),
                "limitations": data.get("limitations", ""),
                "tldr": data.get("tldr", "No summary generated.")
            }
        except Exception as e:
            logger.error(f"Error reviewing abstract for pmid {pmid}: {str(e)}")
            # Fallback
            return {
                "paper_id": pmid,
                "title": title,
                "authors": authors,
                "journal": journal,
                "url": url,
                "study_design": "Cohort Study",
                "sample_size": "N/A",
                "objective": "Not extracted",
                "methods": "Not extracted",
                "results": abstract[:200] + "...",
                "conclusion": "Not extracted",
                "limitations": "Not extracted",
                "tldr": "Review fallback summary generated."
            }
