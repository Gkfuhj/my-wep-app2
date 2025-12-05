
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Transaction, Currency, ASSET_NAMES, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Trash2, RefreshCcw, Edit, PackageOpen, Package, AlertTriangle, Info, ArrowRightLeft, Landmark, ShoppingCart, HandCoins, Receipt } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import TransactionGroupDescription from '../components/TransactionGroupDescription';

interface TransactionGroup {
    groupId: string;
    date: string;
    description: string;
    transactions: Transaction[];
    isDeleted: boolean;
}
type DateFilterOption = 'all' | 'today' | 'week' | 'month';


const TransactionManagement: React.FC = () => {
    const { transactions, deleteTransactionGroup, restoreTransactionGroup, hasPermission, banks } = useAppContext();
    const [view, setView] = useState<'active' | 'deleted'>('active');
    const [activeTab, setActiveTab] = useState<'trades' | 'debts' | 'expenses' | 'exchanges' | 'cash' | 'banks'>('trades');
    const [dateFilterOption, setDateFilterOption] = useState<DateFilterOption>('today');

    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        action: 'delete' | 'restore' | null;
        groupId: string | null;
        message: string;
    }>({ isOpen: false, action: null, groupId: null, message: '' });

    const groupedTransactions = useMemo((): TransactionGroup[] => {
        const groups: Record<string, Transaction[]> = {};
        transactions.forEach(tx => {
            if (tx.groupId) {
                if (!groups[tx.groupId]) {
                    groups[tx.groupId] = [];
                }
                groups[tx.groupId].push(tx);
            }
        });

        return Object.values(groups).map(group => {
            const primaryTx = group.find(tx => tx.metadata) || group[0];
            let description = primaryTx.metadata?.groupDescription || `معاملة مجمعة بتاريخ ${formatDate(primaryTx.date)}`;
            if (primaryTx.isDeleted) {
                 description = `(محذوفة) ${description}`;
            }

            return {
                groupId: primaryTx.groupId!,
                date: primaryTx.date,
                description,
                transactions: group,
                isDeleted: !!primaryTx.isDeleted,
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [transactions]);
    
    const transactionsToDisplay = useMemo(() => {
        let baseList = groupedTransactions.filter(g => view === 'active' ? !g.isDeleted : g.isDeleted);
        
        // Date Filtering
        if (dateFilterOption !== 'all') {
            const now = new Date();
            let startRange: Date;
            switch (dateFilterOption) {
                case 'today':
                    startRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startRange = new Date();
                    startRange.setDate(now.getDate() - 6);
                    startRange.setHours(0, 0, 0, 0);
                    break;
                case 'month':
                    startRange = new Date();
                    startRange.setDate(now.getDate() - 29);
                    startRange.setHours(0, 0, 0, 0);
                    break;
                default:
                    startRange = new Date('1970-01-01');
            }
            const endRange = new Date();
            endRange.setHours(23, 59, 59, 999);
            baseList = baseList.filter(group => {
                const groupDate = new Date(group.date);
                return groupDate >= startRange && groupDate <= endRange;
            });
        }
        
        const getGroupType = (group: TransactionGroup): string | undefined => {
            const primaryTx = group.transactions.find(tx => tx.metadata) || group.transactions[0];
            return primaryTx.metadata?.groupType;
        };

        switch (activeTab) {
            case 'trades':
                const tradeTypes = ['BUY_USD', 'SELL_USD', 'BUY_OTHER', 'SELL_OTHER'];
                return baseList.filter(g => tradeTypes.includes(getGroupType(g) as string));
            case 'cash':
                 return baseList.filter(g => getGroupType(g) === 'ADJUST_BALANCE');
            case 'banks':
                const bankTypes = ['BANK_ADJUST', 'BANK_TRANSFER'];
                return baseList.filter(g => bankTypes.includes(getGroupType(g) as string));
            case 'exchanges':
                const exchangeTypes = ['USD_EXCHANGE', 'EUR_EXCHANGE', 'BANK_CASH_EXCHANGE', 'CASH_BANK_EXCHANGE', 'SINGLE_DEBT_CONVERSION', 'USD_TO_LYD_DEBT_CONVERSION'];
                return baseList.filter(g => exchangeTypes.includes(getGroupType(g) as string));
            case 'debts':
                // Added 'DEBT_SURPLUS' to ensure transactions with surplus appear here
                const debtTypes = ['NEW_DEBT', 'DEBT_PAYMENT', 'NEW_RECEIVABLE', 'RECEIVABLE_PAYMENT', 'DEBT_SETTLEMENT', 'DEBT_SURPLUS'];
                return baseList.filter(g => debtTypes.includes(getGroupType(g) as string));
            case 'expenses':
                const expenseTypes = ['POS_TRANSACTION', 'DOLLAR_CARD_PAYMENT', 'DOLLAR_CARD_PAYMENT_UPDATE', 'DOLLAR_CARD_PAYMENT_DELETE', 'DOLLAR_CARD_COMPLETE', 'DOLLAR_CARD_PURCHASE_DELETE', 'OPERATING_COST', 'OPERATING_COST_DELETE'];
                return baseList.filter(g => expenseTypes.includes(getGroupType(g) as string));
            default:
                return [];
        }

    }, [groupedTransactions, view, activeTab, dateFilterOption]);

    const handleDelete = (groupId: string) => {
        setConfirmationState({
            isOpen: true,
            action: 'delete',
            groupId,
            message: 'هل أنت متأكد من حذف هذه المعاملة؟ سيتم عكس جميع الحركات المالية المرتبطة بها ونقلها إلى المحذوفات.',
        });
    }
    
    const handleRestore = (groupId: string) => {
        setConfirmationState({
            isOpen: true,
            action: 'restore',
            groupId,
            message: 'هل أنت متأكد من استعادة هذه المعاملة؟ سيتم إعادة تطبيق الحركات المالية.',
        });
    }

    const onConfirmAction = () => {
        if (confirmationState.action === 'delete' && confirmationState.groupId) {
            deleteTransactionGroup(confirmationState.groupId);
        } else if (confirmationState.action === 'restore' && confirmationState.groupId) {
            restoreTransactionGroup(confirmationState.groupId);
        }
        closeConfirmationModal();
    };

    const closeConfirmationModal = () => {
        setConfirmationState({ isOpen: false, action: null, groupId: null, message: '' });
    };

    const TabButton: React.FC<{ tabId: typeof activeTab, label: string, icon: React.ReactNode }> = ({ tabId, label, icon }) => (
         <button
            type="button"
            onClick={() => setActiveTab(tabId)}
            className={`flex-1 flex justify-center items-center gap-2 p-3 text-sm font-medium border-b-4 transition-colors ${
                activeTab === tabId
                    ? 'border-primary dark:border-gold text-primary-dark dark:text-gold-light'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
            {icon} {label}
        </button>
    );

    const dateFilterOptions: { key: DateFilterOption, label: string }[] = [
        { key: 'all', label: 'كل الأوقات' },
        { key: 'today', label: 'اليوم' },
        { key: 'week', label: 'أسبوع' },
        { key: 'month', label: 'شهر' }
    ];

    return (
        <>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap justify-between items-center gap-4">
                     <div className="flex items-center gap-4">
                         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">إدارة المعاملات</h2>
                         <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                            <button 
                                onClick={() => setView('active')} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'active' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                            >
                               <Package className="w-4 h-4 inline-block me-2"/> النشطة
                            </button>
                            <button 
                                onClick={() => setView('deleted')} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'deleted' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                            >
                              <PackageOpen className="w-4 h-4 inline-block me-2"/> المحذوفات
                            </button>
                        </div>
                    </div>
                     <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                        {dateFilterOptions.map(opt => (
                            <button 
                                key={opt.key}
                                onClick={() => setDateFilterOption(opt.key)} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${dateFilterOption === opt.key ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-b border-gray-200 dark:border-dark-border flex">
                    <TabButton tabId="trades" label="شراء وبيع" icon={<ShoppingCart size={16}/>} />
                    <TabButton tabId="debts" label="ديون ومستحقات" icon={<HandCoins size={16}/>} />
                    <TabButton tabId="expenses" label="بطاقات ومصروفات" icon={<Receipt size={16}/>} />
                    <TabButton tabId="exchanges" label="تحويلات وبدل" icon={<ArrowRightLeft size={16}/>} />
                    <TabButton tabId="banks" label="عمليات المصارف" icon={<Landmark size={16}/>} />
                    <TabButton tabId="cash" label="إدخال/إخراج نقدي" icon={<ArrowRightLeft size={16}/>} />
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">وصف العملية</th>
                                <th className="px-6 py-3">الحركات المالية</th>
                                <th className="px-6 py-3">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactionsToDisplay.map(group => (
                                <tr key={group.groupId} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(group.date)}</td>
                                    <td className="px-6 py-4 max-w-sm">
                                        <TransactionGroupDescription group={group} banks={banks} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <ul className="space-y-1 text-xs">
                                            {group.transactions.filter(tx => view === 'active' ? !tx.isDeleted : tx.isDeleted).map(tx => (
                                                <li key={tx.id} className={`flex justify-between font-mono p-1 rounded-md ${tx.amount > 0 ? 'bg-green-100/10' : 'bg-red-100/10'}`}>
                                                    <span className={`${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(tx.amount, tx.currency)}</span>
                                                    <span className="text-gray-500">{ASSET_NAMES[tx.assetId] || banks.find(b => b.id === tx.assetId)?.name || tx.assetId}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="px-6 py-4">
                                        {view === 'active' ? (
                                            <>
                                                {/* <button disabled className="p-2 text-gray-400 cursor-not-allowed" title="التعديل غير متاح حالياً"><Edit size={18} /></button> */}
                                                {hasPermission('transactionManagement', 'delete') && <button onClick={() => handleDelete(group.groupId)} className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" title="حذف"><Trash2 size={18} /></button>}
                                            </>
                                        ) : (
                                            hasPermission('transactionManagement', 'restore') && <button onClick={() => handleRestore(group.groupId)} className="p-2 text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" title="استعادة"><RefreshCcw size={18} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {transactionsToDisplay.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <p>{view === 'active' ? 'لا توجد معاملات نشطة في هذا القسم.' : 'لا توجد معاملات محذوفة في هذا القسم.'}</p>
                        </div>
                     )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={onConfirmAction}
                title={`تأكيد ${confirmationState.action === 'delete' ? 'الحذف' : 'الاستعادة'}`}
                message={confirmationState.message}
                confirmButtonVariant={confirmationState.action === 'delete' ? 'danger' : 'primary'}
                confirmText={confirmationState.action === 'delete' ? 'حذف' : 'استعادة'}
            />
        </>
    );
};

export default TransactionManagement;
