import React, { useState } from 'react';
import { useResearchStore } from '../store/researchStore';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../components/Sidebar';
import AgentWorkflowTracker from '../components/AgentWorkflowTracker';
import { 
  Send, 
  BookOpen, 
  FileCheck2, 
  ExternalLink,
  History, 
  MessageSquare,
  HelpCircle,
  Database,
  ArrowRight
} from 'lucide-react';

export default function Workspace() {
  const { token } = useAuthStore();
  const {
    currentQuery,
    messages,
    papers,
    trials,
    ragResults,
    researchGoal,
    keywords,
    meshTerms,
    executionPlan,
    agentStatus,
    setQuery,
    addMessage,
    setActiveAgent,
    setResearchResult,
  } = useResearchStore();

  const [inputVal, setInputVal] = useState('');
  const [activeTab, setActiveTab] = useState<'timeline' | 'papers' | 'rag'>('timeline');

  // Load research history
  const { data: historyItems = [], refetch: refetchHistory } = useQuery({
    queryKey: ['researchHistory'],
    queryFn: async () => {
      const res = await fetch('/api/research/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('History load failed');
      return res.json() as Promise<{ id: number; query: string; timestamp: string }[]>;
    },
    enabled: !!token
  });

  const triggerQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    
    setInputVal('');
    setQuery(queryText);
    
    // Add user message to chat logs
    addMessage({
      sender: 'user',
      text: queryText,
      timestamp: new Date()
    });

    // Start simulated workflow agent status transitions
    setActiveAgent('planner', 'running');
    
    const stageTimeline = [
      { agent: 'pubmed_searcher', delay: 1000 },
      { agent: 'literature_reviewer', delay: 2500 },
      { agent: 'clinical_trial', delay: 4200 },
      { agent: 'rag_retriever', delay: 6000 },
      { agent: 'evidence_ranker', delay: 7500 },
      { agent: 'drug_intelligence', delay: 9000 },
      { agent: 'report_generator', delay: 10500 },
    ];

    const timeouts = stageTimeline.map(item => 
      setTimeout(() => {
        setActiveAgent(item.agent, 'running');
      }, item.delay)
    );

    try {
      const res = await fetch('/api/research/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryText })
      });

      // Clear simulated timeouts
      timeouts.forEach(t => clearTimeout(t));

      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      setResearchResult(data);
      refetchHistory();

      // Append agent response
      addMessage({
        sender: 'agent',
        text: `I have compiled the clinical intelligence reports and searched through PubMed literature and registered clinical trials. Below is the summarized breakdown:\n\n* **Research Goal:** ${data.research_goal}\n* **Identified PubMed Articles:** Reviewed ${data.papers.length} publications.\n* **Identified Clinical Trials:** Analyzed ${data.trials.length} matching study protocols.\n\nI have generated a detailed Markdown Research Report. You can view the structured tables in the 'Reports' or 'Clinical Trials' tab.`,
        timestamp: new Date(),
        metadata: data
      });
      
      // Auto switch tab to papers to showcase data
      setActiveTab('papers');

    } catch (err: any) {
      timeouts.forEach(t => clearTimeout(t));
      setActiveAgent(null, 'failed');
      addMessage({
        sender: 'agent',
        text: 'An error occurred during agent processing. Please check connection configurations and API endpoints.',
        timestamp: new Date()
      });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    triggerQuery(inputVal);
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] overflow-hidden">
      <Sidebar />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Side: History Sidebar + Chat */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border-light)] bg-[var(--bg-main)]">
          
          {/* Header info */}
          <header className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-main)] font-['Outfit']">
                Research Workspace
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                AI Copilot Conversational Search
              </p>
            </div>
            
            {keywords.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-hidden max-w-md">
                <span className="text-[10px] text-[var(--text-dim)] uppercase font-semibold shrink-0">Tags:</span>
                {keywords.slice(0, 3).map((kw, i) => (
                  <span key={i} className="text-[10px] bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] px-2 py-0.5 rounded-full truncate">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Chat message list area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-4 slide-in max-w-3xl ${
                  msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {/* Profile icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user' 
                    ? 'bg-[var(--secondary)] text-white' 
                    : 'bg-[var(--primary-glow)] text-[var(--primary)] border border-[var(--border-glow)]'
                }`}>
                  {msg.sender === 'user' ? 'U' : 'AI'}
                </div>

                {/* Message balloon */}
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[var(--secondary)] text-white rounded-tr-none'
                    : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] rounded-tl-none shadow-md'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            {agentStatus === 'running' && (
              <div className="flex gap-4 self-start max-w-3xl">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary-glow)] text-[var(--primary)] border border-[var(--border-glow)] flex items-center justify-center text-xs font-bold animate-pulse">
                  AI
                </div>
                <div className="p-4 rounded-2xl text-sm leading-relaxed bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] rounded-tl-none animate-pulse flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-ping" />
                  Agent team conducting deep clinical search, reviewing literature summaries, and compiling clinical outcomes matrix...
                </div>
              </div>
            )}
          </div>

          {/* Chat Form Input */}
          <div className="p-4 border-t border-[var(--border-light)] bg-[var(--bg-sidebar)]">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                required
                disabled={agentStatus === 'running'}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask about target disease, compare drug efficacies, or reference indexed PDF documents..."
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-main)] text-sm text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)] transition-colors duration-200 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={agentStatus === 'running'}
                className="px-4 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--bg-main)] font-bold text-sm transition-all duration-200 flex items-center justify-center disabled:opacity-50 hover:shadow-[0_0_12px_var(--primary-glow)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Tabbed Results panel */}
        <div className="w-80 border-l border-[var(--border-light)] bg-[var(--bg-sidebar)] flex flex-col overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-[var(--border-light)] text-xs font-bold uppercase tracking-wider text-center shrink-0">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-3 border-b-2 transition-all duration-200 ${
                activeTab === 'timeline' 
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-main)]/50' 
                  : 'border-transparent text-[var(--text-dim)] hover:text-white'
              }`}
            >
              Agent Flow
            </button>
            <button
              onClick={() => setActiveTab('papers')}
              className={`flex-1 py-3 border-b-2 transition-all duration-200 ${
                activeTab === 'papers' 
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-main)]/50' 
                  : 'border-transparent text-[var(--text-dim)] hover:text-white'
              }`}
            >
              Literature ({papers.length})
            </button>
            <button
              onClick={() => setActiveTab('rag')}
              className={`flex-1 py-3 border-b-2 transition-all duration-200 ${
                activeTab === 'rag' 
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--bg-main)]/50' 
                  : 'border-transparent text-[var(--text-dim)] hover:text-white'
              }`}
            >
              RAG Docs
            </button>
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {activeTab === 'timeline' && (
              <div className="flex flex-col gap-4">
                <AgentWorkflowTracker />
                {executionPlan.length > 0 && (
                  <div className="glass-panel p-4 flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                      Current Strategy Plan
                    </h4>
                    <ul className="text-xs text-[var(--text-muted)] flex flex-col gap-1.5 list-disc pl-4 leading-relaxed">
                      {executionPlan.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Search query history quick link */}
                <div className="glass-panel p-4 flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[var(--primary)]" />
                    Query History
                  </h4>
                  <div className="flex flex-col gap-1">
                    {historyItems.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => triggerQuery(item.query)}
                        className="text-left text-xs text-[var(--text-muted)] hover:text-white truncate p-1.5 rounded hover:bg-white/5 flex items-center justify-between"
                      >
                        <span className="truncate">{item.query}</span>
                        <ArrowRight className="w-3 h-3 text-[var(--text-dim)] shrink-0" />
                      </button>
                    ))}
                    {historyItems.length === 0 && (
                      <span className="text-xs text-[var(--text-dim)]">No queries in workspace history.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'papers' && (
              <div className="flex flex-col gap-4">
                {papers.map((paper) => (
                  <div key={paper.paper_id} className="glass-panel p-4 flex flex-col gap-2 border-l-2 border-[var(--primary)] bg-[var(--bg-main)]/30">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--primary-glow)] text-[var(--primary)]">
                        PMID: {paper.paper_id}
                      </span>
                      <a href={paper.url} target="_blank" rel="noreferrer" className="text-[var(--text-dim)] hover:text-white">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text-main)] leading-snug line-clamp-2">
                      {paper.title}
                    </h4>
                    <p className="text-[10px] text-[var(--text-dim)]">
                      {paper.authors.slice(0, 2).join(', ')} et al. | *{paper.journal}*
                    </p>
                    
                    {paper.study_design && (
                      <div className="border-t border-[var(--border-light)] pt-2 mt-1 flex flex-col gap-1 text-[11px]">
                        <span className="text-[10px] uppercase font-bold text-[var(--primary)]">{paper.study_design}</span>
                        <span className="text-[var(--text-muted)]">**N = {paper.sample_size}**</span>
                        <p className="text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                          **Outcomes:** {paper.conclusion}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {papers.length === 0 && (
                  <div className="text-center py-12 text-xs text-[var(--text-dim)] flex flex-col items-center gap-2">
                    <BookOpen className="w-6 h-6" />
                    No literature reviewed yet. Enter a research query.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rag' && (
              <div className="flex flex-col gap-4">
                {ragResults.map((chunk, i) => (
                  <div key={i} className="glass-panel p-4 flex flex-col gap-2 border-l-2 border-[var(--secondary)] bg-[var(--bg-main)]/30">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-[var(--text-muted)]">
                      <Database className="w-3 h-3 text-[var(--secondary)]" />
                      Document Chunk (Score: {(chunk.score || 0).toFixed(2)})
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed italic bg-white/[0.01] p-2 rounded-lg border border-[var(--border-light)]">
                      "{chunk.text}"
                    </p>
                  </div>
                ))}
                {ragResults.length === 0 && (
                  <div className="text-center py-12 text-xs text-[var(--text-dim)] flex flex-col items-center gap-2">
                    <Database className="w-6 h-6" />
                    No similarity vector chunks matched from uploaded files.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
