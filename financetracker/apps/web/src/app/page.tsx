'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Sparkles, Activity, LogOut, X, Loader2, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import { supabase, type Transaction } from '../lib/supabase';

const COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#ec4899', '#14b8a6', '#a78bfa', '#fb923c'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type SavingsView = 'weekly' | 'monthly' | 'yearly';

// ─── Custom Tooltip for Pie Chart ─────────────────────────────────────────────
const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string } }> }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-slate-200 font-semibold text-sm">{item.payload.name}</p>
        <p className="text-emerald-400 font-bold text-base mt-0.5">₹{Number(item.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
      </div>
    );
  }
  return null;
};

// ─── Custom Tooltip for Bar/Area Charts ────────────────────────────────────────
const SavingsTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-slate-300 text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className={`font-bold text-sm ${p.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {p.name}: ₹{Math.abs(p.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [savingsView, setSavingsView] = useState<SavingsView>('monthly');

  useEffect(() => {
    setMounted(true);
    initDashboard();
  }, []);

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    setUserEmail(user.email || '');
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // ── Computed stats ─────────────────────────────────────────────────────────
  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpenses = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [transactions]);
  const balance = totalIncome - totalExpenses;

  // ── Cash flow chart (last 6 months) ───────────────────────────────────────
  const cashFlowData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const mTxs = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      });
      return {
        name: MONTH_NAMES[d.getMonth()],
        income: mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expenses: mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [transactions]);

  // ── Savings chart data (view-aware) ───────────────────────────────────────
  const savingsData = useMemo(() => {
    const now = new Date();

    if (savingsView === 'weekly') {
      // Show each day of the current week (Mon–Sun)
      const startOfWeek = new Date(now);
      const day = now.getDay(); // 0=Sun
      startOfWeek.setDate(now.getDate() - ((day + 6) % 7)); // Monday
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayTxs = transactions.filter(t => t.date === dateStr);
        const inc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { name: DAY_NAMES[d.getDay()], savings: Math.round((inc - exp) * 100) / 100 };
      });
    }

    if (savingsView === 'monthly') {
      // Show last 12 months
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        const mTxs = transactions.filter(t => {
          const td = new Date(t.date);
          return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
        });
        const inc = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { name: MONTH_NAMES[d.getMonth()], savings: Math.round((inc - exp) * 100) / 100 };
      });
    }

    // yearly: show each month of the current year
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), i, 1);
      const mTxs = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === now.getFullYear() && td.getMonth() === i;
      });
      const inc = mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { name: MONTH_NAMES[i], savings: Math.round((inc - exp) * 100) / 100 };
    });
  }, [transactions, savingsView]);

  // ── Category pie ───────────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 9);
  }, [transactions]);

  // ── AI insight ─────────────────────────────────────────────────────────────
  const topCategory = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const map: Record<string, number> = {};
    thisMonth.forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], amount: sorted[0][1] } : null;
  }, [transactions]);

  const fmt = (v: number) => `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!mounted) return null;

  return (
    <div className="min-h-screen p-8 text-slate-100 font-sans selection:bg-purple-500/30">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-10 animate-fade-in">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-sky-400">
            Nexus Finance
          </h1>
          <p className="text-slate-400 mt-1">AI-Powered personal insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/transactions" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-[0_0_15px_rgba(147,51,234,0.5)] flex items-center">
            + Add Transaction
          </Link>
          <button
            onClick={handleSignOut}
            title={`Sign out (${userEmail})`}
            className="p-2 glass-panel rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-rose-400"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 animate-fade-in" style={{ animationDelay: '100ms' }}>
        {[
          { label: 'Total Balance', value: fmt(balance), icon: <Wallet className="text-purple-400" size={24} />, iconBg: 'bg-purple-500/20', blob: 'bg-purple-500/10', sub: `${transactions.length} total transactions` },
          { label: 'Total Income', value: fmt(totalIncome), icon: <TrendingUp className="text-emerald-400" size={24} />, iconBg: 'bg-emerald-500/20', blob: 'bg-emerald-500/10', sub: `${transactions.filter(t => t.type === 'income').length} income entries` },
          { label: 'Total Expenses', value: fmt(totalExpenses), icon: <TrendingDown className="text-rose-400" size={24} />, iconBg: 'bg-rose-500/20', blob: 'bg-rose-500/10', sub: `${transactions.filter(t => t.type === 'expense').length} expense entries` },
        ].map(card => (
          <div key={card.label} className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.blob} rounded-full blur-3xl -mr-10 -mt-10 group-hover:opacity-150 transition-all`} />
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-400 text-sm font-medium">{card.label}</p>
                {loading ? <Loader2 size={24} className="animate-spin text-purple-400 mt-2" /> : (
                  <h2 className="text-3xl font-bold mt-1 text-white">{card.value}</h2>
                )}
              </div>
              <div className={`p-3 ${card.iconBg} rounded-xl`}>{card.icon}</div>
            </div>
            <div className="text-sm text-slate-400">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main Charts Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>

        {/* Cash Flow Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="text-sky-400" size={20} /> Cash Flow Trends
            </h3>
            <span className="text-xs text-slate-400">Last 6 months</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#f1f5f9', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#f1f5f9', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} width={70} />
                <Tooltip content={<SavingsTooltip />} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gIncome)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#gExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insight + Distribution */}
        <div className="space-y-6">
          {/* AI Insight */}
          <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Sparkles size={80} className="text-purple-400 mix-blend-screen animate-pulse-slow" />
            </div>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="text-purple-400" size={18} /> AI Insight
            </h3>
            <p className="text-sm text-slate-300 relative z-10 leading-relaxed mb-3">
              {topCategory
                ? <>Top spend this month: <strong className="text-white">{topCategory.name}</strong> (₹{topCategory.amount.toFixed(2)}). Consider reviewing this budget to save more.</>
                : 'Add transactions to unlock AI-powered spending insights.'}
            </p>
            <button onClick={() => setShowReport(true)} className="text-xs font-semibold text-purple-400 hover:text-purple-300 cursor-pointer z-10 relative transition-colors">
              View Detailed Report →
            </button>
          </div>

          {/* Pie Distribution */}
          <div className="glass-panel rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-3 text-slate-100">Expense Distribution</h3>
            {categoryData.length === 0 ? (
              <p className="text-slate-500 text-sm italic text-center py-6">No expense data yet</p>
            ) : (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value" stroke="none">
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                  {categoryData.map((item, idx) => (
                    <div key={item.name} className="flex items-center text-xs text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Savings Overview Bar Chart ─────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 className="text-emerald-400" size={20} /> Savings Overview
          </h3>
          {/* Toggle */}
          <div className="flex p-1 bg-slate-900/60 rounded-xl overflow-hidden">
            {(['weekly', 'monthly', 'yearly'] as SavingsView[]).map(view => (
              <button
                key={view}
                onClick={() => setSavingsView(view)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all duration-200 ${
                  savingsView === view
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={savingsData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#f1f5f9', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#f1f5f9', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} width={70} />
              <Tooltip content={<SavingsTooltip />} />
              <Bar
                dataKey="savings"
                name="Savings"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              >
                {savingsData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.savings >= 0 ? '#10b981' : '#f43f5e'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          Green = Positive Savings &nbsp;·&nbsp; Red = Deficit (Expenses &gt; Income)
        </p>
      </div>

      {/* ── Detailed Report Modal ──────────────────────────────────────────── */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReport(false)} />
          <div className="relative glass-panel rounded-3xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto z-10 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="text-purple-400" size={22} /> Detailed Financial Report
              </h2>
              <button onClick={() => setShowReport(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Balance', value: fmt(balance), color: balance >= 0 ? 'text-emerald-400' : 'text-rose-400' },
                { label: 'Total Income', value: fmt(totalIncome), color: 'text-emerald-400' },
                { label: 'Total Expenses', value: fmt(totalExpenses), color: 'text-rose-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-900/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <h3 className="text-lg font-semibold mb-3 text-slate-200">Expense Breakdown by Category</h3>
            {categoryData.length === 0 ? (
              <p className="text-slate-500 italic text-sm">No expense data available.</p>
            ) : (
              <div className="space-y-3 mb-6">
                {categoryData.map((cat, idx) => (
                  <div key={cat.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-200">{cat.name}</span>
                      <span className="text-slate-300">{fmt(cat.value)} ({totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent transactions */}
            <h3 className="text-lg font-semibold mb-3 text-slate-200">Recent Transactions</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {transactions.slice(0, 10).map(t => (
                <div key={t.id} className="flex justify-between items-center py-2.5 px-3 bg-slate-900/40 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{t.description}</p>
                    <p className="text-xs text-slate-500">{t.date} · {t.category}</p>
                  </div>
                  <span className={`font-semibold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
