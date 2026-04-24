'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Plus, Sparkles, Loader2, Trash2, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import { supabase, type Transaction } from '../../lib/supabase';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) setError(error.message);
    else setTransactions(data || []);
    setLoading(false);
  };

  const handleDescriptionBlur = async () => {
    if (!description.trim() || type === 'income') return;
    setLoadingCategory(true);
    
    // Quick client-side fallback logic if the ML API is not deployed yet
    const descLower = description.toLowerCase();
    let fallbackCategory = 'Others';
    if (descLower.match(/food|swiggy|zomato|grocery|vegetable|dinner|lunch|breakfast|restaurant|fruit|snack|pizza|burger|kfc|starbucks|bakery|chai|sandwich|milk|rice/)) fallbackCategory = 'Food';
    else if (descLower.match(/petrol|uber|transport|bus|train|taxi|ola|rapido|fuel|metro|toll|parking|vehicle|bike|car|auto rickshaw|ferry/)) fallbackCategory = 'Transport';
    else if (descLower.match(/movie|ticket|netflix|entertainment|concert|gaming|game|spotify|theme park|museum|bowling|amusement|gaming|video game|live show|escape room/)) fallbackCategory = 'Entertainment';
    else if (descLower.match(/medicine|health|doctor|pharmacy|hospital|dentist|gym|yoga|clinic|test|lab|physiotherapy|mental health/)) fallbackCategory = 'Health';
    else if (descLower.match(/bill|electricity|water|recharge|phone|broadband|internet|rent|maintenance|dth|insurance|emi|loan/)) fallbackCategory = 'Bills';
    else if (descLower.match(/shopping|clothes|amazon|flipkart|shoes|dress|tshirt|laptop|appliance|furniture|handbag|jeans|decor|kitchenware/)) fallbackCategory = 'Shopping';
    else if (descLower.match(/tuition|school|college|course|udemy|coursera|education|book|textbook|notebook|stationery|exam|pen|pencil|printing/)) fallbackCategory = 'Education';
    else if (descLower.match(/flight|travel|hotel|trip|holiday|stay|visa|airport|resort|airbnb/)) fallbackCategory = 'Travel';

    try {
      const mlUrl = process.env.NEXT_PUBLIC_ML_API_URL || 'http://127.0.0.1:8000';
      const response = await axios.post(`${mlUrl}/predict`, { description });
      const predictedCategory = response.data.category;
      
      // If AI returns 'Others' but our keyword check found a match, use the keyword match
      if (predictedCategory === 'Others' && fallbackCategory !== 'Others') {
        setCategory(fallbackCategory);
      } else {
        setCategory(predictedCategory);
      }
    } catch {
      setCategory(fallbackCategory);
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }
    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id, description, amount: parseFloat(amount), type,
      category: type === 'income' ? 'Income' : (category || 'Others'), date,
    }).select().single();
    if (error) { setError(error.message); }
    else if (data) {
      setTransactions([data, ...transactions]);
      setDescription(''); setAmount(''); setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const isIncome = type === 'income';

  return (
    <div className="min-h-screen p-8 text-slate-100 selection:bg-purple-500/30">
      <div className="mb-10 flex items-center gap-4 animate-fade-in">
        <Link href="/" className="p-2 glass-panel rounded-full hover:bg-slate-800 transition-colors">
          <ArrowLeft size={20} className="text-slate-300" />
        </Link>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-sky-400">
          Manage Transactions
        </h1>
      </div>

      {error && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-400">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl animate-fade-in sticky top-8">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              {isIncome ? <Briefcase className="text-emerald-400" /> : <Plus className="text-purple-400" />}
              {isIncome ? 'Record Income' : 'New Expense'}
            </h2>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex p-1 bg-slate-900/50 rounded-lg overflow-hidden">
                <button type="button" onClick={() => { setType('expense'); setCategory(''); }} className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", !isIncome ? "bg-rose-500/20 text-rose-400" : "text-slate-400 hover:text-white")}>Expense</button>
                <button type="button" onClick={() => { setType('income'); setCategory(''); }} className={cn("flex-1 py-2 text-sm font-medium rounded-md transition-all", isIncome ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-white")}>Income</button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isIncome ? 'Source of Income' : 'Description'}
                </label>
                <input
                  type="text" required value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={isIncome ? undefined : handleDescriptionBlur}
                  placeholder={isIncome ? 'e.g., Salary, Freelance, Investment returns' : 'e.g., Grocery shopping'}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-slate-200 placeholder-slate-600"
                />
                {!isIncome && loadingCategory && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-purple-400">
                    <Loader2 size={12} className="animate-spin" /> Using AI to detect category...
                  </div>
                )}
              </div>

              <div className={isIncome ? '' : 'grid grid-cols-2 gap-4'}>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Amount (₹)</label>
                  <input
                    type="number" step="0.01" required value={amount}
                    onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-slate-200 placeholder-slate-600"
                  />
                </div>
                {!isIncome && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                    <div className="relative">
                      <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Auto-filled"
                        className="w-full bg-slate-900/50 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-purple-200" />
                      {category && !loadingCategory && (
                        <Sparkles size={14} className="absolute right-3 top-3 text-purple-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-slate-200 [color-scheme:dark]" />
              </div>

              <button type="submit" disabled={saving}
                className={cn("w-full font-semibold py-3 rounded-xl shadow-lg transition-all mt-4 flex items-center justify-center gap-2 text-white",
                  isIncome ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                           : "bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 shadow-[0_0_20px_rgba(147,51,234,0.3)]",
                  saving && "opacity-60"
                )}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {saving ? 'Saving...' : isIncome ? 'Save Income' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/20">
              <h2 className="text-xl font-semibold">Recent Transactions</h2>
              <span className="text-xs text-slate-400">{transactions.length} total</span>
            </div>
            <div className="divide-y divide-slate-800/50">
              {loading ? (
                <div className="p-12 flex justify-center"><Loader2 size={32} className="animate-spin text-purple-400" /></div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">No transactions yet. Add some!</div>
              ) : transactions.map((t) => (
                <div key={t.id} className="p-5 flex justify-between items-center hover:bg-slate-800/30 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-full flex justify-center items-center font-bold text-sm", t.type === 'income' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                      {t.type === 'income' ? '+' : '-'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">{t.description}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{t.date}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span className={cn("text-xs px-2 py-0.5 rounded-md border",
                          t.type === 'income' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        )}>{t.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn("font-bold", t.type === 'income' ? "text-emerald-400" : "text-slate-200")}>
                      {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                    </span>
                    <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-500/20 rounded-lg text-rose-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
