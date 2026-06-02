import React from 'react';
import Sidebar from '../components/Sidebar';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { Shield, Activity, Users, Database, DollarSign, Terminal } from 'lucide-react';

const mockAuditLogs = [
  { timestamp: '2026-05-29 09:44:12', user: 'Dr. Evelyn Harper', action: 'User Register', details: 'Initialized workspace with researcher role' },
  { timestamp: '2026-05-29 09:44:15', user: 'Dr. Evelyn Harper', action: 'User Login', details: 'Successful JWT authorization challenge' },
  { timestamp: '2026-05-29 09:44:20', user: 'System Worker', action: 'Pinecone Upsert', details: 'Indexed 7 chunks for document: Keynote-001.pdf' },
  { timestamp: '2026-05-29 09:44:22', user: 'Dr. Evelyn Harper', action: 'RAG Query Executed', details: 'Searched: Pembrolizumab efficacy in NSCLC' },
  { timestamp: '2026-05-29 09:44:23', user: 'System Worker', action: 'Cypher Node Merged', details: 'Inserted node (Drug {id: "Pembrolizumab"}) to Neo4j' },
  { timestamp: '2026-05-29 09:44:24', user: 'Dr. Evelyn Harper', action: 'Report Generated', details: 'Compiled clinical intelligence brief ID: 104' }
];

const mockUsers = [
  { id: 1, name: 'Dr. Evelyn Harper', email: 'e.harper@healthcare.org', role: 'researcher', status: 'Active' },
  { id: 2, name: 'Cyril Kumar Selvaraj', email: 'c.kumar@healthcare.org', role: 'admin', status: 'Active' }
];

// Token usage data for charts
const tokenUsageData = [
  { day: 'Mon', inputTokens: 42000, outputTokens: 18000 },
  { day: 'Tue', inputTokens: 55000, outputTokens: 25000 },
  { day: 'Wed', inputTokens: 78000, outputTokens: 38000 },
  { day: 'Thu', inputTokens: 62000, outputTokens: 29000 },
  { day: 'Fri', inputTokens: 95000, outputTokens: 49000 }
];

// Cost distribution by agent
const costData = [
  { name: 'Literature Reviewer', cost: 12.45, fill: 'hsl(190, 95%, 45%)' },
  { name: 'Report Generator', cost: 8.80, fill: 'hsl(270, 95%, 65%)' },
  { name: 'RAG Retriever', cost: 5.12, fill: 'hsl(315, 90%, 55%)' },
  { name: 'Research Planner', cost: 3.50, fill: 'hsl(145, 80%, 50%)' }
];

export default function Admin() {
  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
        <header className="border-b border-[var(--border-light)] pb-4">
          <h1 className="text-2xl font-bold font-['Outfit'] tracking-wide text-[var(--text-main)] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[var(--primary)]" />
            System Administration Panel
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Monitor API token rates, accumulated cost statistics, user credentials, and security audit logs
          </p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Active Sessions</span>
              <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">2 Users</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Indexed Documents</span>
              <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">14 Files</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Total Queries</span>
              <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">348 Cycles</h3>
            </div>
          </div>

          <div className="glass-panel p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">API Cost (MTD)</span>
              <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">$29.87</h3>
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Token Usage Chart */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)] border-b border-[var(--border-light)] pb-3 mb-4">
              Daily Token Ingestion Rates
            </h3>
            <div className="h-[200px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tokenUsageData}>
                  <defs>
                    <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(190, 100%, 45%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(190, 100%, 45%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" />
                  <YAxis stroke="rgba(255,255,255,0.4)" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(223, 20%, 10%)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                  <Area type="monotone" dataKey="inputTokens" stroke="hsl(190, 100%, 45%)" fillOpacity={1} fill="url(#colorInput)" name="Input Tokens" />
                  <Area type="monotone" dataKey="outputTokens" stroke="hsl(270, 95%, 65%)" fill="none" name="Output Tokens" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Allocation Chart */}
          <div className="glass-panel p-5">
            <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)] border-b border-[var(--border-light)] pb-3 mb-4">
              Agent Model Cost Allocations ($)
            </h3>
            <div className="h-[200px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" />
                  <YAxis stroke="rgba(255,255,255,0.4)" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(223, 20%, 10%)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                  <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
                    {costData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* User Management and Audit Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* User list */}
          <div className="lg:col-span-1 glass-panel p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)] border-b border-[var(--border-light)] pb-3">
              User Directories
            </h3>
            <div className="flex flex-col gap-3">
              {mockUsers.map((user) => (
                <div key={user.id} className="p-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)] flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-[var(--text-main)]">{user.name}</h4>
                    <p className="text-[var(--text-dim)] mt-0.5">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--primary-glow)] text-[var(--primary)]">
                      {user.role}
                    </span>
                    <span className="text-[9px] block text-emerald-400 font-semibold mt-1">
                      {user.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-2 glass-panel p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold tracking-wide uppercase text-[var(--text-main)] border-b border-[var(--border-light)] pb-3 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-[var(--primary)]" />
              Security Audit Trails
            </h3>

            <div className="overflow-x-auto rounded-xl border border-[var(--border-light)] bg-[var(--bg-sidebar)] text-xs">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--border-light)] bg-white/5 text-[var(--text-muted)] font-bold">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Operator</th>
                    <th className="p-3">Event Action</th>
                    <th className="p-3">Operational Details</th>
                  </tr>
                </thead>
                <tbody>
                  {mockAuditLogs.map((log, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-[var(--border-light)] hover:bg-white/[0.01]"
                    >
                      <td className="p-3 text-[var(--text-dim)] font-mono">{log.timestamp}</td>
                      <td className="p-3 font-semibold text-[var(--text-main)]">{log.user}</td>
                      <td className="p-3 font-bold uppercase text-[10px] text-[var(--primary)]">{log.action}</td>
                      <td className="p-3 text-[var(--text-muted)]">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
