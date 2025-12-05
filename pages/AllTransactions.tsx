import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Currency, TransactionType, Transaction } from '../types';
import { generatePDF } from '../lib/pdfGenerator';
import { Printer, X, Search } from 'lucide-react';

type DateFilterOption = 'all' | 'today' | 'week' | 'month' | 'custom';

const AllTransactions: React.FC = () => {
    const { transactions, hasPermission } = useAppContext();
    const [filterType, setFilterType] = useState<string>('');
    const [filterCurrency, setFilterCurrency] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [dateFilterOption, setDateFilterOption] = useState<DateFilterOption>('today');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const filteredTransactions = useMemo(() => {
        let allTransactions = transactions; // Show all transactions including deleted ones
        let dateFiltered = allTransactions;

        if (dateFilterOption !== 'all') {
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

            dateFiltered = allTransactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= startRange && txDate <= endRange;
            });
        }
        
        let finalFiltered = dateFiltered.filter(tx => {
            const typeMatch = filterType ? tx.type === filterType : true;
            const currencyMatch = filterCurrency ? tx.currency === filterCurrency : true;
            return typeMatch && currencyMatch;
        });

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            finalFiltered = finalFiltered.filter(tx => 
                formatDate(tx.date).toLowerCase().includes(lowercasedTerm) ||
                tx.type.toLowerCase().includes(lowercasedTerm) ||
                tx.description.toLowerCase().includes(lowercasedTerm) ||
                (tx.user || 'نظام').toLowerCase().includes(lowercasedTerm) ||
                String(tx.amount).includes(lowercasedTerm) ||
                formatCurrency(tx.amount, tx.currency).toLowerCase().includes(lowercasedTerm)
            );
        }

        return finalFiltered;

    }, [transactions, filterType, filterCurrency, dateFilterOption, startDate, endDate, searchTerm]);

    const clearFilters = () => {
        setFilterType('');
        setFilterCurrency('');
        setDateFilterOption('all');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
    };

    const renderAmount = (tx: Transaction) => {
        const amountColor = tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
        return (
             <span className={`font-mono ${amountColor}`}>
                {formatCurrency(tx.amount, tx.currency)}
            </span>
        );
    }
    
    const filterInputClasses = "w-full bg-white dark:bg-dark-card p-2 rounded-md border border-gray-300 dark:border-dark-border focus:border-primary dark:focus:border-gold focus:ring-primary dark:focus:ring-gold";

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">سجل المعاملات</h2>
                <div className="flex items-center gap-2">
                    {hasPermission('transactions', 'export') && (
                        <button onClick={async () => await generatePDF(filteredTransactions.filter(tx => !tx.isDeleted), 'تقرير المعاملات')} 
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <Printer size={18} />
                            <span>طباعة تقرير</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                <div className="md:col-span-2 lg:col-span-4 relative">
                    <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="ابحث في التاريخ, النوع, الوصف, المستخدم, المبلغ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={`${filterInputClasses} ps-10`}
                    />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className={filterInputClasses}>
                    <option value="">كل الأنواع</option>
                    {Object.values(TransactionType).map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value)} className={filterInputClasses}>
                    <option value="">كل العملات</option>
                    {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                    </select>
                    {dateFilterOption === 'custom' && (
                        <>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={filterInputClasses} />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={filterInputClasses} />
                        </>
                    )}
                </div>
                 <button onClick={clearFilters} className="lg:col-span-4 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white dark:text-gray-200 rounded-lg transition-colors">
                    <X size={18}/>
                    <span>مسح كل الفلاتر</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">الوصف</th>
                            <th className="px-6 py-3">المستخدم</th>
                            <th className="px-6 py-3">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(tx => (
                            <tr key={tx.id} className={`border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${tx.isDeleted ? 'opacity-50 line-through bg-red-50 dark:bg-red-900/20' : ''}`}>
                                <td className="px-6 py-4">{formatDate(tx.date)}</td>
                                <td className="px-6 py-4">{tx.type} {tx.isDeleted && <span className="text-red-500 text-xs font-bold no-underline">(ملغاة)</span>}</td>
                                <td className="px-6 py-4">{tx.description}</td>
                                <td className="px-6 py-4 text-primary-dark dark:text-gold-light">{tx.user || 'نظام'}</td>
                                <td className="px-6 py-4">
                                   {renderAmount(tx)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredTransactions.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد معاملات تطابق الفلتر.</p>}
            </div>
        </div>
    );
};

export default AllTransactions;