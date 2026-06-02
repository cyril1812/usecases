import json
import logging
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

async def run_planner(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Research Planner Agent.
    Analyzes the user's search intent, extracts keywords, identifies MeSH terms,
    and maps out a sequential execution plan.
    """
    query = state.get("query", "")
    logger.info(f"Running Planner Agent for query: '{query}'")

    # MOCK MODE
    if settings.MOCK_LLM:
        # Generate rich mock plan based on query
        query_lower = query.lower()
        if "pembrolizumab" in query_lower or "cancer" in query_lower:
            keywords = ["Pembrolizumab", "Immunotherapy", "PD-1 Inhibitor", "Lung Cancer", "NSCLC"]
            mesh_terms = ["Pembrolizumab", "Neoplasms", "Immunotherapy", "Programmed Cell Death 1 Receptor"]
            goal = "Compare efficacy, survival metrics, and toxicities of Pembrolizumab immunotherapy vs conventional therapies in lung cancer."
        elif "crispr" in query_lower or "gene" in query_lower:
            keywords = ["CRISPR-Cas9", "Gene Editing", "In Vivo Editing", "Amyloidosis", "Angioedema"]
            mesh_terms = ["CRISPR-Cas Systems", "Gene Editing", "Amyloidosis", "Angioedema, Hereditary"]
            goal = "Examine current clinical status, efficacy, and safety profile of CRISPR-Cas9 genome editing therapies in human subjects."
        else:
            keywords = [query]
            mesh_terms = [query]
            goal = f"Evaluate current medical literature and clinical evidence regarding {query}."
            
        execution_plan = [
            "Extract search terms and consult PubMed API",
            "Query ClinicalTrials.gov for active/completed drug trials",
            "Synthesize methodology, sample size, and results of retrieved articles",
            "Perform semantic ranking based on trial phase and study design",
            "Extract comparative toxicity and efficacy profiles",
            "Generate structured medical summary and bibliography matrix"
        ]
        
        return {
            "research_goal": goal,
            "keywords": keywords,
            "mesh_terms": mesh_terms,
            "execution_plan": execution_plan
        }

    # ONLINE MODE
    try:
        prompt = ChatPromptTemplate.from_template(
            "You are an expert Medical Research Planner.\n"
            "Analyze the following search query and extract key medical search entities.\n"
            "Query: {query}\n\n"
            "Respond ONLY with a valid JSON containing: 'research_goal' (string), "
            "'keywords' (array of strings), 'mesh_terms' (array of Medical Subject Headings strings), "
            "and 'execution_plan' (array of execution steps)."
        )
        llm = ChatOpenAI(temperature=0, model=settings.LLM_MODEL, api_key=settings.OPENAI_API_KEY)
        chain = prompt | llm
        response = await chain.ainvoke({"query": query})
        
        # Clean response markup if any
        content = response.content.strip()
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
            
        data = json.loads(content)
        return {
            "research_goal": data.get("research_goal", ""),
            "keywords": data.get("keywords", []),
            "mesh_terms": data.get("mesh_terms", []),
            "execution_plan": data.get("execution_plan", [])
        }
    except Exception as e:
        logger.error(f"Error in Planner Agent: {str(e)}")
        # Graceful fallback to mock plan
        return {
            "research_goal": f"Evaluate evidence for: {query}",
            "keywords": [query],
            "mesh_terms": [query],
            "execution_plan": ["Search literature", "Review trials", "Compile report"]
        }
