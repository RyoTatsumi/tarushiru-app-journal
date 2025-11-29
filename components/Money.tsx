
import React, { useState, useMemo } from 'react';
import { AssetRecord, MoneyConfig, BudgetProfile, FixedCostItem } from '../types';
import { ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, ReferenceLine, Cell } from 'recharts';
import { Plus, DollarSign, Settings, Trash2, TrendingUp, Sparkles, Loader2, ArrowRight, Wallet, PiggyBank, Briefcase } from 'lucide-react';
import { analyzeAssetTrends } from '../services/geminiService';

interface MoneyProps {
  assets: AssetRecord[];
  onUpdateAssets: (assets: AssetRecord[]) => void;
  moneyConfig: MoneyConfig;
  onUpdateConfig: (config: MoneyConfig) => void;
  budgetProfile: BudgetProfile;
  onUpdateBudget: (budget: BudgetProfile) => void;
}

type TabMode = 'stock' | 'flow';

export const Money: React.FC<MoneyProps> = ({ 
    assets, 
    onUpdateAssets, 
    moneyConfig, 
    onUpdateConfig,
    budgetProfile,
    onUpdateBudget
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('stock');
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

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
      if (window.confirm(`${cat} を削除してもよろしいですか？`)) {
        onUpdateConfig({
            ...moneyConfig,
            assetCategories: moneyConfig.assetCategories.filter(c => c !== cat)
        });
      }
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

  const handleIncomeChange = (val: string) => {
      onUpdateBudget({ ...budgetProfile, monthlyIncome: Number(val) });
  };
  
  const handleVariableBudgetChange = (val: string) => {
      onUpdateBudget({ ...budgetProfile, variableBudget: Number(val) });
  };

  // --- Analysis ---
  const handleAnalyze = async () => {
      setIsAnalyzing(true);
      try {
          const result = await analyzeAssetTrends(assets, budgetProfile);
          setAnalysisResult(result);
      } catch (e) {
          alert("分析に失敗しました");
      } finally {
          setIsAnalyzing(false);
      }
  };

  // --- Data for Charts ---
  const assetChartData = moneyConfig.assetCategories.map(cat => ({
      name: cat,
      value: currentAssetRecord.values[cat] || 0
  })).filter(d => d.value > 0);

  const totalAssets = assetChartData.reduce((acc, curr) => acc + curr.value, 0);
  const prevMonthTotal = previousMonthRecord ? Object.values(previousMonthRecord.values).reduce((a: number, b: number) => a + b, 0) : 0;
  const prevYearTotal = previousYearRecord ? Object.values(previousYearRecord.values).reduce((a: number, b: number) => a + b, 0) : 0;

  const trendData = useMemo(() => {
      const sortedAssets = [...assets].sort((a, b) => a.month.localeCompare(b.month));
      return sortedAssets.map(record => {
          const total = (Object.values(record.values) as number[]).reduce((sum, val) => sum + val, 0);
          return { month: record.month, total };
      });
  }, [assets]);

  // Flow Chart Data
  const totalFixedCosts = budgetProfile.fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = totalFixedCosts + budgetProfile.variableBudget;
  const surplus = budgetProfile.monthlyIncome - totalExpenses;

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
                     <span className="text-2xl font-bold text-navy-900 block">¥{totalAssets.toLocaleString()}</span>
                 </div>
             </div>

             <div className="flex justify-end space-x-4 text-xs">
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">前月比</span>
                    <span className={`font-bold ${totalAssets >= prevMonthTotal ? 'text-green-500' : 'text-red-500'}`}>
                        {totalAssets >= prevMonthTotal ? '+' : ''}{(totalAssets - prevMonthTotal).toLocaleString()}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">前年同月比</span>
                    <span className={`font-bold ${totalAssets >= prevYearTotal ? 'text-green-500' : 'text-red-500'}`}>
                        {totalAssets >= prevYearTotal ? '+' : ''}{(totalAssets - prevYearTotal).toLocaleString()}
                    </span>
                </div>
             </div>
        </div>

        {/* Input Form */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-navy-900 flex items-center">
                    <Briefcase size={16} className="mr-1"/>
                    資産内訳入力
                </h3>
                <button 
                    onClick={() => setIsConfigMode(!isConfigMode)}
                    className="text-gray-400 hover:text-navy-900"
                >
                    <Settings size={16} />
                </button>
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

        {/* Chart */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-64">
             <h3 className="text-sm font-bold text-navy-900 mb-4">資産推移</h3>
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#102a43" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#102a43" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{backgroundColor: '#fff', fontSize: '12px', borderRadius: '8px'}} />
                    <Area type="monotone" dataKey="total" stroke="#102a43" fillOpacity={1} fill="url(#colorTotal)" />
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

          {/* Fixed Costs List */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-navy-900 flex items-center">
                      <Settings size={16} className="mr-1"/>
                      固定費 (毎月必ずかかるお金)
                  </h3>
                  <span className="text-xs font-bold text-navy-900">計 ¥{totalFixedCosts.toLocaleString()}</span>
              </div>
              
              <div className="space-y-2 mb-4">
                  {budgetProfile.fixedCosts.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-navy-50 p-2.5 rounded-lg">
                          <span className="text-sm text-navy-800 font-medium">{item.name}</span>
                          <div className="flex items-center space-x-3">
                              <span className="text-sm text-navy-900">¥{item.amount.toLocaleString()}</span>
                              <button onClick={() => handleDeleteFixedCost(item.id)} className="text-gray-400 hover:text-red-500">
                                  <Trash2 size={14} />
                              </button>
                          </div>
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

          {/* Flow Visualization */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-bold text-navy-900 mb-2">収支バランス・シミュレーション</h3>
              <div className="h-40 w-full mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={flowData}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={70} tick={{fontSize: 10}} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px'}} formatter={(value: number) => `¥${value.toLocaleString()}`} />
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
                       ¥{surplus.toLocaleString()}
                   </span>
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
