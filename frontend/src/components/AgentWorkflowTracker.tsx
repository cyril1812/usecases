import React from 'react';
import { useResearchStore } from '../store/researchStore';
import { 
  ClipboardList, 
  Search, 
  FileText, 
  Activity, 
  Database, 
  TrendingUp, 
  ShieldAlert, 
  FileCheck2,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function AgentWorkflowTracker() {
  const { activeAgent, agentStatus } = useResearchStore();

  const stages = [
    { key: 'planner', name: 'Research Planner Agent', desc: 'Analyzing intent, keywords & planning strategy', icon: ClipboardList },
    { key: 'pubmed_searcher', name: 'PubMed Search Agent', desc: 'Querying medical literature & PMIDs extraction', icon: Search },
    { key: 'literature_reviewer', name: 'Literature Reviewer Agent', desc: 'Parsing abstracts, methodology & limitations', icon: FileText },
    { key: 'clinical_trial', name: 'Clinical Trial Agent', desc: 'Fetching matching studies from ClinicalTrials.gov', icon: Activity },
    { key: 'rag_retriever', name: 'RAG Retrieval Agent', desc: 'Scanning uploaded corporate files & vector store', icon: Database },
    { key: 'evidence_ranker', name: 'Evidence Ranking Agent', desc: 'Ordering research hierarchy & sample weightings', icon: TrendingUp },
    { key: 'drug_intelligence', name: 'Drug Intelligence Agent', desc: 'Constructing efficacy & adverse safety profiles', icon: ShieldAlert },
    { key: 'report_generator', name: 'Research Report Agent', desc: 'Compiling executive brief, matrix & citations', icon: FileCheck2 },
  ];

  if (agentStatus === 'idle') return null;

  // Get index of the current active agent
  const activeIndex = stages.findIndex(s => s.key === activeAgent);

  return (
    <div className="glass-panel p-5 w-full flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)]">
            LangGraph Execution Pipeline
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Multi-agent cooperative analysis tracking
          </p>
        </div>
        {agentStatus === 'running' && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--primary-glow)] border border-[var(--border-glow)]">
            <Loader2 className="w-3.5 h-3.5 text-[var(--primary)] animate-spin" />
            <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider">
              Processing Node
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {stages.map((stage, idx) => {
          let state: 'pending' | 'running' | 'completed' = 'pending';
          
          if (agentStatus === 'completed') {
            state = 'completed';
          } else if (idx === activeIndex) {
            state = 'running';
          } else if (activeIndex === -1 && agentStatus === 'running' && idx === 0) {
            // Default first node to running if active index not resolved
            state = 'running';
          } else if (idx < activeIndex && activeIndex !== -1) {
            state = 'completed';
          }

          const StageIcon = stage.icon;

          return (
            <div 
              key={stage.key} 
              className={`flex items-start gap-4 p-3 rounded-xl border transition-all duration-300 ${
                state === 'running'
                  ? 'bg-gradient-to-r from-[var(--primary-glow)] to-transparent border-[var(--primary)] shadow-[0_0_12px_rgba(0,180,216,0.15)] scale-[1.01]'
                  : state === 'completed'
                  ? 'bg-transparent border-emerald-500/20'
                  : 'bg-transparent border-[var(--border-light)] opacity-40'
              }`}
            >
              {/* Timeline Icon Badge */}
              <div className="relative">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                  state === 'running'
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--bg-main)] pulse-glow timeline-pulse'
                    : state === 'completed'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-dim)]'
                }`}>
                  {state === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <StageIcon className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <h4 className={`text-xs font-semibold ${
                  state === 'running' 
                    ? 'text-[var(--primary)]' 
                    : state === 'completed' 
                    ? 'text-emerald-400' 
                    : 'text-[var(--text-main)]'
                }`}>
                  {stage.name}
                </h4>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {stage.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
