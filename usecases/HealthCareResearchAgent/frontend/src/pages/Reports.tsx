import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Sidebar from '../components/Sidebar';
import { BookOpen, Calendar, ChevronRight, Copy, Download, Loader2, Plus, Sparkles } from 'lucide-react';

interface ReportInfo {
  id: number;
  title: string;
  created_at: string;
}

interface Citation {
  source: string;
  doi: string | null;
  url: string | null;
}

interface ReportDetails {
  id: number;
  title: string;
  report_content: string;
  created_at: string;
  citations: Citation[];
}

export default function Reports() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [newReportQuery, setNewReportQuery] = useState('');
  const [generating, setGenerating] = useState(false);

  // Fetch Report List
  const { data: reports = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['reportsList'],
    queryFn: async () => {
      const res = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Reports fetch failed');
      return res.json() as Promise<ReportInfo[]>;
    },
    enabled: !!token
  });

  // Fetch Selected Report details
  const { data: activeReport, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['reportDetails', selectedReportId],
    queryFn: async () => {
      if (!selectedReportId) return null;
      const res = await fetch(`/api/reports/${selectedReportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load report detail');
      return res.json() as Promise<ReportDetails>;
    },
    enabled: !!selectedReportId && !!token
  });

  // Generate Report Mutation
  const generateMutation = useMutation({
    mutationFn: async (queryText: string) => {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: queryText })
      });
      if (!res.ok) throw new Error('Report generation failed');
      return res.json() as Promise<ReportInfo>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reportsList'] });
      setSelectedReportId(data.id);
      setNewReportQuery('');
      setGenerating(false);
    },
    onError: () => {
      setGenerating(false);
    }
  });

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportQuery.trim()) return;
    setGenerating(true);
    generateMutation.mutate(newReportQuery);
  };

  const handleCopy = () => {
    if (activeReport?.report_content) {
      navigator.clipboard.writeText(activeReport.report_content);
      alert('Report copied to clipboard!');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        
        {/* Left side list of reports */}
        <div className="w-80 border-r border-[var(--border-light)] bg-[var(--bg-sidebar)] flex flex-col overflow-hidden shrink-0">
          <div className="p-5 border-b border-[var(--border-light)] flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)]">
                Research Report Library
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Access compiled clinical evidence documents
              </p>
            </div>

            {/* In-sidebar Creator input */}
            <form onSubmit={handleCreateReport} className="flex gap-2">
              <input
                type="text"
                required
                disabled={generating}
                value={newReportQuery}
                onChange={(e) => setNewReportQuery(e.target.value)}
                placeholder="Target disease for report..."
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-main)] text-xs text-[var(--text-main)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--primary)] transition-colors duration-200"
              />
              <button
                type="submit"
                disabled={generating}
                className="w-8 h-8 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--bg-main)] flex items-center justify-center shrink-0 disabled:opacity-50"
                title="Compile new report"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>

          {/* List panel */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {isLoadingList ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-xs text-[var(--text-dim)]">
                No reports compiled. Type in the query above to trigger the report generator agent.
              </div>
            ) : (
              reports.map((rep) => {
                const isActive = rep.id === selectedReportId;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReportId(rep.id)}
                    className={`flex items-start justify-between p-3.5 rounded-xl border text-left transition-all duration-150 ${
                      isActive
                        ? 'bg-[var(--primary-glow)] border-[var(--primary)] text-[var(--primary)]'
                        : 'bg-transparent border-[var(--border-light)] text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold truncate leading-snug">
                        {rep.title}
                      </h4>
                      <span className="text-[10px] text-[var(--text-dim)] flex items-center gap-1.5 mt-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(rep.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-dim)] shrink-0 self-center" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right side report details renderer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-main)]">
          {selectedReportId ? (
            isLoadingDetails ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
              </div>
            ) : activeReport ? (
              <>
                {/* Header operations */}
                <header className="px-6 py-4 border-b border-[var(--border-light)] flex items-center justify-between shrink-0">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-[var(--text-main)] font-['Outfit'] truncate">
                      {activeReport.title}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Compiled: {new Date(activeReport.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-gray-500 flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </button>
                  </div>
                </header>

                {/* Report Content Body Render */}
                <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
                  <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--text-muted)] flex flex-col gap-6">
                    {/* Parse simple markdown structures like headings and tables */}
                    {activeReport.report_content.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('# ')) {
                        return <h1 key={pIdx} className="text-2xl font-bold font-['Outfit'] text-[var(--text-main)] mt-4 border-b border-[var(--border-light)] pb-2">{paragraph.replace('# ', '')}</h1>;
                      }
                      if (paragraph.startsWith('## ')) {
                        return <h2 key={pIdx} className="text-lg font-bold font-['Outfit'] text-[var(--text-main)] mt-3 border-b border-white/5 pb-1">{paragraph.replace('## ', '')}</h2>;
                      }
                      if (paragraph.startsWith('|')) {
                        // Render basic Markdown Table
                        const rows = paragraph.split('\n').filter(r => r.trim());
                        return (
                          <div key={pIdx} className="overflow-x-auto my-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)]">
                            <table className="w-full border-collapse text-left text-xs">
                              <tbody>
                                {rows.map((row, rIdx) => {
                                  // Skip separator line | :--- | :--- |
                                  if (row.includes('---')) return null;
                                  const cols = row.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
                                  const isHeader = rIdx === 0;
                                  return (
                                    <tr key={rIdx} className="border-b border-[var(--border-light)] hover:bg-white/[0.01]">
                                      {cols.map((col, cIdx) => (
                                        isHeader ? (
                                          <th key={cIdx} className="p-3 bg-white/5 font-bold text-[var(--primary)] uppercase tracking-wider">{col}</th>
                                        ) : (
                                          <td key={cIdx} className="p-3 text-[var(--text-muted)] font-medium leading-relaxed">{col.replace(/\*\*/g, '')}</td>
                                        )
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                        const items = paragraph.split('\n');
                        return (
                          <ul key={pIdx} className="list-disc pl-5 flex flex-col gap-1.5">
                            {items.map((item, iIdx) => (
                              <li key={iIdx} className="text-[var(--text-muted)]">
                                {item.replace(/^-\s+/, '').replace(/^\*\s+/, '').replace(/\*\*/g, '')}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p key={pIdx} className="text-[var(--text-muted)] leading-relaxed">
                          {paragraph.replace(/\*\*/g, '')}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-[var(--text-dim)]">
                Failed to load report.
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[var(--text-dim)] p-8">
              <BookOpen className="w-12 h-12 text-[var(--border-glow)] pulse-glow rounded-xl p-2 bg-[var(--bg-card)] border border-[var(--border-light)]" />
              <div className="text-center max-w-sm">
                <h4 className="text-sm font-semibold text-[var(--text-main)]">No Report Selected</h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Select an existing report from the left library sidebar, or enter a target query to compile a new clinical intelligence analysis.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
