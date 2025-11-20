import React, { useState, useMemo } from 'react';
import { Transaction, AssetRecord, MoneyConfig } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Plus, TrendingUp, TrendingDown, DollarSign, Settings, Trash2, Save } from 'lucide-react';

interface MoneyProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  assets: AssetRecord[];
  onUpdateAssets: (assets: AssetRecord[]) => void;
  moneyConfig: MoneyConfig;
  onUpdateConfig: (config: MoneyConfig) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff6b6b', '#4ecdc4'];

export const Money: React.FC<MoneyProps> = ({ 
    transactions, 
    onAddTransaction, 
    assets, 
    onUpdateAssets, 
    moneyConfig, 
    onUpdateConfig 
}) => {
  // --- States for Asset Management ---
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // --- States for Transaction (Expense) Management ---
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  // --- Logic: Asset Management ---
  
  // Get asset record for selected month, or create empty default
  const currentAssetRecord = useMemo(() => {
      return assets.find(r => r.month === selectedMonth) || { month: selectedMonth, values: {} };
  }, [assets, selectedMonth]);

  const handleAssetValueChange = (cat: string, valueStr: string) => {
      const val = valueStr === '' ? 0 : parseInt(valueStr, 10);
      const newValues = { ...currentAssetRecord.values, [cat]: val };
      
      // Update assets array
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

  const toggleExpenseFeature = () => {
      onUpdateConfig({
          ...moneyConfig,
          enableExpenses: !moneyConfig.enableExpenses
      });
  };

  // --- Logic: Transaction Management ---
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      amount: Number(amount),
      category,
      note: '',
      type
    };

    onAddTransaction(newTransaction);
    setAmount('');
    setCategory('');
  };

  // --- Data Prep for Charts ---
  const assetChartData = moneyConfig.assetCategories.map(cat => ({
      name: cat,
      value: currentAssetRecord.values[cat] || 0
  })).filter(d => d.value > 0);

  const totalAssets = assetChartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-end mb-2">
        <div>
            <h2 className="text-2xl font-bold text-navy-900">Assets & Money</h2>
            <p className="text-sm text-gray-500">資産の推移と支出管理。</p>
        </div>
        <button 
            onClick={() => setIsConfigMode(!isConfigMode)}
            className={`p-2 rounded-full transition-colors ${isConfigMode ? 'bg-navy-100 text-navy-900' : 'text-gray-400 hover:text-navy-700'}`}
        >
            <Settings size={20} />
        </button>
      </header>

      {/* Settings / Config Area */}
      {isConfigMode && (
          <div className="bg-navy-50 p-4 rounded-2xl border border-navy-100 mb-6 animate-in fade-in slide-in-from-top-2">
              <h3 className="text-sm font-bold text-navy-900 mb-3">設定</h3>
              
              {/* Category Management */}
              <div className="mb-4">
                  <label className="text-xs text-gray-500 block mb-2">資産項目の管理</label>
                  <div className="flex space-x-2 mb-2">
                      <input 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="新しい項目名（例: 仮想通貨）"
                        className="flex-1 text-xs p-2 rounded border border-gray-200"
                      />
                      <button onClick={handleAddCategory} className="bg-navy-900 text-white text-xs px-3 rounded">追加</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {moneyConfig.assetCategories.map(cat => (
                          <span key={cat} className="inline-flex items-center bg-white px-2 py-1 rounded text-xs text-navy-700 border border-gray-200">
                              {cat}
                              <button onClick={() => handleDeleteCategory(cat)} className="ml-2 text-gray-400 hover:text-red-500"><Trash2 size={12}/></button>
                          </span>
                      ))}
                  </div>
              </div>

              {/* Feature Toggle */}
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                  <span className="text-xs font-medium text-navy-900">支出・収入の記録機能を利用する</span>
                  <button 
                    onClick={toggleExpenseFeature}
                    className={`w-10 h-5 rounded-full relative transition-colors ${moneyConfig.enableExpenses ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${moneyConfig.enableExpenses ? 'left-6' : 'left-1'}`} />
                  </button>
              </div>
          </div>
      )}

      {/* --- ASSET MANAGEMENT SECTION --- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex items-center space-x-2">
                 <span className="text-sm font-bold text-navy-900">対象月:</span>
                 <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="text-sm bg-navy-50 border-none rounded p-1 focus:ring-1 focus:ring-navy-500"
                 />
             </div>
             <div className="text-right">
                 <span className="text-xs text-gray-500 block">総資産</span>
                 <span className="text-lg font-bold text-navy-900">¥{totalAssets.toLocaleString()}</span>
             </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-navy-900 mb-4 flex items-center">
                <DollarSign size={16} className="mr-1"/>
                資産内訳入力
            </h3>
            {moneyConfig.assetCategories.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                    右上の設定ボタン<Settings size={12} className="inline"/>から<br/>資産項目（銀行、証券など）を追加してください。
                </p>
            ) : (
                <div className="space-y-3">
                    {moneyConfig.assetCategories.map(cat => (
                        <div key={cat} className="flex items-center justify-between">
                            <label className="text-xs text-gray-600 w-1/3 truncate">{cat}</label>
                            <div className="relative w-2/3">
                                <span className="absolute left-3 top-2 text-gray-400 text-xs">¥</span>
                                <input 
                                    type="number"
                                    value={currentAssetRecord.values[cat] || ''}
                                    onChange={(e) => handleAssetValueChange(cat, e.target.value)}
                                    className="w-full bg-navy-50 rounded-lg py-1.5 pl-6 pr-2 text-sm text-right focus:outline-none focus:ring-1 focus:ring-navy-500"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Asset Chart */}
        {assetChartData.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={assetChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {assetChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        )}
      </section>

      {/* --- EXPENSE MANAGEMENT SECTION (Conditional) --- */}
      {moneyConfig.enableExpenses && (
          <section className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-navy-900">日常の支出・収入</h3>
            
            {/* Input Form */}
            <form onSubmit={handleTransactionSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex space-x-2 bg-navy-50 p-1 rounded-lg">
                    <button 
                        type="button"
                        onClick={() => setType('expense')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}
                    >
                        支出
                    </button>
                    <button 
                        type="button"
                        onClick={() => setType('income')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'income' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}
                    >
                        収入
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 ml-1">カテゴリー</label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="例：食費"
                            className="w-full p-3 bg-navy-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 ml-1">金額</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-400 text-sm">¥</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                className="w-full p-3 pl-7 bg-navy-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                            />
                        </div>
                    </div>
                </div>
                <button type="submit" className="w-full bg-navy-900 text-white py-3 rounded-xl font-medium hover:bg-navy-800 transition-colors flex items-center justify-center space-x-2">
                    <Plus size={18} />
                    <span>記録を追加</span>
                </button>
            </form>
            
            {/* Recent List */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-navy-900 ml-1">最近の履歴</h3>
                {transactions.length === 0 && <p className="text-xs text-gray-400 ml-1">履歴はまだありません。</p>}
                {transactions.slice(-5).reverse().map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <DollarSign size={18} />
                            </div>
                            <div>
                                <p className="font-medium text-navy-900 text-sm">{t.category}</p>
                                <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-navy-900'}`}>
                            {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
          </section>
      )}

    </div>
  );
};