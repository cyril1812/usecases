import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Sidebar from '../components/Sidebar';
import DrugComparisonTable from '../components/DrugComparisonTable';
import { Search, Loader2, Award, Calendar, HelpCircle, Activity } from 'lucide-react';

interface Trial {
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

export default function ClinicalResearch() {
  const { token } = useAuthStore();
  const [condition, setCondition] = useState('');
  const [intervention, setIntervention] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Query Clinical Trials
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clinicalTrials', condition, intervention],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (condition) params.append('condition', condition);
      if (intervention) params.append('intervention', intervention);
      
      const res = await fetch(`/api/clinical-trials/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<{ studies: Trial[]; totalCount: number }>;
    },
    enabled: submitted && !!token
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    refetch();
  };

  const trials = data?.studies || [];

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        <header className="border-b border-[var(--border-light)] pb-4 shrink-0">
          <h1 className="text-2xl font-bold font-['Outfit'] tracking-wide text-[var(--text-main)]">
            Clinical Research Console
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Search registries worldwide and examine pharmacological comparison metrics
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left panel: Search trials */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)] border-b border-[var(--border-light)] pb-3 mb-4">
                Query Trials Registry
              </h3>

              <form onSubmit={handleSearch} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Disease Condition
                  </label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Lung Cancer"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)] text-sm text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)] transition-colors duration-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Therapeutic Drug (Optional)
                  </label>
                  <input
                    type="text"
                    value={intervention}
                    onChange={(e) => setIntervention}
                    placeholder="e.g. Pembrolizumab"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)] text-sm text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)] transition-colors duration-200"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--bg-main)] font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-[0_0_12px_var(--primary-glow)]"
                >
                  <Search className="w-4 h-4" />
                  Search Database
                </button>
              </form>
            </div>

            {/* In-view Drug intelligence comparison */}
            <DrugComparisonTable />
          </div>

          {/* Right panel: Search Results */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-panel p-5">
              <div className="border-b border-[var(--border-light)] pb-3 mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)]">
                  Registry Search Results
                </h3>
                {submitted && data && (
                  <span className="text-xs font-semibold text-[var(--primary)]">
                    Found {data.totalCount} active studies
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                </div>
              ) : !submitted ? (
                <div className="text-center py-16 text-sm text-[var(--text-dim)] flex flex-col items-center gap-2">
                  <Activity className="w-8 h-8" />
                  Enter search criteria on the left to query the worldwide clinical trial database
                </div>
              ) : trials.length === 0 ? (
                <div className="text-center py-16 text-sm text-[var(--text-dim)]">
                  No registered clinical trials match your query.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {trials.map((trial) => (
                    <div key={trial.nct_id} className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)]/50 hover:border-gray-600 transition-colors duration-200 flex flex-col gap-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--primary-glow)] text-[var(--primary)] border border-[var(--border-glow)]">
                          {trial.nct_id}
                        </span>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-[var(--border-light)] text-[var(--text-muted)]">
                            {trial.phase}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            trial.status === 'COMPLETED' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {trial.status}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-[var(--text-main)]">
                        {trial.title}
                      </h4>

                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {trial.summary}
                      </p>

                      <div className="border-t border-[var(--border-light)] pt-3 mt-1.5 flex flex-wrap gap-4 text-[11px] text-[var(--text-dim)]">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[var(--primary)]" />
                          <span>**Condition:** {trial.conditions.slice(0, 2).join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[var(--secondary)]" />
                          <span>**Cohort:** {trial.std_ages.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
