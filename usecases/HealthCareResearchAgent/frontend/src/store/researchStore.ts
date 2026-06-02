import { create } from 'zustand';

export interface Paper {
  paper_id: string;
  title: string;
  authors: string[];
  journal: string;
  abstract: string;
  url: string;
  study_design?: string;
  sample_size?: string;
  objective?: string;
  methods?: string;
  conclusion?: string;
  limitations?: string;
}

export interface Trial {
  nct_id: string;
  title: string;
  status: string;
  phase: string;
  summary: string;
  conditions: string[];
  interventions: { type: string; name: string }[];
  eligibility: string;
  std_ages: string[];
}

export interface EvidenceRank {
  rank: number;
  source: string;
  type: string;
  sample_size: string;
  finding: string;
  title: string;
}

export interface DrugComparison {
  drug: string;
  class: string;
  efficacy: string;
  safety: string;
  side_effects: string;
}

export interface Citation {
  source: string;
  doi: string | null;
  url: string | null;
}

interface Message {
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  metadata?: any;
}

interface ResearchState {
  currentQuery: string;
  messages: Message[];
  activeAgent: string | null; // planner, pubmed_searcher, literature_reviewer, clinical_trial, rag_retriever, evidence_ranker, drug_intelligence, report_generator
  agentStatus: 'idle' | 'running' | 'completed' | 'failed';
  
  // Retrieved outcomes
  researchGoal: string;
  keywords: string[];
  meshTerms: string[];
  executionPlan: string[];
  pmids: string[];
  papers: Paper[];
  trials: Trial[];
  ragResults: any[];
  evidenceRanking: EvidenceRank[];
  comparisons: DrugComparison[];
  reportContent: string;
  citations: Citation[];
  
  // Actions
  setQuery: (query: string) => void;
  addMessage: (message: Message) => void;
  setActiveAgent: (agent: string | null, status?: 'idle' | 'running' | 'completed' | 'failed') => void;
  setResearchResult: (data: any) => void;
  clearResearch: () => void;
}

export const useResearchStore = create<ResearchState>((set) => ({
  currentQuery: '',
  messages: [
    {
      sender: 'agent',
      text: 'Hello! I am your Enterprise Healthcare Research Copilot. How can I assist you with clinical literature, trial intelligence, or proprietary document synthesis today?',
      timestamp: new Date()
    }
  ],
  activeAgent: null,
  agentStatus: 'idle',
  
  researchGoal: '',
  keywords: [],
  meshTerms: [],
  executionPlan: [],
  pmids: [],
  papers: [],
  trials: [],
  ragResults: [],
  evidenceRanking: [],
  comparisons: [],
  reportContent: '',
  citations: [],
  
  setQuery: (currentQuery) => set({ currentQuery }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setActiveAgent: (activeAgent, agentStatus = 'running') => set({ activeAgent, agentStatus }),
  setResearchResult: (data) => set({
    researchGoal: data.research_goal || '',
    keywords: data.keywords || [],
    meshTerms: data.mesh_terms || [],
    executionPlan: data.execution_plan || [],
    pmids: data.pmids || [],
    papers: data.papers || [],
    trials: data.trials || [],
    ragResults: data.rag_results || [],
    evidenceRanking: data.evidence_ranking || [],
    comparisons: data.comparisons || [],
    reportContent: data.report_content || '',
    citations: data.citations || [],
    activeAgent: null,
    agentStatus: 'completed'
  }),
  clearResearch: () => set({
    currentQuery: '',
    researchGoal: '',
    keywords: [],
    meshTerms: [],
    executionPlan: [],
    pmids: [],
    papers: [],
    trials: [],
    ragResults: [],
    evidenceRanking: [],
    comparisons: [],
    reportContent: '',
    citations: [],
    activeAgent: null,
    agentStatus: 'idle'
  })
}));
