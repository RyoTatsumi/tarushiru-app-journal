'use client';

import React, { useState, useMemo } from 'react';
import { AssetRecord, MoneyConfig, BudgetProfile, FixedCostItem, UserProfile, AssetGoal } from '@/types';
import { ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, ReferenceLine, Cell } from 'recharts';
import { Plus, DollarSign, Settings, Trash2, TrendingUp, Sparkles, Loader2, ArrowRight, Wallet, PiggyBank, Briefcase, Copy, ToggleLeft, ToggleRight, Edit2, Check } from 'lucide-react';
import { analyzeAssetTrends } from '@/lib/aiService';
import { useToast } from '@/components/Toast';

const CATEGORY_COLORS = ['#102a43', '#334e68', '#486581', '#627d98', '#829ab1', '#9fb3c8', '#bcccdc', '#d9e2ec'];

interface MoneyProps {
  assets: AssetRecord[];
  onUpdateAssets: (assets: AssetRecord[]) => void;
  moneyConfig: MoneyConfig;
  onUpdateConfig: (config: MoneyConfig) => void;
  budgetProfile: BudgetProfile;
  onUpdateBudget: (budget: BudgetProfile) => void;
  profile?: UserProfile | null;
}

type TabMode = 'stock' | 'flow';

export const Money: React.FC<MoneyProps> = ({
    assets,
    onUpdateAssets,
    moneyConfig,
    onUpdateConfig,
    budgetProfile,
    onUpdateBudget,
    profile
}) => {
  const { showToast, showConfirm } = useToast();
  const [activeTab, setActiveTab] = useState<TabMode>('stock');
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // M5: Fixed cost editing state
  const [editingFixedCostId, setEditingFixedCostId] = useState<string | null>(null);
  const [editFixedName, setEditFixedName] = useState('');
  const [editFixedAmount, setEditFixedAmount] = useState('');

  // M7: Asset goal state
  const [isSettingGoal, setIsSettingGoal] = useState(false);
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalLabel, setGoalLabel] = useState('');

  // M2: Format amount helper
  const formatAmount = (val: number) => moneyConfig.displayInManYen ? `${(val / 10000).toFixed(1)}万円` : `¥${val.toLocaleString()}`;

  // --- Logic: Asset Management (Stock) ---
  const currentAssetRecord = useMemo(() => {
      return assets.find(r => r.month === selectedMonth) || { month: selectedMonth, values: {} };
  }, [assets, selectedMonth]);

  const hasExistingData = !!assets.find(r => r.month === selectedMonth);

  const previousMonthRecord = useMemo(() => {
      const d = new Date(selectedMonth + "-01");
      d.setMonth(d.getMonth() - 1);
      const prevMonthStr = d.toISOString().slice(0, 7);
      return assets.find(r => r.month !== selectedMonth && r.month === prevMonthStr);
  }, [assets, selectedMonth]);

  const previousYearRecord = useMemo(() => {
      const d = new Date(selectedMonth + "-01");
      d.setFullYear(d.getFullYear() - 1);
      const prevYearStr = d.toISOString().slice(0, 7);
      return assets.find(r => r.month !== selectedMonth && r.month === prevYearStr);
  }, [assets, selectedMonth]);

  // M1: Check if current month data is empty (no data or all zeros)
  const isCurrentMonthEmpty = useMemo(() => {
      const record = assets.find(r => r.month === selectedMonth);
      if (!record) return true;
      const values = Object.values(record.values) as number[];
      return values.length === 0 || values.every(v => v === 0);
  }, [assets, selectedMonth]);

  // M1: Find the most recent previous month with data
  const handleCopyPreviousMonth = () => {
      const sortedPrevious = [...assets]
          .filter(r => r.month < selectedMonth)
          .sort((a, b) => b.month.localeCompare(a.month));
      if (sortedPrevious.length === 0) {
          showToast('コピーできる前月データがありません', 'error');
          return;
      }
      const source = sortedPrevious[0];
      const otherRecords = assets.filter(r => r.month !== selectedMonth);
      onUpdateAssets([...otherRecords, { month: selectedMonth, values: { ...source.values } }]);
      showToast('前月のデータをコピーしました');
  };

  const handleAssetValueChange = (cat: string, valueStr: string) => {
      const val = valueStr === '' ? 0 : parseInt(valueStr, 10);
      const newValues = { ...currentAssetRecord.values, [cat]: val };
      const otherRecords = assets.filter(r => r.month !== selectedMonth);
      onUpdateAssets([...otherRecords, { month: selectedMonth, values: newValues }]);
  };

  const handleAddCategory = () => {
      if (newCategoryName && !moneyConfig.assetCategories.includes(newCategoryName)) {
          onUpdateConfig({
              ...moneyConfig,
              assetCategories: [...moneyConfig.assetCategories, newCategoryName]
          });
          setNewCategoryName('');
      }
  };

  const handleDeleteCategory = (cat: string) => {
      showConfirm({
          message: `${cat} を削除してもよろしいですか？`,
          confirmLabel: '削除する',
          onConfirm: () => {
              onUpdateConfig({
                  ...moneyConfig,
                  assetCategories: moneyConfig.assetCategories.filter(c => c !== cat)
              });
          }
      });
  };

  // M2: Toggle man-yen display
  const handleToggleManYen = () => {
      onUpdateConfig({ ...moneyConfig, displayInManYen: !moneyConfig.displayInManYen });
  };

  // --- Logic: Budget/Flow Management ---
  const [newFixedCostName, setNewFixedCostName] = useState('');
  const [newFixedCostAmount, setNewFixedCostAmount] = useState('');

  const handleAddFixedCost = () => {
      if (!newFixedCostName || !newFixedCostAmount) return;
      const newItem: FixedCostItem = {
          id: Date.now().toString(),
          name: newFixedCostName,
          amount: Number(newFixedCostAmount)
      };
      onUpdateBudget({
          ...budgetProfile,
          fixedCosts: [...budgetProfile.fixedCosts, newItem]
      });
      setNewFixedCostName('');
      setNewFixedCostAmount('');
  };

  const handleDeleteFixedCost = (id: string) => {
      onUpdateBudget({
          ...budgetProfile,
          fixedCosts: budgetProfile.fixedCosts.filter(item => item.id !== id)
      });
  };

  // M5: Start editing a fixed cost
  const handleStartEditFixedCost = (item: FixedCostItem) => {
      setEditingFixedCostId(item.id);
      setEditFixedName(item.name);
      setEditFixedAmount(String(item.amount));
  };

  // M5: Save edited fixed cost
  const handleSaveEditFixedCost = () => {
      if (!editingFixedCostId || !editFixedName || !editFixedAmount) return;
      onUpdateBudget({
          ...budgetProfile,
          fixedCosts: budgetProfile.fixedCosts.map(item =>
              item.id === editingFixedCostId
                  ? { ...item, name: editFixedName, amount: Number(editFixedAmount) }
                  : item
          )
      });
      setEditingFixedCostId(null);
      setEditFixedName('');
      setEditFixedAmount('');
  };

  // M5: Cancel editing
  const handleCancelEditFixedCost = () => {
      setEditingFixedCostId(null);
      setEditFixedName('');
      setEditFixedAmount('');
  };

  const handleIncomeChange = (val: string) => {
      onUpdateBudget({ ...budgetProfile, monthlyIncome: Number(val) });
  };

  const handleVariableBudgetChange = (val: string) => {
      onUpdateBudget({ ...budgetProfile, variableBudget: Number(val) });
  };

  // M7: Save asset goal
  const handleSaveGoal = () => {
      if (!goalTargetAmount || !goalTargetDate || !goalLabel) return;
      const goal: AssetGoal = {
          targetAmount: Number(goalTargetAmount),
          targetDate: goalTargetDate,
          label: goalLabel
      };
      onUpdateConfig({ ...moneyConfig, assetGoal: goal });
      setIsSettingGoal(false);
      setGoalTargetAmount('');
      setGoalTargetDate('');
      setGoalLabel('');
      showToast('資産目標を設定しました');
  };

  // M7: Delete asset goal
  const handleDeleteGoal = () => {
      showConfirm({
          message: '資産目標を削除してもよろしいですか？',
          confirmLabel: '削除する',
          onConfirm: () => {
              const { assetGoal, ...rest } = moneyConfig;
              onUpdateConfig({ ...rest, assetCategories: moneyConfig.assetCategories });
          }
      });
  };

  // --- Analysis ---
  const handleAnalyze = async () => {
      setIsAnalyzing(true);
      try {
          const result = await analyzeAssetTrends(assets, budgetProfile, profile);
          setAnalysisResult(result);
      } catch (e) {
          showToast('分析に失敗しました', 'error');
      } finally {
          setIsAnalyzing(false);
      }
  };

  // --- Data for Charts ---
  const assetChartData = moneyConfig.assetCategories.map(cat => ({
      name: cat,
      value: currentAssetRecord.values[cat] || 0
  })).filter(d => d.value > 0);

  // Use explicit casts to number[] to avoid arithmetic operation errors in TypeScript
  const totalAssets = assetChartData.reduce((acc, curr) => acc + curr.value, 0);
  const prevMonthTotal = previousMonthRecord ? (Object.values(previousMonthRecord.values) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;
  const prevYearTotal = previousYearRecord ? (Object.values(previousYearRecord.values) as number[]).reduce((a: number, b: number) => a + b, 0) : 0;

  // M4: Percentage change calculations
  const monthDiff = totalAssets - prevMonthTotal;
  const monthPct = prevMonthTotal !== 0 ? ((monthDiff / prevMonthTotal) * 100).toFixed(1) : null;
  const yearDiff = totalAssets - prevYearTotal;
  const yearPct = prevYearTotal !== 0 ? ((yearDiff / prevYearTotal) * 100).toFixed(1) : null;

  // M3: Trend data with per-category values for stacked area chart
  const trendData = useMemo(() => {
      const sortedAssets = [...assets].sort((a, b) => a.month.localeCompare(b.month));
      return sortedAssets.map(record => {
          const total = (Object.values(record.values) as number[]).reduce((sum, val) => sum + val, 0);
          const entry: Record<string, string | number> = { month: record.month, total };
          moneyConfig.assetCategories.forEach(cat => {
              entry[cat] = record.values[cat] || 0;
          });
          return entry;
      });
  }, [assets, moneyConfig.assetCategories]);

  // Flow Chart Data
  const totalFixedCosts = budgetProfile.fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = totalFixedCosts + budgetProfile.variableBudget;
  const surplus = budgetProfile.monthlyIncome - totalExpenses;

  // M6: Savings rate calculation
  const savingsRate = budgetProfile.monthlyIncome > 0 ? (surplus / budgetProfile.monthlyIncome) * 100 : 0;
  const savingsRateColor = savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-500';

  // M7: Asset goal progress
  const assetGoal = moneyConfig.assetGoal;
  const goalProgress = assetGoal ? Math.min((totalAssets / assetGoal.targetAmount) * 100, 100) : 0;
  const goalRemaining = assetGoal ? assetGoal.targetAmount - totalAssets : 0;
  const goalRemainingTime = useMemo(() => {
      if (!assetGoal) return '';
      const now = new Date();
      const target = new Date(assetGoal.targetDate);
      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) return '期限超過';
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
          const years = Math.floor(diffDays / 365);
          const months = Math.floor((diffDays % 365) / 30);
          return `残り${years}年${months}ヶ月`;
      }
      if (diffDays > 30) {
          return `残り${Math.floor(diffDays / 30)}ヶ月`;
      }
      return `残り${diffDays}日`;
  }, [assetGoal]);

  const flowData = [
      { name: '収入', amount: budgetProfile.monthlyIncome, fill: '#334e68' },
      { name: '支出(予)', amount: totalExpenses, fill: '#ef4444' },
      { name: '余剰(投)', amount: Math.max(0, surplus), fill: '#10b981' },
  ];

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center mb-2">
        <div>
            <h2 className="text-2xl font-bold text-navy-900">Money</h2>
            <p className="text-sm text-gray-500">資産形成の構造をつくる。</p>
        </div>
        {/* M2: Man-yen toggle */}
        <button
            onClick={handleToggleManYen}
            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-navy-900 transition-colors bg-navy-50 px-3 py-1.5 rounded-full"
            title={moneyConfig.displayInManYen ? '円表示に切替' : '万円表示に切替'}
        >
            {moneyConfig.displayInManYen ? <ToggleRight size={16} className="text-navy-900" /> : <ToggleLeft size={16} />}
            <span className="font-medium">{moneyConfig.displayInManYen ? '万円' : '円'}</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex space-x-1 bg-navy-50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'stock' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-400 hover:text-navy-600'
            }`}
          >
              <PiggyBank size={16} />
              <span>資産推移 (Stock)</span>
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'flow' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-400 hover:text-navy-600'
            }`}
          >
              <Wallet size={16} />
              <span>収支構造 (Flow)</span>
          </button>
      </div>

      {activeTab === 'stock' ? (
      /* --- STOCK TAB --- */
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        {/* Total Assets Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center space-x-3">
                     <div className="bg-navy-900 text-white p-2 rounded-lg"><DollarSign size={20} /></div>
                     <div>
                        <span className="text-xs text-gray-500 block mb-0.5">総資産</span>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="text-sm font-bold text-navy-900 bg-transparent border-none p-0 cursor-pointer focus:ring-0"
                        />
                     </div>
                 </div>
                 <div className="text-right">
                     <span className="text-2xl font-bold text-navy-900 block">{formatAmount(totalAssets)}</span>
                 </div>
             </div>

             {/* M4: Percentage change display */}
             <div className="flex justify-end space-x-4 text-xs">
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">前月比</span>
                    <span className={`font-bold ${totalAssets >= prevMonthTotal ? 'text-green-500' : 'text-red-500'}`}>
                        {totalAssets >= prevMonthTotal ? '+' : ''}{formatAmount(monthDiff)}
                        {monthPct !== null ? ` (${monthDiff >= 0 ? '+' : ''}${monthPct}%)` : ' (—)'}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">前年同月比</span>
                    <span className={`font-bold ${totalAssets >= prevYearTotal ? 'text-green-500' : 'text-red-500'}`}>
                        {totalAssets >= prevYearTotal ? '+' : ''}{formatAmount(yearDiff)}
                        {yearPct !== null ? ` (${yearDiff >= 0 ? '+' : ''}${yearPct}%)` : ' (—)'}
                    </span>
                </div>
             </div>
        </div>

        {/* M7: Asset Goal Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-navy-900 mb-3 flex items-center">
                <TrendingUp size={16} className="mr-1" />
                資産目標
            </h3>
            {assetGoal ? (
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-navy-800">{assetGoal.label}</span>
                        <button onClick={handleDeleteGoal} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>目標: {formatAmount(assetGoal.targetAmount)}</span>
                        <span>{goalRemainingTime}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-navy-900 to-navy-600"
                            style={{ width: `${goalProgress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-navy-900 font-bold">{goalProgress.toFixed(1)}%</span>
                        <span className="text-gray-500">残り {formatAmount(Math.max(0, goalRemaining))}</span>
                    </div>
                </div>
            ) : isSettingGoal ? (
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="目標名（例：1000万円達成）"
                        value={goalLabel}
                        onChange={(e) => setGoalLabel(e.target.value)}
                        className="w-full p-2 bg-navy-50 rounded-lg text-sm border border-gray-200"
                    />
                    <div className="flex space-x-2">
                        <div className="relative flex-1">
                            <span className="absolute left-2 top-2.5 text-gray-400 text-xs">¥</span>
                            <input
                                type="number"
                                placeholder="目標金額"
                                value={goalTargetAmount}
                                onChange={(e) => setGoalTargetAmount(e.target.value)}
                                className="w-full p-2 pl-6 bg-navy-50 rounded-lg text-sm border border-gray-200"
                            />
                        </div>
                        <input
                            type="date"
                            value={goalTargetDate}
                            onChange={(e) => setGoalTargetDate(e.target.value)}
                            className="flex-1 p-2 bg-navy-50 rounded-lg text-sm border border-gray-200"
                        />
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleSaveGoal}
                            className="flex-1 bg-navy-900 text-white py-2 rounded-lg text-sm font-bold"
                        >
                            設定する
                        </button>
                        <button
                            onClick={() => setIsSettingGoal(false)}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm"
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsSettingGoal(true)}
                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:text-navy-900 hover:border-navy-300 transition-colors"
                >
                    + 目標を設定する
                </button>
            )}
        </div>

        {/* Input Form */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-navy-900 flex items-center">
                    <Briefcase size={16} className="mr-1"/>
                    資産内訳入力
                </h3>
                <div className="flex items-center space-x-2">
                    {/* M1: Copy previous month button */}
                    {isCurrentMonthEmpty && (
                        <button
                            onClick={handleCopyPreviousMonth}
                            className="flex items-center space-x-1 text-xs text-gray-400 hover:text-navy-900 bg-navy-50 px-2 py-1 rounded-lg transition-colors"
                            title="前月からコピー"
                        >
                            <Copy size={14} />
                            <span>前月からコピー</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsConfigMode(!isConfigMode)}
                        className="text-gray-400 hover:text-navy-900"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {isConfigMode && (
                <div className="mb-4 p-3 bg-navy-50 rounded-lg space-y-2 border border-navy-100">
                    <p className="text-xs font-bold text-navy-900">項目の追加・削除</p>
                    <div className="flex space-x-2">
                        <input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="新項目名（例：仮想通貨）"
                            className="flex-1 p-2 text-xs rounded border border-gray-200"
                        />
                        <button onClick={handleAddCategory} className="bg-navy-900 text-white px-3 py-1 rounded text-xs">追加</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {moneyConfig.assetCategories.map(cat => (
                            <span key={cat} className="inline-flex items-center text-[10px] bg-white border border-gray-200 px-2 py-1 rounded-full">
                                {cat}
                                <button onClick={() => handleDeleteCategory(cat)} className="ml-1 text-gray-400 hover:text-red-500">×</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {moneyConfig.assetCategories.map(cat => (
                    <div key={cat} className="flex flex-col">
                        <label className="text-xs font-bold text-gray-600 mb-1">{cat}</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">¥</span>
                            <input
                                type="number"
                                value={currentAssetRecord.values[cat] || ''}
                                onChange={(e) => handleAssetValueChange(cat, e.target.value)}
                                className="w-full bg-navy-50 rounded-xl py-2 pl-8 pr-3 text-base text-right font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all placeholder-gray-300"
                                placeholder="0"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* M3 + M8: Stacked Area Chart with improved axes */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100" style={{ minHeight: '320px' }}>
             <h3 className="text-sm font-bold text-navy-900 mb-4">資産推移</h3>
             <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                    <defs>
                        {moneyConfig.assetCategories.map((cat, i) => (
                            <linearGradient key={cat} id={`colorCat${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stopOpacity={0.1}/>
                            </linearGradient>
                        ))}
                    </defs>
                    {/* M8: CartesianGrid */}
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    {/* M8: YAxis with formatter */}
                    <YAxis
                        tick={{fontSize: 10}}
                        tickFormatter={(v: number) => moneyConfig.displayInManYen ? `${(v / 10000).toFixed(0)}万` : `¥${(v / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                    />
                    {/* M8: Improved Tooltip */}
                    <Tooltip
                        contentStyle={{backgroundColor: '#fff', fontSize: '12px', borderRadius: '8px'}}
                        formatter={(value: number | undefined, name: string | undefined) => [formatAmount(value ?? 0), name ?? '']}
                    />
                    {/* M3: Legend for stacked chart */}
                    <Legend wrapperStyle={{fontSize: '10px'}} />
                    {/* M3: Stacked areas for each category */}
                    {moneyConfig.assetCategories.map((cat, i) => (
                        <Area
                            key={cat}
                            type="monotone"
                            dataKey={cat}
                            stackId="1"
                            stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                            fillOpacity={1}
                            fill={`url(#colorCat${i})`}
                        />
                    ))}
                    {/* M7: Reference line for asset goal */}
                    {assetGoal && (
                        <ReferenceLine
                            y={assetGoal.targetAmount}
                            stroke="#ef4444"
                            strokeDasharray="5 5"
                            label={{ value: assetGoal.label, fontSize: 10, fill: '#ef4444', position: 'right' }}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>
      ) : (
      /* --- FLOW TAB --- */
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {/* Income & Overview */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-navy-900 mb-4 flex items-center">
                  <Briefcase size={16} className="mr-1"/>
                  収入設定
              </h3>
              <div className="space-y-1">
                  <label className="text-xs text-gray-500 ml-1">手取り月収</label>
                  <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400 text-sm">¥</span>
                      <input
                          type="number"
                          value={budgetProfile.monthlyIncome || ''}
                          onChange={(e) => handleIncomeChange(e.target.value)}
                          placeholder="0"
                          className="w-full p-3 pl-7 bg-navy-50 rounded-xl text-lg font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                  </div>
              </div>
          </div>

          {/* Fixed Costs List (M5: with edit functionality) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-navy-900 flex items-center">
                      <Settings size={16} className="mr-1"/>
                      固定費 (毎月必ずかかるお金)
                  </h3>
                  <span className="text-xs font-bold text-navy-900">計 {formatAmount(totalFixedCosts)}</span>
              </div>

              <div className="space-y-2 mb-4">
                  {budgetProfile.fixedCosts.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-navy-50 p-2.5 rounded-lg">
                          {editingFixedCostId === item.id ? (
                              /* M5: Inline edit mode */
                              <div className="flex items-center space-x-2 w-full">
                                  <input
                                      value={editFixedName}
                                      onChange={(e) => setEditFixedName(e.target.value)}
                                      className="flex-[2] p-1.5 text-sm rounded border border-gray-300 bg-white"
                                  />
                                  <div className="relative flex-1">
                                      <span className="absolute left-2 top-2 text-gray-400 text-xs">¥</span>
                                      <input
                                          type="number"
                                          value={editFixedAmount}
                                          onChange={(e) => setEditFixedAmount(e.target.value)}
                                          className="w-full p-1.5 pl-5 text-sm rounded border border-gray-300 bg-white"
                                      />
                                  </div>
                                  <button onClick={handleSaveEditFixedCost} className="text-green-600 hover:text-green-800">
                                      <Check size={16} />
                                  </button>
                                  <button onClick={handleCancelEditFixedCost} className="text-gray-400 hover:text-gray-600 text-xs font-medium">
                                      ×
                                  </button>
                              </div>
                          ) : (
                              /* Normal display mode */
                              <>
                                  <span className="text-sm text-navy-800 font-medium">{item.name}</span>
                                  <div className="flex items-center space-x-3">
                                      <span className="text-sm text-navy-900">{formatAmount(item.amount)}</span>
                                      <button onClick={() => handleStartEditFixedCost(item)} className="text-gray-400 hover:text-navy-700">
                                          <Edit2 size={14} />
                                      </button>
                                      <button onClick={() => handleDeleteFixedCost(item.id)} className="text-gray-400 hover:text-red-500">
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </>
                          )}
                      </div>
                  ))}
                  {budgetProfile.fixedCosts.length === 0 && <p className="text-xs text-gray-400 text-center py-2">固定費が登録されていません</p>}
              </div>

              {/* Add New Fixed Cost */}
              <div className="flex space-x-2 border-t border-gray-100 pt-3">
                  <input
                      className="flex-[2] p-2 bg-gray-50 rounded-lg text-xs border border-gray-200"
                      placeholder="項目名 (例: 家賃)"
                      value={newFixedCostName}
                      onChange={e => setNewFixedCostName(e.target.value)}
                  />
                  <input
                      type="number"
                      className="flex-1 p-2 bg-gray-50 rounded-lg text-xs border border-gray-200"
                      placeholder="金額"
                      value={newFixedCostAmount}
                      onChange={e => setNewFixedCostAmount(e.target.value)}
                  />
                  <button
                      onClick={handleAddFixedCost}
                      className="bg-navy-900 text-white px-3 rounded-lg flex items-center justify-center"
                  >
                      <Plus size={16} />
                  </button>
              </div>
          </div>

          {/* Variable Budget */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-navy-900 mb-4 flex items-center">
                  <Wallet size={16} className="mr-1"/>
                  変動費 (毎月の予算枠)
              </h3>
              <div className="space-y-1">
                  <label className="text-xs text-gray-500 ml-1">食費・交際費などの想定合計</label>
                  <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400 text-sm">¥</span>
                      <input
                          type="number"
                          value={budgetProfile.variableBudget || ''}
                          onChange={(e) => handleVariableBudgetChange(e.target.value)}
                          placeholder="0"
                          className="w-full p-3 pl-7 bg-navy-50 rounded-xl text-lg font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-500"
                      />
                  </div>
              </div>
          </div>

          {/* Flow Visualization (M8: improved chart) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-navy-900 mb-2">収支バランス・シミュレーション</h3>
              <div className="h-40 w-full mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={flowData}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 10}} />
                          {/* M8: Improved Tooltip for bar chart */}
                          <Tooltip
                              cursor={{fill: 'transparent'}}
                              contentStyle={{fontSize: '12px', borderRadius: '8px'}}
                              formatter={(value: number | undefined) => [formatAmount(value ?? 0)]}
                          />
                          <Bar dataKey="amount" barSize={20} radius={[0, 4, 4, 0]}>
                            {flowData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center text-xs bg-navy-50 p-3 rounded-xl border border-navy-100">
                   <div className="flex items-center space-x-2">
                       <TrendingUp size={14} className="text-green-600"/>
                       <span className="text-gray-600">毎月の想定余剰金（投資力）</span>
                   </div>
                   <span className={`font-bold text-lg ${surplus > 0 ? 'text-green-600' : 'text-red-500'}`}>
                       {formatAmount(surplus)}
                   </span>
              </div>

              {/* M6: Savings rate display */}
              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                          <PiggyBank size={14} className="text-gray-500" />
                          <span className="text-xs text-gray-600">貯蓄率</span>
                      </div>
                      <span className={`text-lg font-bold ${savingsRateColor}`}>
                          {budgetProfile.monthlyIncome > 0 ? `${savingsRate.toFixed(1)}%` : '—'}
                      </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">目安: 20%以上が理想的</p>
              </div>
          </div>
      </div>
      )}

      {/* AI Analysis Button (Shared) */}
      <div className="pt-2">
          {!analysisResult ? (
            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-navy-900 to-navy-700 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2"
            >
                {isAnalyzing ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-yellow-400"/>}
                <span>AIで家計構造と資産を分析する</span>
            </button>
          ) : (
            <div className="bg-navy-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden animate-in zoom-in-95">
                 <div className="absolute top-0 right-0 p-10 opacity-10 bg-white rounded-full blur-3xl w-40 h-40 transform translate-x-10 -translate-y-10"></div>
                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold flex items-center"><Sparkles size={16} className="text-yellow-400 mr-2"/>AI FPレポート</h3>
                        <button onClick={() => setAnalysisResult(null)} className="text-gray-400 hover:text-white"><Trash2 size={16}/></button>
                    </div>
                    <div className="text-sm leading-relaxed text-navy-50 whitespace-pre-wrap">
                        {analysisResult}
                    </div>
                 </div>
            </div>
          )}
      </div>
    </div>
  );
};
