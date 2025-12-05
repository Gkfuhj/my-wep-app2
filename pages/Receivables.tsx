import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Currency, Receivable, ASSET_NAMES, LYD_CASH_ASSET_IDS, AssetId, Transaction } from '../types';
import Modal from '../components/Modal';
import { Plus, HandCoins, Archive, RefreshCcw, ChevronDown, ChevronUp, Trash2, Combine, History } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import ConfirmationModal from '../components/ConfirmationModal';
import FormattedInput from '../components/FormattedInput';

type DateFilter = 'daily' | 'weekly' | 'monthly';

const DebtorHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    debtorName: string | null;
    transactions: Transaction[];
    currency: Currency;
}> = ({ isOpen, onClose, debtorName, transactions, currency }) => {
    const [dateFilter, setDateFilter] = useState<DateFilter>('daily');

    const filteredTransactions = useMemo(() => {
        if (!debtorName) return [];
        const now = new Date();
        let startDate = new Date();
        switch (dateFilter) {
            case 'daily':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'weekly':
                startDate.setDate(now.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'monthly':
                startDate.setDate(now.getDate() - 29);
                startDate.setHours(0, 0, 0, 0);
                break;
        }
        // Filter transactions where relatedParty matches debtor name
        return transactions
            .filter(t => !t.isDeleted && t.relatedParty === debtorName && new Date(t.date) >= startDate)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [debtorName, transactions, dateFilter]);

    const totals = useMemo(() => {
        // For receivables:
        // Positive amount usually means "Receivable Created" or similar credit to account (increasing what they owe us - though transaction logic might vary, usually Debt/Receivable creation is tracked differently).
        // Negative amount in a transaction related to a party usually means we paid them or money left us.
        // Let's stick to simple In/Out logic based on transaction amount sign.
        // Total In = Money coming to us (e.g. they pay debt).
        // Total Out = Money leaving us (e.g. we give them loan/service).
        const totalIn = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalOut = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
        return { totalIn, totalOut };
    }, [filteredTransactions]);

    if (!isOpen || !debtorName) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`سجل حركات المستحق عليه: ${debtorName}`} size="2xl">
            <div className="space-y-4">
                 <div className="flex justify-center gap-1 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
                    {(['daily', 'weekly', 'monthly'] as DateFilter[]).map(period => (
                        <button key={period} onClick={() => setDateFilter(period)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${dateFilter === period ? 'bg-white dark:bg-dark-card shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg/50'}`}>
                            {period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : 'شهري'}
                        </button>
                    ))}
                </div>
                <div className="max-h-[50vh] overflow-y-auto pr-2">
                     <ul className="space-y-3">
                        {filteredTransactions.map(tx => (
                            <li key={tx.id} className="flex justify-between items-start border-b pb-2 border-gray-200 dark:border-dark-border">
                                <div>
                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{tx.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(tx.date)}</p>
                                </div>
                                <span className={`font-bold shrink-0 ms-2 font-mono ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{formatCurrency(tx.amount, tx.currency)}</span>
                            </li>
                        ))}
                         {filteredTransactions.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد حركات لهذه الفترة.</p>}
                    </ul>
                </div>
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg text-center">
                        <p className="text-sm text-green-700 dark:text-green-300">إجمالي المقبوضات</p>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400 font-mono">{formatCurrency(totals.totalIn, currency)}</p>
                    </div>
                     <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg text-center">
                        <p className="text-sm text-red-700 dark:text-red-300">إجمالي المدفوعات</p>
                        <p className="font-bold text-lg text-red-600 dark:text-red-400 font-mono">{formatCurrency(Math.abs(totals.totalOut), currency)}</p>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

const Receivables: React.FC = () => {
    const { receivables, addReceivable, payReceivable, banks, archiveReceivable, restoreReceivable, deleteArchivedReceivable, hasPermission, archiveDebtor, restoreDebtor, mergeDebtorReceivables, transactions } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [expandedDebtors, setExpandedDebtors] = useState<Record<string, boolean>>({});
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistoryDebtor, setSelectedHistoryDebtor] = useState<{ name: string, currency: Currency } | null>(null);
    
    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        action: 'delete' | 'merge' | 'archive' | 'restore' | null;
        receivableId?: string | null;
        debtorName?: string | null;
        currency?: Currency | null;
        message: string;
    }>({ isOpen: false, action: null, receivableId: null, debtorName: null, currency: null, message: '' });

    // State for new receivable modal
    const [debtor, setDebtor] = useState<{value: string, label: string} | null>(null);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.LYD);
    const [depositIntoTreasury, setDepositIntoTreasury] = useState(false);
    const [destinationType, setDestinationType] = useState<'cashLyd' | 'bank' | 'cashUsd'>('cashLyd');
    const [destinationBankId, setDestinationBankId] = useState('');
    const [destinationUsdAsset, setDestinationUsdAsset] = useState<'cashUsdLibya' | 'cashUsdTurkey'>('cashUsdLibya');
    const [destinationLydCashAsset, setDestinationLydCashAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [destinationEurAsset, setDestinationEurAsset] = useState<AssetId>('cashEurLibya');
    const [destinationTndAsset, setDestinationTndAsset] = useState<AssetId>('cashTnd');
    const [destinationSarAsset, setDestinationSarAsset] = useState<AssetId>('cashSar');
    const [destinationEgpAsset, setDestinationEgpAsset] = useState<AssetId>('cashEgp');


    // State for payment modal
    const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentSource, setPaymentSource] = useState<'cashLyd' | 'bank' | 'cashUsd'>('cashLyd');
    const [paymentBankId, setPaymentBankId] = useState('');
    const [paymentUsdAsset, setPaymentUsdAsset] = useState<'cashUsdLibya' | 'cashUsdTurkey'>('cashUsdLibya');
    const [paymentLydCashAsset, setPaymentLydCashAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [paymentEurAsset, setPaymentEurAsset] = useState<AssetId>('cashEurLibya');
    const [paymentTndAsset, setPaymentTndAsset] = useState<AssetId>('cashTnd');
    const [paymentSarAsset, setPaymentSarAsset] = useState<AssetId>('cashSar');
    const [paymentEgpAsset, setPaymentEgpAsset] = useState<AssetId>('cashEgp');
    const [isExternalPayment, setIsExternalPayment] = useState(false);


    useEffect(() => {
        if (banks.length > 0) {
            setPaymentBankId(banks[0].id);
            setDestinationBankId(banks[0].id);
        }
    }, [banks]);

    const { activeDebtorsByCurrency, archivedDebtorsByCurrency } = useMemo(() => {
        const active: Record<string, Record<string, Receivable[]>> = { 
            [Currency.LYD]: {}, [Currency.USD]: {}, [Currency.EUR]: {}, [Currency.TND]: {}, [Currency.SAR]: {}, [Currency.EGP]: {} 
        };
        const archived: Record<string, Record<string, Receivable[]>> = { 
            [Currency.LYD]: {}, [Currency.USD]: {}, [Currency.EUR]: {}, [Currency.TND]: {}, [Currency.SAR]: {}, [Currency.EGP]: {} 
        };

        // Logic fix: Iterate through receivables and place them into the correct currency bucket immediately.
        // Do not group by name first, as that causes mixed currencies to merge if names are identical.
        for (const r of receivables) {
            const targetGroup = r.isArchived ? archived : active;
            
            // Ensure the currency key exists (safety check)
            if (!targetGroup[r.currency]) targetGroup[r.currency] = {};

            if (!targetGroup[r.currency][r.debtor]) {
                targetGroup[r.currency][r.debtor] = [];
            }
            targetGroup[r.currency][r.debtor].push(r);
        }
        
        const toSortedArray = (obj: Record<Currency, Record<string, Receivable[]>>) => {
            const result: Record<string, [string, Receivable[]][]> = {};
            for (const currency in obj) {
                result[currency] = Object.entries(obj[currency as Currency])
                    .filter(([_, recs]) => recs.length > 0)
                    .sort((a, b) => a[0].localeCompare(b[0]));
            }
            return result;
        };

        return { 
            activeDebtorsByCurrency: toSortedArray(active as any), 
            archivedDebtorsByCurrency: toSortedArray(archived as any) 
        };
    }, [receivables]);

    const debtorsByCurrencyToDisplay = view === 'active' ? activeDebtorsByCurrency : archivedDebtorsByCurrency;
    const currencyOrder = [Currency.LYD, Currency.USD, Currency.EUR, Currency.TND];
    
    const debtorOptions = useMemo(() => {
        const uniqueDebtors = [...new Set(
            receivables
                .filter(r => r.currency === currency)
                .map(r => r.debtor)
        )];
        // Fix: Explicitly type `d` as a string to resolve the type inference issue.
        return uniqueDebtors.map((d: string) => ({ value: d, label: d }));
    }, [receivables, currency]);


    const handleAddReceivable = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!debtor || !debtor.value || isNaN(numAmount) || numAmount <= 0) return;
        
        let destination: { type: 'cashLyd' | 'bank' | 'cashUsd'; assetId: string; bankId?: string; } | undefined = undefined;

        if (depositIntoTreasury) {
            switch (currency) {
                case Currency.LYD:
                    if (destinationType === 'bank') {
                        if (!destinationBankId) { alert('يرجى اختيار المصرف'); return; }
                        destination = { type: 'bank', bankId: destinationBankId, assetId: destinationBankId };
                    } else {
                        destination = { type: 'cashLyd', assetId: destinationLydCashAsset };
                    }
                    break;
                case Currency.USD:
                    destination = { type: 'cashUsd', assetId: destinationUsdAsset };
                    break;
                case Currency.EUR:
                    destination = { type: 'cashLyd', assetId: destinationEurAsset }; // Generic cash type
                    break;
                case Currency.TND:
                    destination = { type: 'cashLyd', assetId: destinationTndAsset }; // Generic cash type
                    break;
                case Currency.SAR:
                    destination = { type: 'cashLyd', assetId: destinationSarAsset };
                    break;
                case Currency.EGP:
                    destination = { type: 'cashLyd', assetId: destinationEgpAsset };
                    break;
            }
        }
        
        addReceivable(debtor.value, numAmount, currency, destination);
        
        setDebtor(null);
        setAmount('');
        setCurrency(Currency.LYD);
        setDepositIntoTreasury(false);
        setIsModalOpen(false);
    };

    const handlePayReceivable = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReceivable) return;
        
        const amountToPay = parseFloat(paymentAmount);
        if (isNaN(amountToPay) || amountToPay <= 0) return;
        
        let source: { type: 'cashLyd' | 'bank' | 'cashUsd' | 'external'; assetId: string; bankId?: string; };

        if (isExternalPayment) {
            source = { type: 'external', assetId: 'external_payment' };
        } else {
            switch (selectedReceivable.currency) {
                case Currency.LYD:
                    if (paymentSource === 'bank') {
                        if (!paymentBankId) { alert('يرجى اختيار المصرف'); return; }
                        source = { type: 'bank', bankId: paymentBankId, assetId: paymentBankId };
                    } else {
                        source = { type: 'cashLyd', assetId: paymentLydCashAsset };
                    }
                    break;
                case Currency.USD:
                    source = { type: 'cashUsd', assetId: paymentUsdAsset };
                    break;
                case Currency.EUR:
                    source = { type: 'cashLyd', assetId: paymentEurAsset }; // Generic cash type
                    break;
                case Currency.TND:
                    source = { type: 'cashLyd', assetId: paymentTndAsset }; // Generic cash type
                    break;
                case Currency.SAR:
                    source = { type: 'cashLyd', assetId: paymentSarAsset };
                    break;
                case Currency.EGP:
                    source = { type: 'cashLyd', assetId: paymentEgpAsset };
                    break;
                default:
                    console.error("Unknown currency for receivable payment");
                    return;
            }
        }
        
        payReceivable(selectedReceivable.id, amountToPay, source);
        
        setPaymentAmount('');
        setIsPaymentModalOpen(false);
    };
    
    const openPaymentModal = (receivable: Receivable) => {
        setSelectedReceivable(receivable);
        setPaymentAmount('');
        setIsExternalPayment(false);
        if(receivable.currency === Currency.LYD) {
            setPaymentSource('cashLyd');
        } else {
            setPaymentSource('cashUsd');
        }
        if (banks.length > 0) {
            setPaymentBankId(banks[0].id)
        }
        setIsPaymentModalOpen(true);
    };
    
    const openHistoryModal = (debtorName: string, currency: Currency) => {
        setSelectedHistoryDebtor({ name: debtorName, currency });
        setIsHistoryModalOpen(true);
    };

    const handleDeleteReceivable = (receivableId: string) => {
        setConfirmationState({
            isOpen: true,
            action: 'delete',
            receivableId,
            message: "هل أنت متأكد من حذف هذا المستحق بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء."
        });
    };

    const onConfirmAction = () => {
        if (confirmationState.action === 'delete' && confirmationState.receivableId) {
            deleteArchivedReceivable(confirmationState.receivableId);
        } else if (confirmationState.action === 'merge' && confirmationState.debtorName && confirmationState.currency) {
            mergeDebtorReceivables(confirmationState.debtorName, confirmationState.currency);
        } else if (confirmationState.action === 'archive' && confirmationState.debtorName && confirmationState.currency) {
            archiveDebtor(confirmationState.debtorName, confirmationState.currency);
        } else if (confirmationState.action === 'restore' && confirmationState.debtorName && confirmationState.currency) {
            restoreDebtor(confirmationState.debtorName, confirmationState.currency);
        }
        closeConfirmationModal();
    };

    const closeConfirmationModal = () => {
        setConfirmationState({ isOpen: false, action: null, receivableId: null, debtorName: null, currency: null, message: '' });
    };

    const toggleDebtorExpansion = (key: string) => {
        setExpandedDebtors(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const inputClasses = "w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-200 focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";
    const selectClasses = "mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";
    const checkboxClasses = "h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded focus:ring-primary dark:focus:ring-gold";

    const getModalProps = () => {
        switch (confirmationState.action) {
            case 'delete':
                return { title: "تأكيد الحذف النهائي", confirmText: "حذف", variant: 'danger' as const };
            case 'merge':
                return { title: "تأكيد الدمج", confirmText: "دمج", variant: 'primary' as const };
            case 'archive':
                return { title: "تأكيد الأرشفة", confirmText: "أرشفة", variant: 'danger' as const };
            case 'restore':
                return { title: "تأكيد الاستعادة", confirmText: "استعادة", variant: 'primary' as const };
            default:
                return { title: "تأكيد", confirmText: "تأكيد", variant: 'primary' as const };
        }
    };
    const modalProps = getModalProps();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                     <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">إدارة المستحقات (ديون الشركة)</h2>
                     <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                        <button 
                            onClick={() => setView('active')} 
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'active' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                            النشطة
                        </button>
                        <button 
                            onClick={() => setView('archived')} 
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'archived' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                            الأرشيف
                        </button>
                    </div>
                </div>
                {hasPermission('receivables', 'add') && (
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-opacity">
                        <Plus size={18} /> إضافة مستحق
                    </button>
                )}
            </div>
            
            <div className="space-y-8">
                {currencyOrder.map(currency => {
                    const debtors = debtorsByCurrencyToDisplay[currency as Currency];
                    if (!debtors || debtors.length === 0) return null;

                    const totalRemaining = debtors.reduce((currencySum, [_, recs]) => {
                        return currencySum + recs.reduce((debtorSum, r) => debtorSum + (r.amount - r.paid), 0);
                    }, 0);

                    return (
                        <div key={currency} className="space-y-4">
                            <div className="p-4 bg-gray-100 dark:bg-dark-bg rounded-lg flex justify-between items-center border-b-2 border-primary dark:border-gold">
                                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">المستحقات بـ{currency}</h3>
                                {view === 'active' && <span className="text-lg font-mono font-bold text-red-500 dark:text-red-400">{formatCurrency(totalRemaining, currency as Currency)}</span>}
                            </div>
                            {debtors.map(([debtorName, receivablesForDebtor]) => {
                                const isExpanded = expandedDebtors[`${currency}-${debtorName}`] ?? false;
                                const activeUnpaidCount = view === 'active' ? receivablesForDebtor.filter(r => (r.amount - r.paid > 0)).length : 0;

                                return (
                                    <div key={debtorName} className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-4 transition-all duration-300 border border-gray-200 dark:border-dark-border">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4 flex-grow cursor-pointer" onClick={() => toggleDebtorExpansion(`${currency}-${debtorName}`)}>
                                                <button className="p-1 text-gray-500 hover:text-primary dark:hover:text-gold"><ChevronDown size={20} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{debtorName}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); openHistoryModal(debtorName, currency as Currency); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2" title="السجل">
                                                    <History size={18} />
                                                </button>
                                                {view === 'active' && activeUnpaidCount > 1 && hasPermission('receivables', 'add') && (
                                                    <button onClick={(e) => { e.stopPropagation(); setConfirmationState({ isOpen: true, action: 'merge', debtorName, currency: currency as Currency, message: `هل أنت متأكد من دمج جميع المستحقات المتبقية لهذا الدائن (${currency}) في مستحق واحد؟` }); }} title="دمج المستحقات" className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"><Combine size={16} /> دمج</button>
                                                )}
                                                {view === 'active' ? (hasPermission('receivables', 'archive') && <button onClick={(e) => { e.stopPropagation(); setConfirmationState({ isOpen: true, action: 'archive', debtorName, currency: currency as Currency, message: `هل أنت متأكد من أرشفة الدائن "${debtorName}"؟ سيتم أرشفة جميع مستحقاته النشطة.` }); }} title="أرشفة الدائن" className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"><Archive size={18} /></button>)
                                                                  : (hasPermission('receivables', 'archive') && <button onClick={(e) => { e.stopPropagation(); setConfirmationState({ isOpen: true, action: 'restore', debtorName, currency: currency as Currency, message: `هل أنت متأكد من استعادة الدائن "${debtorName}"؟` }); }} title="استعادة الدائن" className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400"><RefreshCcw size={18} /></button>)}
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="space-y-2 mt-3 pt-3 border-t border-gray-200 dark:border-dark-border animate-fade-in">
                                                {receivablesForDebtor.map(r => (
                                                    <div key={r.id} className={`flex justify-between items-center p-2 rounded-md border ${r.isArchived ? 'bg-gray-100 dark:bg-dark-bg/50 border-gray-200 dark:border-dark-border/50 opacity-70' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border'}`}>
                                                        <div>
                                                            <p className="text-gray-700 dark:text-gray-300">المبلغ: <span className="font-semibold font-mono">{formatCurrency(r.amount, r.currency)}</span></p>
                                                            <p className="text-xs text-gray-500">{formatDate(r.date)}</p>
                                                        </div>
                                                        <div className="text-xs text-right">
                                                            <p className="text-green-500">المدفوع: <span className="font-mono">{formatCurrency(r.paid, r.currency)}</span></p>
                                                            <p className="text-red-500">المتبقي: <span className="font-mono">{formatCurrency(r.amount - r.paid, r.currency)}</span></p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {!r.isArchived && hasPermission('receivables', 'pay') && r.amount - r.paid > 0 && <button onClick={() => openPaymentModal(r)} title="دفع" className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"><HandCoins size={18} /></button>}
                                                            {hasPermission('receivables', 'archive') && !r.isArchived && (<button onClick={() => archiveReceivable(r.id)} title="أرشفة" className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"><Archive size={18} /></button>)}
                                                            {r.isArchived && (<>{hasPermission('receivables', 'archive') && <button onClick={() => restoreReceivable(r.id)} title="استعادة" className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"><RefreshCcw size={18} /></button>}{hasPermission('receivables', 'deleteArchived') && <button onClick={() => handleDeleteReceivable(r.id)} title="حذف نهائي" className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"><Trash2 size={18} /></button>}</>)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
                 {/* FIX: Explicitly type `c` as any[] to resolve type inference issue. */}
                 {Object.values(debtorsByCurrencyToDisplay).every((c: any[]) => c.length === 0) && <p className="text-center text-gray-500 py-8">{view === 'active' ? 'لا توجد مستحقات نشطة.' : 'الأرشيف فارغ.'}</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مستحق جديد (دين على الشركة)">
                 <form onSubmit={handleAddReceivable} className="space-y-4">
                    <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={inputClasses}>
                        <option value={Currency.LYD}>دينار ليبي</option>
                        <option value={Currency.USD}>دولار أمريكي</option>
                        <option value={Currency.EUR}>يورو</option>
                        <option value={Currency.TND}>دينار تونسي</option>
                    </select>
                    <CreatableSelect
                        options={debtorOptions}
                        value={debtor}
                        onChange={(option) => setDebtor(option as any)}
                        onCreateOption={(inputValue) => setDebtor({value: inputValue, label: inputValue})}
                        placeholder="اختر أو أدخل اسم الدائن..."
                        noOptionsMessage={() => 'لا يوجد دائنون بهذه العملة، اكتب لإنشاء جديد.'}
                        formatCreateLabel={(inputValue) => `إضافة دائن جديد: "${inputValue}"`}
                        required
                        classNamePrefix="rs"
                    />
                    <FormattedInput inputMode="decimal" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses} />
                    <div className="relative flex items-start pt-2">
                        <div className="flex items-center h-5"><input id="depositIntoTreasury" type="checkbox" checked={depositIntoTreasury} onChange={e => setDepositIntoTreasury(e.target.checked)} className={checkboxClasses}/></div>
                        <div className="ms-3 text-sm"><label htmlFor="depositIntoTreasury" className="font-medium text-gray-700 dark:text-gray-300">إيداع المبلغ في الخزنة</label></div>
                    </div>

                    {depositIntoTreasury && (
                        <>
                            {currency === Currency.LYD ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                        <select value={destinationType} onChange={e => setDestinationType(e.target.value as 'cashLyd' | 'bank')} className={selectClasses}>
                                            <option value="cashLyd">الخزنة النقدية</option>
                                            <option value="bank">{ASSET_NAMES.bankLyd}</option>
                                        </select>
                                    </div>
                                    {destinationType === 'bank' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر المصرف</label>
                                            <select value={destinationBankId} onChange={e => setDestinationBankId(e.target.value)} required className={selectClasses}>
                                                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر الخزنة</label>
                                            <select value={destinationLydCashAsset} onChange={e => setDestinationLydCashAsset(e.target.value as AssetId)} required className={selectClasses}>
                                                {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : currency === Currency.USD ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={destinationUsdAsset} onChange={e => setDestinationUsdAsset(e.target.value as 'cashUsdLibya' | 'cashUsdTurkey')} className={selectClasses}>
                                        <option value="cashUsdLibya">{ASSET_NAMES.cashUsdLibya}</option>
                                        <option value="cashUsdTurkey">{ASSET_NAMES.cashUsdTurkey}</option>
                                    </select>
                                </div>
                            ) : currency === Currency.EUR ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={destinationEurAsset} onChange={e => setDestinationEurAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashEurLibya">{ASSET_NAMES.cashEurLibya}</option>
                                        <option value="cashEurTurkey">{ASSET_NAMES.cashEurTurkey}</option>
                                    </select>
                                </div>
                            ) : currency === Currency.TND ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={destinationTndAsset} onChange={e => setDestinationTndAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashTnd">{ASSET_NAMES.cashTnd}</option>
                                    </select>
                                </div>
                            ) : currency === Currency.SAR ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={destinationSarAsset} onChange={e => setDestinationSarAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashSar">{ASSET_NAMES.cashSar}</option>
                                    </select>
                                </div>
                            ) : currency === Currency.EGP ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={destinationEgpAsset} onChange={e => setDestinationEgpAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashEgp">{ASSET_NAMES.cashEgp}</option>
                                    </select>
                                </div>
                            ) : null}
                        </>
                    )}
                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">إضافة</button>
                </form>
            </Modal>
            
            {selectedReceivable && <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`دفع مستحق لـ ${selectedReceivable.debtor}`}>
                 <form onSubmit={handlePayReceivable} className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">المبلغ المتبقي: <span className="text-red-500 dark:text-red-400 font-mono">{formatCurrency(selectedReceivable.amount - selectedReceivable.paid, selectedReceivable.currency)}</span></p>
                    
                     <div className="relative flex items-start pt-2">
                        <div className="flex items-center h-5"><input id="isExternalPayment" type="checkbox" checked={isExternalPayment} onChange={e => setIsExternalPayment(e.target.checked)} className={checkboxClasses}/></div>
                        <div className="ms-3 text-sm"><label htmlFor="isExternalPayment" className="font-medium text-gray-700 dark:text-gray-300">تسديد خارج الخزنة</label></div>
                    </div>
                    
                    {!isExternalPayment && (
                        <>
                            {selectedReceivable.currency === Currency.LYD ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                        <select value={paymentSource} onChange={e => setPaymentSource(e.target.value as 'cashLyd' | 'bank')} className={selectClasses}>
                                            <option value="cashLyd">الخزنة النقدية</option>
                                            <option value="bank">{ASSET_NAMES.bankLyd}</option>
                                        </select>
                                    </div>
                                    {paymentSource === 'bank' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر المصرف</label>
                                            <select value={paymentBankId} onChange={e => setPaymentBankId(e.target.value)} required className={selectClasses}>
                                                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر الخزنة</label>
                                            <select value={paymentLydCashAsset} onChange={e => setPaymentLydCashAsset(e.target.value as AssetId)} required className={selectClasses}>
                                                {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : selectedReceivable.currency === Currency.USD ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                    <select value={paymentUsdAsset} onChange={e => setPaymentUsdAsset(e.target.value as 'cashUsdLibya' | 'cashUsdTurkey')} className={selectClasses}>
                                        <option value="cashUsdLibya">{ASSET_NAMES.cashUsdLibya}</option>
                                        <option value="cashUsdTurkey">{ASSET_NAMES.cashUsdTurkey}</option>
                                    </select>
                                </div>
                            ) : selectedReceivable.currency === Currency.EUR ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                    <select value={paymentEurAsset} onChange={e => setPaymentEurAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashEurLibya">{ASSET_NAMES.cashEurLibya}</option>
                                        <option value="cashEurTurkey">{ASSET_NAMES.cashEurTurkey}</option>
                                    </select>
                                </div>
                            ) : selectedReceivable.currency === Currency.TND ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                    <select value={paymentTndAsset} onChange={e => setPaymentTndAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashTnd">{ASSET_NAMES.cashTnd}</option>
                                    </select>
                                </div>
                            ) : selectedReceivable.currency === Currency.SAR ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                    <select value={paymentSarAsset} onChange={e => setPaymentSarAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashSar">{ASSET_NAMES.cashSar}</option>
                                    </select>
                                </div>
                            ) : selectedReceivable.currency === Currency.EGP ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                    <select value={paymentEgpAsset} onChange={e => setPaymentEgpAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashEgp">{ASSET_NAMES.cashEgp}</option>
                                    </select>
                                </div>
                            ) : null}
                        </>
                    )}


                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مبلغ الدفعة</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <FormattedInput inputMode="decimal" placeholder="مبلغ الدفعة" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-s-md focus:ring-primary dark:focus:ring-gold bg-gray-50 dark:bg-dark-bg border-gray-300 dark:border-dark-border" />
                            <button type="button" onClick={() => setPaymentAmount(String(selectedReceivable.amount - selectedReceivable.paid))} className="inline-flex items-center px-3 rounded-e-md border border-s-0 border-gray-300 dark:border-dark-border bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                                دفع كامل
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">دفع</button>
                </form>
            </Modal>}
            
             <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={onConfirmAction}
                title={modalProps.title}
                message={confirmationState.message}
                confirmButtonVariant={modalProps.variant}
                confirmText={modalProps.confirmText}
            />
            <DebtorHistoryModal 
                isOpen={isHistoryModalOpen} 
                onClose={() => setIsHistoryModalOpen(false)} 
                debtorName={selectedHistoryDebtor?.name || null} 
                transactions={transactions}
                currency={selectedHistoryDebtor?.currency || Currency.LYD}
            />
        </div>
    );
};

export default Receivables;