import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Upload, Download, Plus, Trash2, TrendingUp } from 'lucide-react';

const BudgetApp = () => {
  const [months, setMonths] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));
  const [view, setView] = useState('dashboard'); // dashboard, budget, expenses, trends
  const [categories, setCategories] = useState([]);
  const [newExpense, setNewExpense] = useState({ date: new Date().toISOString().slice(0, 10), category: '', amount: '', description: '' });

  // Default categories
  const defaultCategories = [
    { id: 'rent', name: 'Rent', color: '#FF6B6B', budget: 0 },
    { id: 'utilities', name: 'Utilities', color: '#4ECDC4', budget: 0 },
    { id: 'groceries', name: 'Groceries', color: '#45B7D1', budget: 0 },
    { id: 'dining', name: 'Dining Out', color: '#FFA07A', budget: 0 },
    { id: 'transport', name: 'Transportation', color: '#98D8C8', budget: 0 },
    { id: 'health', name: 'Healthcare', color: '#F7DC6F', budget: 0 },
    { id: 'insurance', name: 'Insurance', color: '#BB8FCE', budget: 0 },
    { id: 'entertainment', name: 'Entertainment', color: '#85C1E9', budget: 0 },
    { id: 'other', name: 'Miscellaneous', color: '#D5D8DC', budget: 0 },
  ];

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('budgetData');
    const savedCats = localStorage.getItem('categories');
    if (saved) setMonths(JSON.parse(saved));
    if (savedCats) setCategories(JSON.parse(savedCats));
    else setCategories(defaultCategories);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('budgetData', JSON.stringify(months));
  }, [months]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // Get or create month record
  const getMonth = (monthKey) => {
    let month = months.find(m => m.month === monthKey);
    if (!month) {
      month = {
        month: monthKey,
        income: 0,
        expenses: [],
        budgets: defaultCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.budget }), {})
      };
      setMonths([...months, month]);
    }
    return month;
  };

  const currentMonthData = getMonth(currentMonth);

  // Add expense
  const addExpense = () => {
    if (!newExpense.category || !newExpense.amount) return;
    const updated = months.map(m => 
      m.month === currentMonth 
        ? {
            ...m,
            expenses: [...m.expenses, {
              id: Date.now(),
              ...newExpense,
              amount: parseFloat(newExpense.amount)
            }]
          }
        : m
    );
    setMonths(updated);
    setNewExpense({ date: new Date().toISOString().slice(0, 10), category: '', amount: '', description: '' });
  };

  // Delete expense
  const deleteExpense = (expenseId) => {
    const updated = months.map(m =>
      m.month === currentMonth
        ? { ...m, expenses: m.expenses.filter(e => e.id !== expenseId) }
        : m
    );
    setMonths(updated);
  };

  // Update budget for category
  const updateBudget = (categoryId, amount) => {
    const updated = months.map(m =>
      m.month === currentMonth
        ? { ...m, budgets: { ...m.budgets, [categoryId]: parseFloat(amount) || 0 } }
        : m
    );
    setMonths(updated);
  };

  // Calculate totals
  const calculateTotals = (monthData) => {
    const byCategory = {};
    categories.forEach(cat => byCategory[cat.id] = 0);
    
    monthData.expenses.forEach(exp => {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    });
    
    return {
      byCategory,
      total: Object.values(byCategory).reduce((a, b) => a + b, 0),
      income: monthData.income
    };
  };

  const totals = calculateTotals(currentMonthData);
  const savings = totals.income - totals.total;
  const savingsRate = totals.income > 0 ? ((savings / totals.income) * 100).toFixed(1) : 0;

  // Budget vs Actual data for chart
  const budgetVsActual = categories.map(cat => ({
    name: cat.name,
    budget: currentMonthData.budgets[cat.id] || 0,
    actual: totals.byCategory[cat.id] || 0,
    variance: (currentMonthData.budgets[cat.id] || 0) - (totals.byCategory[cat.id] || 0)
  }));

  // Trend data (last 6 months)
  const trendData = [...months]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(m => {
      const t = calculateTotals(m);
      return {
        month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        income: t.income,
        expenses: t.total,
        savings: t.income - t.total,
        savingsRate: t.income > 0 ? ((t.income - t.total) / t.income * 100) : 0
      };
    });

  // Expense pie data
  const pieData = categories
    .filter(cat => totals.byCategory[cat.id] > 0)
    .map(cat => ({
      name: cat.name,
      value: totals.byCategory[cat.id],
      color: cat.color
    }));

  // CSV Export
  const exportCSV = () => {
    const rows = [
      ['Budget Analysis - ' + currentMonth],
      [],
      ['Income', totals.income],
      ['Total Expenses', totals.total],
      ['Savings', savings],
      ['Savings Rate %', savingsRate],
      [],
      ['Category', 'Budget', 'Actual', 'Variance'],
      ...budgetVsActual.map(b => [b.name, b.budget, b.actual, b.variance]),
      [],
      ['Date', 'Category', 'Amount', 'Description'],
      ...currentMonthData.expenses.map(e => [e.date, e.category, e.amount, e.description || ''])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-${currentMonth}.csv`;
    a.click();
  };

  // CSV Import (simplified)
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      alert('CSV import ready. For now, manually add expenses or use the form. Full import coming in Phase 2.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-500" />
              <h1 className="text-2xl font-bold text-white">Budget Tracker</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" /> Export
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition cursor-pointer">
                <Upload className="w-4 h-4" /> Import
                <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
              </label>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-4">
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="px-4 py-2 bg-slate-800 text-white border border-slate-600 rounded-lg"
            />
            <div className="flex gap-2">
              {['dashboard', 'budget', 'expenses', 'trends'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-lg transition ${
                    view === v
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Income', value: totals.income.toFixed(2), color: 'emerald' },
                { label: 'Total Expenses', value: totals.total.toFixed(2), color: 'red' },
                { label: 'Savings', value: savings.toFixed(2), color: savings >= 0 ? 'blue' : 'orange' },
                { label: 'Savings Rate', value: savingsRate + '%', color: 'purple' }
              ].map((kpi, i) => (
                <div key={i} className={`bg-gradient-to-br from-${kpi.color}-900 to-${kpi.color}-800 rounded-lg p-6 border border-${kpi.color}-700`}>
                  <p className="text-slate-300 text-sm font-medium">{kpi.label}</p>
                  <p className="text-3xl font-bold text-white mt-2">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget vs Actual */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Budget vs Actual</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetVsActual.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Legend />
                    <Bar dataKey="budget" fill="#3b82f6" />
                    <Bar dataKey="actual" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Distribution */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Expense Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value.toFixed(0)}`} outerRadius={80} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toFixed(2)} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Budget Setup View */}
        {view === 'budget' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Monthly Budget Setup</h2>
              
              {/* Monthly Income */}
              <div className="mb-8 pb-8 border-b border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Income (AED)</label>
                <input
                  type="number"
                  value={currentMonthData.income}
                  onChange={(e) => {
                    const updated = months.map(m =>
                      m.month === currentMonth ? { ...m, income: parseFloat(e.target.value) || 0 } : m
                    );
                    setMonths(updated);
                  }}
                  className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                />
              </div>

              {/* Category Budgets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                  <div key={cat.id}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: cat.color }}></span>
                      {cat.name} (AED)
                    </label>
                    <input
                      type="number"
                      value={currentMonthData.budgets[cat.id] || 0}
                      onChange={(e) => updateBudget(cat.id, e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                      placeholder="0"
                    />
                    <p className="text-xs text-slate-400 mt-1">Actual: {(totals.byCategory[cat.id] || 0).toFixed(2)} AED</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Expenses View */}
        {view === 'expenses' && (
          <div className="space-y-6">
            {/* Add Expense */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Add Expense</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                />
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                >
                  <option value="">Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                />
                <button
                  onClick={addExpense}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Expenses ({currentMonthData.expenses.length})</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentMonthData.expenses
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(exp => {
                    const cat = categories.find(c => c.id === exp.category);
                    return (
                      <div key={exp.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color }}></span>
                          <div className="flex-1">
                            <p className="text-white font-medium">{cat?.name}</p>
                            <p className="text-xs text-slate-400">{exp.date} {exp.description && `• ${exp.description}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-white font-semibold">{exp.amount.toFixed(2)} AED</p>
                          <button
                            onClick={() => deleteExpense(exp.id)}
                            className="p-2 hover:bg-red-600 text-red-400 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Trends View */}
        {view === 'trends' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Income vs Expenses (6 Months)</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                  <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} name="Savings" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Savings Rate Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} formatter={(value) => value.toFixed(1) + '%'} />
                  <Bar dataKey="savingsRate" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetApp;
