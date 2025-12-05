
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Transaction, ASSET_NAMES, Currency, TransactionType } from '../types';
import { ChevronsRight, ChevronsLeft, X, Eye, EyeOff, Search } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';


type DateFilterOption = 'all' | 'today' | 'week' | 'month' | 'custom' | 'multiple_days';

const CashFlow: React.FC = () => {
    const { transactions, banks, updateTransactionDate, toggleTransactionVisibility, hasPermission } = useAppContext();

    const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out'>('all');
    const [assetFilter, setAssetFilter] = useState<string>('all');
    const [dateFilterOption, setDateFilterOption] = useState<DateFilterOption>('today');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [currentMultiDate, setCurrentMultiDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ direction: 'forward' | 'backward' } | null>(null);


    const assetNameMap = useMemo(() => {
        const bankNames = Object.fromEntries(banks.map(b => [b.id, b.name]));
        return {
            ...ASSET_NAMES,
            ...bankNames
        };
    }, [banks]);
    
    const getAssetName = useMemo(() => (assetId: string) => {
        return assetNameMap[assetId] || assetId;
    }, [assetNameMap]);

    const filteredTransactions = useMemo(() => {
        const bankIds = new Set(banks.map(b => b.id));
        let allValidTransactions = transactions.filter(tx => 
            !tx.isDeleted && 
            tx.type !== TransactionType.Settlement &&
            tx.type !== TransactionType.BankDeletion &&
            tx.assetId !== 'trade_debt' &&
            tx.assetId !== 'external_settlement' &&
            tx.assetId !== 'external_dollar_card_payment' &&
            tx.assetId !== 'debt_conversion' &&
            tx.assetId !== 'external_receivable' &&
            tx.assetId !== 'external_payment' &&
            tx.assetId !== 'external_cost'
        );

        let dateFiltered = allValidTransactions;

        if (dateFilterOption === 'multiple_days') {
            if (selectedDates.length > 0) {
                const datesSet = new Set(selectedDates);
                dateFiltered = allValidTransactions.filter(tx => {
                    const txDateStr = tx.date.split('T')[0];
                    return datesSet.has(txDateStr);
                });
            } else {
                dateFiltered = [];
            }
        } else if (dateFilterOption !== 'all') {
            const now = new Date();
            let startRange: Date;
            let endRange: Date = new Date();

            switch (dateFilterOption) {
                case 'today':
                    startRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    endRange.setHours(23, 59, 59, 999);
                    break;
                case 'week':
                    startRange = new Date();
                    startRange.setDate(now.getDate() - 6); // Last 7 days including today
                    startRange.setHours(0, 0, 0, 0);
                    endRange.setHours(23, 59, 59, 999);
                    break;
                case 'month':
                    startRange = new Date();
                    startRange.setDate(now.getDate() - 29); // Last 30 days including today
                    startRange.setHours(0, 0, 0, 0);
                    endRange.setHours(23, 59, 59, 999);
                    break;
                case 'custom':
                    startRange = startDate ? new Date(startDate) : new Date('1970-01-01');
                    startRange.setHours(0, 0, 0, 0);
                    endRange = endDate ? new Date(endDate) : new Date();
                    endRange.setHours(23, 59, 59, 999); // Include the whole end day
                    break;
                default:
                    startRange = new Date('1970-01-01');
            }

             dateFiltered = allValidTransactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= startRange && txDate <= endRange;
            });
        }


        let furtherFiltered = dateFiltered
            .filter(tx => {
                const directionMatch = 
                    directionFilter === 'all' ||
                    (directionFilter === 'in' && tx.amount > 0) ||
                    (directionFilter === 'out' && tx.amount < 0);
                
                const assetMatch = 
                    assetFilter === 'all' ||
                    (assetFilter === 'all_banks' && bankIds.has(tx.assetId)) ||
                    tx.assetId === assetFilter;

                return directionMatch && assetMatch;
            });

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            furtherFiltered = furtherFiltered.filter(tx => 
                formatDate(tx.date).toLowerCase().includes(lowercasedTerm) ||
                tx.description.toLowerCase().includes(lowercasedTerm) ||
                getAssetName(tx.assetId).toLowerCase().includes(lowercasedTerm) ||
                String(tx.amount).includes(lowercasedTerm) ||
                formatCurrency(tx.amount, tx.currency).toLowerCase().includes(lowercasedTerm)
            );
        }
        
        return furtherFiltered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [transactions, directionFilter, assetFilter, banks, dateFilterOption, startDate, endDate, selectedDates, searchTerm, getAssetName]);
    
    const selectedVisibleTxIds = useMemo(() => 
        Array.from(selectedTxIds).filter(id => {
            const tx = transactions.find(t => t.id === id);
            return tx && !tx.isTemporarilyHidden;
        }), 
    [selectedTxIds, transactions]);

    const selectedHiddenTxIds = useMemo(() => 
        Array.from(selectedTxIds).filter(id => {
            const tx = transactions.find(t => t.id === id);
            return tx && tx.isTemporarilyHidden;
        }),
    [selectedTxIds, transactions]);

    const calculateTotals = (currency: Currency) => {
        const visibleTransactions = filteredTransactions.filter(t => !t.isTemporarilyHidden);

        const totalIn = visibleTransactions
            .filter(t => t.amount > 0 && t.currency === currency)
            .reduce((sum, t) => sum + t.amount, 0);
        const totalOut = visibleTransactions
            .filter(t => t.amount < 0 && t.currency === currency)
            .reduce((sum, t) => sum + t.amount, 0);
        return { totalIn, totalOut };
    }

    const lydTotals = calculateTotals(Currency.LYD);
    const usdTotals = calculateTotals(Currency.USD);
    const eurTotals = calculateTotals(Currency.EUR);
    const tndTotals = calculateTotals(Currency.TND);
    
    const handleSelect = (txId: string) => {
        setSelectedTxIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(txId)) {
                newSet.delete(txId);
            } else {
                newSet.add(txId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedTxIds(new Set(filteredTransactions.map(tx => tx.id)));
        } else {
            setSelectedTxIds(new Set());
        }
    };

    const handleDateShift = (direction: 'forward' | 'backward') => {
        setConfirmAction({ direction });
        setIsConfirmModalOpen(true);
    };

    const handleVisibilityToggle = (hide: boolean) => {
        const idsToToggle = hide ? selectedVisibleTxIds : selectedHiddenTxIds;
        if (idsToToggle.length > 0) {
            toggleTransactionVisibility(idsToToggle, hide);
            setSelectedTxIds(new Set());
        }
    };

    const onConfirmDateShift = () => {
        if (confirmAction) {
            updateTransactionDate(Array.from(selectedTxIds), confirmAction.direction);
            setSelectedTxIds(new Set());
        }
        setIsConfirmModalOpen(false);
        setConfirmAction(null);
    };
    
    const clearFilters = () => {
        setDirectionFilter('all');
        setAssetFilter('all');
        setDateFilterOption('all');
        setStartDate('');
        setEndDate('');
        setSelectedDates([]);
        setCurrentMultiDate('');
        setSearchTerm('');
    };

    const filterInputClasses = "w-full bg-white dark:bg-dark-card p-2 rounded-md border border-gray-300 dark:border-dark-border focus:border-primary dark:focus:border-gold focus:ring-primary dark:focus:ring-gold";
    const isAllSelected = selectedTxIds.size > 0 && selectedTxIds.size === filteredTransactions.length;


    return (
        <>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">عرض الدخول والخروج</h2>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <div className="lg:col-span-3 relative">
                        <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ابحث في التاريخ, الوصف, الأصل المتأثر, المبلغ..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={`${filterInputClasses} ps-10`}
                        />
                    </div>
                    <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value as 'all' | 'in' | 'out')} className={filterInputClasses}>
                        <option value="all">الكل</option>
                        <option value="in">الدخول فقط</option>
                        <option value="out">الخروج فقط</option>
                    </select>
                    <select value={assetFilter} onChange={e => setAssetFilter(e.target.value)} className={filterInputClasses}>
                        <option value="all">كل الأصول</option>
                        <optgroup label="الخزائن النقدية">
                            <option value="cashLydMisrata">{ASSET_NAMES.cashLydMisrata}</option>
                            <option value="cashLydTripoli">{ASSET_NAMES.cashLydTripoli}</option>
                            <option value="cashLydZliten">{ASSET_NAMES.cashLydZliten}</option>
                            <option value="cashUsdLibya">{ASSET_NAMES.cashUsdLibya}</option>
                            <option value="cashUsdTurkey">{ASSET_NAMES.cashUsdTurkey}</option>
                        </optgroup>
                        <optgroup label="المصارف">
                            <option value="all_banks">كل البنوك</option>
                            {banks.map(bank => (
                                <option key={bank.id} value={bank.id}>{bank.name}</option>
                            ))}
                        </optgroup>
                    </select>
                    <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select 
                            value={dateFilterOption} 
                            onChange={e => setDateFilterOption(e.target.value as DateFilterOption)} 
                            className={`sm:col-span-1 ${filterInputClasses}`}
                        >
                            <option value="all">كل الأوقات</option>
                            <option value="today">اليوم</option>
                            <option value="week">آخر 7 أيام</option>
                            <option value="month">آخر 30 يومًا</option>
                            <option value="custom">تاريخ مخصص</option>
                            <option value="multiple_days">أيام محددة</option>
                        </select>
                        {dateFilterOption === 'custom' && (
                            <>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={filterInputClasses} />
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={filterInputClasses} />
                            </>
                        )}
                        {dateFilterOption === 'multiple_days' && (
                             <div className="sm:col-span-2 space-y-2">
                                <div className="flex gap-2">
                                    <input type="date" value={currentMultiDate} onChange={e => setCurrentMultiDate(e.target.value)} className={filterInputClasses} />
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (currentMultiDate && !selectedDates.includes(currentMultiDate)) {
                                                setSelectedDates([...selectedDates, currentMultiDate].sort());
                                                setCurrentMultiDate('');
                                            }
                                        }}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                                    >
                                        إضافة
                                    </button>
                                </div>
                                {selectedDates.length > 0 && (
                                    <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-md">
                                        {selectedDates.map(date => (
                                            <span key={date} className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full">
                                                {date}
                                                <button onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))} className="text-blue-500 hover:text-blue-700">
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                     <button onClick={clearFilters} className="md:col-span-2 lg:col-span-3 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white dark:text-gray-200 rounded-lg transition-colors">
                        <X size={18}/>
                        <span>مسح كل الفلاتر</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => handleDateShift('backward')} disabled={selectedTxIds.size === 0} className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronsLeft size={18} /><span>ترحيل للأمس</span>
                    </button>
                    <button onClick={() => handleDateShift('forward')} disabled={selectedTxIds.size === 0} className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <span>ترحيل للغد</span><ChevronsRight size={18} />
                    </button>
                    <button onClick={() => handleVisibilityToggle(true)} disabled={selectedVisibleTxIds.length === 0} className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <EyeOff size={18} /><span>إخفاء مؤقت</span>
                    </button>
                    <button onClick={() => handleVisibilityToggle(false)} disabled={selectedHiddenTxIds.length === 0} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Eye size={18} /><span>إظهار</span>
                    </button>
                    <span className="text-sm text-gray-500">{selectedTxIds.size} معاملات محددة</span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                            <tr>
                                <th className="px-4 py-3">
                                    <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} className="form-checkbox h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded focus:ring-primary dark:focus:ring-gold"/>
                                </th>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">الوصف</th>
                                <th className="px-6 py-3">الأصل المتأثر</th>
                                <th className="px-6 py-3">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(tx => (
                                <tr key={tx.id} className={`border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${tx.isTemporarilyHidden ? 'opacity-40 bg-gray-100 dark:bg-white/5' : ''} ${selectedTxIds.has(tx.id) ? 'bg-primary/10 dark:bg-gold/10' : ''}`}>
                                    <td className="px-4 py-4">
                                        <input type="checkbox" checked={selectedTxIds.has(tx.id)} onChange={() => handleSelect(tx.id)} className="form-checkbox h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded focus:ring-primary dark:focus:ring-gold"/>
                                    </td>
                                    <td className="px-6 py-4">{formatDate(tx.date)}</td>
                                    <td className="px-6 py-4 flex items-center gap-2">
                                        {tx.isTemporarilyHidden && <span title="مخفية مؤقتاً"><EyeOff size={14} className="text-gray-500 flex-shrink-0" /></span>}
                                        <span>{tx.description}</span>
                                    </td>
                                    <td className="px-6 py-4 text-primary-dark dark:text-gold-light">{getAssetName(tx.assetId)}</td>
                                    <td className={`px-6 py-4 font-mono font-semibold ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {formatCurrency(tx.amount, tx.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredTransactions.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد حركات مالية تطابق الفلتر.</p>}
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
                    <h3 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-200">ملخص الحركة للفلترة الحالية (غير المخفية)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-500/30">
                            <p className="text-sm text-green-700 dark:text-green-300">دخول (دينار)</p>
                            <p className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(lydTotals.totalIn, Currency.LYD)}</p>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg border border-red-200 dark:border-red-500/30">
                            <p className="text-sm text-red-700 dark:text-red-300">خروج (دينار)</p>
                            <p className="font-bold text-lg text-red-600 dark:text-red-400">{formatCurrency(lydTotals.totalOut, Currency.LYD)}</p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-500/30">
                            <p className="text-sm text-green-700 dark:text-green-300">دخول (دولار)</p>
                            <p className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(usdTotals.totalIn, Currency.USD)}</p>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg border border-red-200 dark:border-red-500/30">
                            <p className="text-sm text-red-700 dark:text-red-300">خروج (دولار)</p>
                            <p className="font-bold text-lg text-red-600 dark:text-red-400">{formatCurrency(usdTotals.totalOut, Currency.USD)}</p>
                        </div>
                    </div>
                </div>

            </div>
             <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={onConfirmDateShift}
                title="تأكيد ترحيل المعاملات"
                message={`هل أنت متأكد من ترحيل ${selectedTxIds.size} معاملات ${confirmAction?.direction === 'forward' ? 'لليوم التالي' : 'لليوم السابق'}؟`}
                confirmText="نعم، قم بالترحيل"
            />
        </>
    );
};

export default CashFlow;
