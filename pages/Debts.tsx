import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Currency, Customer, Debt, ASSET_NAMES, LYD_CASH_ASSET_IDS, AssetId, Receivable, Transaction } from '../types';
import Modal from '../components/Modal';
import { Plus, HandCoins, FileText, ChevronDown, ChevronUp, Archive, RefreshCcw, Search, ArrowUpDown, Filter, Combine, ArrowRightLeft, Users, Landmark, History, TrendingUp } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import CreatableSelect from 'react-select/creatable';
import FormattedInput from '../components/FormattedInput';

type CurrencyFilter = 'all' | Currency.USD | Currency.LYD;
type DateFilter = 'daily' | 'weekly' | 'monthly';

const CurrencyDisplay: React.FC<{ amount: number, currency: Currency, className?: string }> = ({ amount, currency, className }) => (
    <span className={`inline-flex items-center gap-2 font-mono ${className}`}>
        {currency === Currency.LYD && <span className="fi fi-ly fis" title="دينار ليبي"></span>}
        {currency === Currency.USD && <span className="fi fi-us fis" title="دولار أمريكي"></span>}
        {currency === Currency.EUR && <span className="fi fi-eu fis" title="يورو"></span>}
        {currency === Currency.TND && <span className="fi fi-tn fis" title="دينار تونسي"></span>}
        {formatCurrency(amount, currency)}
    </span>
);

const CustomerHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    transactions: Transaction[];
}> = ({ isOpen, onClose, customer, transactions }) => {
    const [dateFilter, setDateFilter] = useState<DateFilter>('daily');

    const filteredTransactions = useMemo(() => {
        if (!customer) return [];
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
        // Filter transactions where relatedParty matches customer name
        return transactions
            .filter(t => !t.isDeleted && t.relatedParty === customer.name && new Date(t.date) >= startDate)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [customer, transactions, dateFilter]);

    const totals = useMemo(() => {
        const totalIn = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalOut = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
        return { totalIn, totalOut };
    }, [filteredTransactions]);

    if (!isOpen || !customer) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`سجل حركات الزبون: ${customer.name}`} size="2xl">
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
                        <p className="text-sm text-green-700 dark:text-green-300">إجمالي المقبوضات (منه)</p>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400 font-mono">{formatCurrency(totals.totalIn, customer.currency)}</p>
                    </div>
                     <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg text-center">
                        <p className="text-sm text-red-700 dark:text-red-300">إجمالي المدفوعات (له)</p>
                        <p className="font-bold text-lg text-red-600 dark:text-red-400 font-mono">{formatCurrency(Math.abs(totals.totalOut), customer.currency)}</p>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

const Debts: React.FC = () => {
    const { customers, receivables, addCustomer, addDebt, payDebt, archiveCustomer, restoreCustomer, banks, hasPermission, mergeCustomerDebts, convertSingleUsdDebtToLyd, transactions } = useAppContext();
    
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'amount' | 'currency', direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
    const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all');

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isConversionModalOpen, setIsConversionModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);
    
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerCurrency, setNewCustomerCurrency] = useState<Currency>(Currency.LYD);
    const [isBankDebt, setIsBankDebt] = useState(false);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [newDebtAmount, setNewDebtAmount] = useState('');
    const [usdSourceAsset, setUsdSourceAsset] = useState<'cashUsdLibya' | 'cashUsdTurkey'>('cashUsdLibya');
    const [lydCashAsset, setLydCashAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [eurSourceAsset, setEurSourceAsset] = useState<AssetId>('cashEurLibya');
    const [tndSourceAsset, setTndSourceAsset] = useState<AssetId>('cashTnd');
    const [debtSourceBankId, setDebtSourceBankId] = useState('');
    const [isExternalDebt, setIsExternalDebt] = useState(false);
    const [externalDebtReason, setExternalDebtReason] = useState('');


    const [selectedDebt, setSelectedDebt] = useState<{ customerId: string, debt: Debt } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDestination, setPaymentDestination] = useState<'cashLyd' | 'bank' | 'cashUsd'>('cashLyd');
    const [paymentBankId, setPaymentBankId] = useState('');
    const [paymentUsdAsset, setPaymentUsdAsset] = useState<'cashUsdLibya' | 'cashUsdTurkey'>('cashUsdLibya');
    const [paymentLydCashAsset, setPaymentLydCashAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [paymentEurAsset, setPaymentEurAsset] = useState<AssetId>('cashEurLibya');
    const [paymentTndAsset, setPaymentTndAsset] = useState<AssetId>('cashTnd');
    const [isSettlement, setIsSettlement] = useState(false);
    const [settlementReceivableId, setSettlementReceivableId] = useState('');
    const [isExternalSettlement, setIsExternalSettlement] = useState(false);
    
    // Surplus handling state
    const [surplusInfo, setSurplusInfo] = useState<{ customerId: string; debtId: string; paymentAmount: number; remainingDebt: number; surplusAmount: number; destination: any; } | null>(null);
    const [surplusHandlingOption, setSurplusHandlingOption] = useState<'deposit' | 'profit' | 'receivable'>('deposit');
    const [surplusReceivableCustomer, setSurplusReceivableCustomer] = useState<{ label: string; value: string; __isNew__?: boolean } | null>(null);


    const [debtToConvert, setDebtToConvert] = useState<{ customer: Customer, debt: Debt } | null>(null);
    const [conversionMode, setConversionMode] = useState<'rate' | 'total'>('rate');
    const [rateInput, setRateInput] = useState('');
    const [totalInput, setTotalInput] = useState('');
    const [amountToConvert, setAmountToConvert] = useState('');
    const [destinationCustomer, setDestinationCustomer] = useState<{ label: string; value: string; __isNew__?: boolean } | null>(null);

    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        action: 'archive' | 'restore' | 'merge' | null;
        customerId: string | null;
        message: string;
    }>({ isOpen: false, action: null, customerId: null, message: '' });


    const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (newCustomerCurrency !== Currency.LYD) {
            setIsBankDebt(false);
        }
    }, [newCustomerCurrency]);

    const customersToShow = useMemo(() => {
        let sortableCustomers = customers.filter(c => {
            const viewMatch = view === 'active' ? !c.isArchived : c.isArchived;
            const searchMatch = searchTerm ? c.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            const currencyMatch = currencyFilter === 'all' ? true : c.currency === currencyFilter;
            const isExcludedCurrency = c.currency === Currency.SAR || c.currency === Currency.EGP;
            return viewMatch && searchMatch && currencyMatch && !isExcludedCurrency;
        });

        sortableCustomers.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            if (sortConfig.key === 'amount') {
                aValue = a.debts.filter(d => !d.isArchived).reduce((sum, d) => sum + (d.amount - d.paid), 0);
                bValue = b.debts.filter(d => !d.isArchived).reduce((sum, d) => sum + (d.amount - d.paid), 0);
            } else if (sortConfig.key === 'currency') {
                aValue = a.currency;
                bValue = b.currency;
            } else { // name
                aValue = a.name;
                bValue = b.name;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortableCustomers;

    }, [customers, view, searchTerm, sortConfig, currencyFilter]);

    const requestSort = (key: 'name' | 'amount' | 'currency') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const selectedCustomerForDebt = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    const selectedCustomerForPayment = useMemo(() => customers.find(c => c.id === selectedDebt?.customerId), [customers, selectedDebt]);
    const availableReceivablesForSettlement = useMemo(() => {
        if (!selectedCustomerForPayment) return [];
        return receivables.filter(r => !r.isArchived && r.currency === selectedCustomerForPayment.currency && (r.amount - r.paid > 0));
    }, [receivables, selectedCustomerForPayment]);
    const lydCustomers = useMemo(() => customers.filter(c => c.currency === Currency.LYD && !c.isArchived), [customers]);
    
    // Updated: Combined list of customers and receivables names for Surplus
    const surplusReceivableOptions = useMemo(() => {
        const uniqueNames = new Set<string>();
        // Add Customers
        customers.filter(c => !c.isArchived).forEach(c => uniqueNames.add(c.name));
        // Add Receivables (Debtors)
        receivables.filter(r => !r.isArchived).forEach(r => uniqueNames.add(r.debtor));
        
        return Array.from(uniqueNames).sort().map(name => ({ value: name, label: name }));
    }, [customers, receivables]);

    const lydCustomerOptions = useMemo(() => 
        lydCustomers.map(c => ({ value: c.id, label: c.name })), 
        [lydCustomers]
    );

    useEffect(() => {
        if (banks.length > 0) {
            setPaymentBankId(banks[0].id);
            setDebtSourceBankId(banks[0].id);
        }
    }, [banks]);

    useEffect(() => {
        if(isPaymentModalOpen && availableReceivablesForSettlement.length > 0) {
            setSettlementReceivableId(availableReceivablesForSettlement[0].id);
        }
    }, [isPaymentModalOpen, availableReceivablesForSettlement]);

    const toggleCustomerExpansion = (customerId: string) => {
        setExpandedCustomers(prev => ({...prev, [customerId]: !prev[customerId]}));
    };

    const handleAddCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        addCustomer(newCustomerName, newCustomerCurrency, isBankDebt);
        setNewCustomerName('');
        setIsBankDebt(false);
        setIsCustomerModalOpen(false);
    };

    const handleAddDebt = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(newDebtAmount);
        if(isNaN(amount) || amount <= 0) return;
        if(isExternalDebt && !externalDebtReason) {
            alert("يرجى إدخال سبب الدين الخارجي.");
            return;
        }

        const groupId = crypto.randomUUID();
        
        let sourceOptions = {};
        if (!isExternalDebt && !selectedCustomerForDebt?.isBankDebt) {
            switch (selectedCustomerForDebt?.currency) {
                case Currency.USD:
                    sourceOptions = { usdSourceAsset };
                    break;
                case Currency.EUR:
                    sourceOptions = { lydCashAssetId: eurSourceAsset }; // Re-using generic field
                    break;
                case Currency.TND:
                    sourceOptions = { lydCashAssetId: tndSourceAsset }; // Re-using generic field
                    break;
                case Currency.LYD:
                    sourceOptions = { lydCashAssetId: lydCashAsset };
                    break;
            }
        }

        const options = isExternalDebt
            ? { isExternal: true, reason: externalDebtReason, groupId }
            : selectedCustomerForDebt?.isBankDebt
                ? { bankId: debtSourceBankId, groupId }
                : { ...sourceOptions, groupId };

        addDebt(selectedCustomerId, amount, options as any);
        setNewDebtAmount('');
        setIsDebtModalOpen(false);
    };

    const handlePayDebt = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDebt) return;
    
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;
    
        const remainingDebt = selectedDebt.debt.amount - selectedDebt.debt.paid;
    
        let destination: any; // Simplified destination object
    
        if (isExternalSettlement) {
            destination = { type: 'external_settlement', assetId: 'external_settlement' };
        } else if (isSettlement) {
            if (!settlementReceivableId) { alert('يرجى اختيار مستحق للتسوية.'); return; }
            destination = { type: 'settlement', receivableId: settlementReceivableId, assetId: 'settlement' };
        } else {
            switch (selectedCustomerForPayment?.currency) {
                case Currency.LYD:
                    destination = paymentDestination === 'bank'
                        ? { type: 'bank', bankId: paymentBankId, assetId: paymentBankId }
                        : { type: 'cashLyd', assetId: paymentLydCashAsset };
                    break;
                case Currency.USD:
                    destination = { type: 'cashUsd', assetId: paymentUsdAsset };
                    break;
                case Currency.EUR:
                    destination = { type: 'cashLyd', assetId: paymentEurAsset };
                    break;
                case Currency.TND:
                    destination = { type: 'cashLyd', assetId: paymentTndAsset };
                    break;
                default:
                    alert('عملة غير معروفة');
                    return;
            }
        }
    
        if (amount > remainingDebt) {
            setSurplusInfo({
                customerId: selectedDebt.customerId,
                debtId: selectedDebt.debt.id,
                paymentAmount: amount,
                remainingDebt: remainingDebt,
                surplusAmount: amount - remainingDebt,
                destination: destination
            });
        } else {
            payDebt(selectedDebt.customerId, selectedDebt.debt.id, amount, destination);
            setPaymentAmount('');
            setIsPaymentModalOpen(false);
            setSelectedDebt(null);
        }
    };
    
    const handleConfirmSurplusPayment = () => {
        if (!surplusInfo) return;
    
        if (surplusHandlingOption === 'receivable' && !surplusReceivableCustomer) {
            alert("الرجاء اختيار أو إنشاء دائن لتسجيل المستحق.");
            return;
        }
    
        const options = {
            surplusHandling: {
                type: surplusHandlingOption,
                // Pass the name from label directly, ignoring UUID lookup since we use names for linking
                receivableCustomerId: undefined, 
                newReceivableCustomerName: surplusHandlingOption === 'receivable' ? surplusReceivableCustomer?.label : undefined,
            }
        };
    
        payDebt(
            surplusInfo.customerId, 
            surplusInfo.debtId, 
            surplusInfo.paymentAmount, 
            surplusInfo.destination, 
            options as any
        );
        
        setSurplusInfo(null);
        setPaymentAmount('');
        setIsPaymentModalOpen(false);
        setSelectedDebt(null);
        setSurplusHandlingOption('deposit');
        setSurplusReceivableCustomer(null);
    };

    const openDebtModal = (customerId: string) => {
        setSelectedCustomerId(customerId);
        setIsExternalDebt(false);
        setExternalDebtReason('');
        setIsDebtModalOpen(true);
    };
    
    const openPaymentModal = (customerId: string, debt: Debt) => {
        setSelectedDebt({ customerId, debt });
        const customer = customers.find(c => c.id === customerId);
        
        if (customer?.currency === Currency.USD) {
            setPaymentDestination('cashUsd');
        } else {
            setPaymentDestination('cashLyd');
        }
        setIsSettlement(false);
        setIsExternalSettlement(false);
        setPaymentAmount('');
        if (banks.length > 0) setPaymentBankId(banks[0].id);
        
        setIsPaymentModalOpen(true);
    };

    const openConversionModal = (customer: Customer, debt: Debt) => {
        setDebtToConvert({ customer, debt });
        setRateInput('');
        setTotalInput('');
        setAmountToConvert('');
        setConversionMode('rate');
        setDestinationCustomer(null);
        setIsConversionModalOpen(true);
    };
    
    const openHistoryModal = (customer: Customer) => {
        setSelectedHistoryCustomer(customer);
        setIsHistoryModalOpen(true);
    };
    
    const handleConversionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const rate = parseFloat(rateInput);
        const total = parseFloat(totalInput);
        const usdToConvert = parseFloat(amountToConvert);
    
        if (!debtToConvert) return;
        const unpaidUsdAmount = debtToConvert.debt.amount - debtToConvert.debt.paid;

        if (isNaN(usdToConvert) || usdToConvert <= 0 || usdToConvert > unpaidUsdAmount) {
            alert("الرجاء إدخال مبلغ دولار صحيح لا يتجاوز الدين المتبقي.");
            return;
        }

        if (!destinationCustomer) {
            alert("يرجى اختيار زبون لوضع الدين عليه أو إنشاء زبون جديد.");
            return;
        }
    
        const validConversion = (conversionMode === 'rate' && !isNaN(rate) && rate > 0) || (conversionMode === 'total' && !isNaN(total) && total > 0);

        if (validConversion) {
            const destination: { type: 'existing_customer' | 'new_customer'; customerId?: string; newCustomerName?: string; } = {
                type: destinationCustomer.__isNew__ ? 'new_customer' : 'existing_customer',
                customerId: destinationCustomer.__isNew__ ? undefined : destinationCustomer.value,
                newCustomerName: destinationCustomer.__isNew__ ? destinationCustomer.label : undefined,
            };

            convertSingleUsdDebtToLyd({ 
                customerId: debtToConvert.customer.id, 
                debtId: debtToConvert.debt.id, 
                usdAmountToConvert: usdToConvert,
                conversion: { rate: rate || undefined, totalLydAmount: total || undefined },
                destination
            });
            setIsConversionModalOpen(false);
        } else {
            alert("يرجى إدخال قيمة صحيحة.");
        }
    };

    useEffect(() => {
        if (!debtToConvert) return;
        const usdToConvert = parseFloat(amountToConvert);
    
        if (conversionMode === 'rate') {
            const rate = parseFloat(rateInput);
            if (!isNaN(rate) && rate > 0 && !isNaN(usdToConvert) && usdToConvert > 0) {
                setTotalInput((usdToConvert * rate).toFixed(3));
            } else {
                setTotalInput('');
            }
        }
    }, [rateInput, conversionMode, debtToConvert, amountToConvert]);
    
    useEffect(() => {
        if (!debtToConvert) return;
        const usdToConvert = parseFloat(amountToConvert);
    
        if (conversionMode === 'total') {
            const total = parseFloat(totalInput);
            if (!isNaN(total) && total > 0 && !isNaN(usdToConvert) && usdToConvert > 0) {
                setRateInput((total / usdToConvert).toFixed(4));
            } else {
                setRateInput('');
            }
        }
    }, [totalInput, conversionMode, debtToConvert, amountToConvert]);

    const onConfirmAction = () => {
        if (confirmationState.customerId) {
            switch (confirmationState.action) {
                case 'archive':
                    archiveCustomer(confirmationState.customerId);
                    break;
                case 'restore':
                    restoreCustomer(confirmationState.customerId);
                    break;
                case 'merge':
                    mergeCustomerDebts(confirmationState.customerId);
                    break;
            }
        }
        closeConfirmationModal();
    };

    const closeConfirmationModal = () => {
        setConfirmationState({ isOpen: false, action: null, customerId: null, message: '' });
    };

    const inputClasses = "w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-200 focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";
    const selectClasses = "mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";

    const getModalProps = () => {
        switch (confirmationState.action) {
            case 'archive':
                return { title: "تأكيد الأرشفة", confirmText: "أرشفة", variant: 'danger' as const };
            case 'restore':
                return { title: "تأكيد الاستعادة", confirmText: "استعادة", variant: 'primary' as const };
            case 'merge':
                return { title: "تأكيد الدمج", confirmText: "دمج", variant: 'primary' as const };
            default:
                return { title: "تأكيد", confirmText: "تأكيد", variant: 'primary' as const };
        }
    };
    const modalProps = getModalProps();

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                     <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">إدارة الديون</h2>
                     <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                        <button 
                            onClick={() => setView('active')} 
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'active' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                            الديون النشطة
                        </button>
                        <button 
                            onClick={() => setView('archived')} 
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'archived' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                            الأرشيف
                        </button>
                    </div>
                </div>
                {hasPermission('debts', 'addCustomer') && (
                    <button onClick={() => setIsCustomerModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-opacity">
                        <Plus size={18} /> إضافة زبون
                    </button>
                )}
            </div>

             <div className="flex flex-wrap justify-between items-center gap-4 p-4 bg-gray-100 dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border">
                <div className="relative flex-grow">
                    <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="ابحث عن زبون..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-dark-bg ps-10 p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold"
                    />
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-500 dark:text-gray-400"/>
                        <span className="text-sm text-gray-600 dark:text-gray-400">العملة:</span>
                        <div className="flex gap-1 rounded-lg bg-white dark:bg-dark-bg p-1 border border-gray-300 dark:border-dark-border">
                            {(['all', Currency.LYD, Currency.USD] as CurrencyFilter[]).map(c => (
                                <button key={c} onClick={() => setCurrencyFilter(c)} className={`px-3 py-1 text-xs rounded-md transition-colors ${currencyFilter === c ? 'bg-primary/20 dark:bg-gold/20 text-primary-dark dark:text-gold font-semibold' : 'hover:bg-gray-200 dark:hover:bg-white/10'}`}>
                                    {c === 'all' ? 'الكل' : c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">فرز حسب:</span>
                        <button onClick={() => requestSort('name')} className="px-3 py-1.5 text-sm rounded-md bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border flex items-center gap-1">الاسم <ArrowUpDown size={14} /></button>
                        <button onClick={() => requestSort('amount')} className="px-3 py-1.5 text-sm rounded-md bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border flex items-center gap-1">المبلغ <ArrowUpDown size={14} /></button>
                        <button onClick={() => requestSort('currency')} className="px-3 py-1.5 text-sm rounded-md bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border flex items-center gap-1">العملة <ArrowUpDown size={14} /></button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {customersToShow.map(customer => {
                    const activeDebts = customer.debts.filter(d => !d.isArchived);
                    const totalDebt = activeDebts.reduce((sum, d) => sum + d.amount, 0);
                    const totalPaid = activeDebts.reduce((sum, d) => sum + d.paid, 0);
                    const remainingDebt = totalDebt - totalPaid;
                    const isExpanded = expandedCustomers[customer.id] ?? false;
                    const unpaidDebtsCount = activeDebts.filter(d => d.amount - d.paid > 0).length;

                    return (
                        <div key={customer.id} className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-4 transition-all duration-300 border border-gray-200 dark:border-dark-border">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4 flex-grow">
                                     <button onClick={() => toggleCustomerExpansion(customer.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-gold">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                            {customer.name}
                                            {customer.isBankDebt && (
                                                <span title="دين على المصرف">
                                                    <Landmark size={16} className="text-blue-500 dark:text-blue-400" />
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-red-500 dark:text-red-400 font-semibold flex items-center gap-2">
                                            <span>إجمالي الدين المتبقي:</span>
                                            <CurrencyDisplay amount={remainingDebt} currency={customer.currency} />
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button onClick={(e) => { e.stopPropagation(); openHistoryModal(customer); }} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2" title="السجل">
                                        <History size={18} />
                                     </button>
                                     {hasPermission('debts', 'archive') && (
                                        view === 'active' ? (
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmationState({ isOpen: true, action: 'archive', customerId: customer.id, message: 'هل أنت متأكد من أرشفة هذا الزبون وجميع ديونه؟' }); }} title={'أرشفة الزبون'} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                                                <Archive size={18} />
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmationState({ isOpen: true, action: 'restore', customerId: customer.id, message: 'هل أنت متأكد من استعادة هذا الزبون؟' }); }} title={'استعادة الزبون'} className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400">
                                                <RefreshCcw size={18} />
                                            </button>
                                        )
                                     )}
                                    {view === 'active' && hasPermission('debts', 'addDebt') && (
                                        <>
                                            {unpaidDebtsCount > 1 && (
                                                 <button onClick={(e) => { e.stopPropagation(); setConfirmationState({ isOpen: true, action: 'merge', customerId: customer.id, message: 'هل أنت متأكد من دمج جميع الديون لهذا الزبون؟' }); }} title="دمج الديون" className="p-2 text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"><Combine size={18} /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); openDebtModal(customer.id); }} title="إضافة دين" className="p-2 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"><Plus size={18} /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {isExpanded && (
                                <div className="mt-4 space-y-2 border-t border-gray-200 dark:border-dark-border pt-4 animate-fade-in">
                                    {activeDebts.map(debt => (
                                        <div key={debt.id} className={`flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border ${debt.isArchived ? 'border-yellow-200 dark:border-yellow-900/50' : 'border-gray-200 dark:border-dark-border'}`}>
                                            <div>
                                                <p className="font-bold text-gray-700 dark:text-gray-300">
                                                    <CurrencyDisplay amount={debt.amount} currency={customer.currency} />
                                                </p>
                                                <p className="text-xs text-gray-500">{formatDate(debt.date)}</p>
                                            </div>
                                            <div className="text-end text-sm">
                                                <p className="text-green-600 dark:text-green-400">مدفوع: {formatCurrency(debt.paid, customer.currency)}</p>
                                                <p className="text-red-500 dark:text-red-400">متبقي: {formatCurrency(debt.amount - debt.paid, customer.currency)}</p>
                                            </div>
                                            {view === 'active' && (
                                                <div className="flex items-center gap-2">
                                                    {hasPermission('debts', 'payDebt') && debt.amount - debt.paid > 0 && (
                                                        <button onClick={() => openPaymentModal(customer.id, debt)} className="p-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300" title="دفع"><HandCoins size={18} /></button>
                                                    )}
                                                    {hasPermission('dailyTransactions', 'buySellUsd') && customer.currency === Currency.USD && debt.amount - debt.paid > 0 && (
                                                        <button onClick={() => openConversionModal(customer, debt)} className="p-2 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300" title="تحويل عملة الدين"><ArrowRightLeft size={18} /></button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {activeDebts.length === 0 && <p className="text-center text-gray-500 text-sm">لا توجد ديون نشطة لهذا الزبون.</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add Customer Modal */}
            <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="إضافة زبون جديد">
                <form onSubmit={handleAddCustomer} className="space-y-4">
                    <input type="text" placeholder="اسم الزبون" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} required className={inputClasses} />
                    <select value={newCustomerCurrency} onChange={e => setNewCustomerCurrency(e.target.value as Currency)} className={selectClasses}>
                        {Object.values(Currency)
                            .filter(c => c !== Currency.SAR && c !== Currency.EGP)
                            .map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {newCustomerCurrency === Currency.LYD && (
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input id="isBankDebt" type="checkbox" checked={isBankDebt} onChange={e => setIsBankDebt(e.target.checked)} className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold" />
                            </div>
                            <div className="ms-3 text-sm">
                                <label htmlFor="isBankDebt" className="font-medium text-gray-700 dark:text-gray-300">دين على المصرف</label>
                            </div>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">إضافة</button>
                </form>
            </Modal>

            {/* Add Debt Modal */}
            <Modal isOpen={isDebtModalOpen} onClose={() => setIsDebtModalOpen(false)} title={`إضافة دين جديد لـ ${selectedCustomerForDebt?.name}`}>
                <form onSubmit={handleAddDebt} className="space-y-4">
                    <FormattedInput inputMode="decimal" placeholder="المبلغ" value={newDebtAmount} onChange={e => setNewDebtAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses} />
                    
                    <div className="relative flex items-start">
                        <div className="flex items-center h-5">
                            <input id="isExternalDebt" type="checkbox" checked={isExternalDebt} onChange={e => setIsExternalDebt(e.target.checked)} className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold" />
                        </div>
                        <div className="ms-3 text-sm">
                            <label htmlFor="isExternalDebt" className="font-medium text-gray-700 dark:text-gray-300">دين خارجي (لا يؤثر على الخزنة)</label>
                        </div>
                    </div>

                    {isExternalDebt && (
                        <input type="text" placeholder="سبب الدين الخارجي" value={externalDebtReason} onChange={e => setExternalDebtReason(e.target.value)} required className={inputClasses} />
                    )}

                    {!isExternalDebt && (
                        selectedCustomerForDebt?.isBankDebt ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من المصرف</label>
                                <select value={debtSourceBankId} onChange={e => setDebtSourceBankId(e.target.value)} className={selectClasses}>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <>
                                {selectedCustomerForDebt?.currency === Currency.USD && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                        <select value={usdSourceAsset} onChange={e => setUsdSourceAsset(e.target.value as 'cashUsdLibya' | 'cashUsdTurkey')} className={selectClasses}>
                                            <option value="cashUsdLibya">{ASSET_NAMES.cashUsdLibya}</option>
                                            <option value="cashUsdTurkey">{ASSET_NAMES.cashUsdTurkey}</option>
                                        </select>
                                    </div>
                                )}
                                {selectedCustomerForDebt?.currency === Currency.EUR && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                        <select value={eurSourceAsset} onChange={e => setEurSourceAsset(e.target.value as AssetId)} className={selectClasses}>
                                            <option value="cashEurLibya">{ASSET_NAMES.cashEurLibya}</option>
                                            <option value="cashEurTurkey">{ASSET_NAMES.cashEurTurkey}</option>
                                        </select>
                                    </div>
                                )}
                                {selectedCustomerForDebt?.currency === Currency.TND && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                        <select value={tndSourceAsset} onChange={e => setTndSourceAsset(e.target.value as AssetId)} className={selectClasses}>
                                            <option value="cashTnd">{ASSET_NAMES.cashTnd}</option>
                                        </select>
                                    </div>
                                )}
                                {selectedCustomerForDebt?.currency === Currency.LYD && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم من</label>
                                        <select value={lydCashAsset} onChange={e => setLydCashAsset(e.target.value as AssetId)} className={selectClasses}>
                                            {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                        </select>
                                    </div>
                                )}
                            </>
                        )
                    )}
                    
                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">إضافة</button>
                </form>
            </Modal>

            {/* Payment Modal */}
            {isPaymentModalOpen && <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`تسديد دين عن ${selectedCustomerForPayment?.name}`}>
                <form onSubmit={handlePayDebt} className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        المبلغ المتبقي من الدين المحدد: <span className="font-bold text-red-500">{formatCurrency(selectedDebt ? selectedDebt.debt.amount - selectedDebt.debt.paid : 0, selectedCustomerForPayment?.currency || Currency.LYD)}</span>
                    </p>
                    <div className="flex gap-2">
                        <FormattedInput inputMode="decimal" placeholder="مبلغ الدفعة" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses} />
                        <button type="button" onClick={() => setPaymentAmount(String(selectedDebt ? selectedDebt.debt.amount - selectedDebt.debt.paid : 0))} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm whitespace-nowrap hover:bg-gray-300 dark:hover:bg-gray-600">كامل المبلغ</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input id="isSettlement" type="checkbox" checked={isSettlement} onChange={e => { setIsSettlement(e.target.checked); if(e.target.checked) setIsExternalSettlement(false); }} className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold" />
                            </div>
                            <div className="ms-3 text-sm">
                                <label htmlFor="isSettlement" className="font-medium text-gray-700 dark:text-gray-300">تسوية مع مستحق</label>
                            </div>
                        </div>
                         <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input id="isExternalSettlement" type="checkbox" checked={isExternalSettlement} onChange={e => { setIsExternalSettlement(e.target.checked); if(e.target.checked) setIsSettlement(false); }} className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold" />
                            </div>
                            <div className="ms-3 text-sm">
                                <label htmlFor="isExternalSettlement" className="font-medium text-gray-700 dark:text-gray-300">تسوية خارجية</label>
                            </div>
                        </div>
                    </div>

                    {isSettlement && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المستحق</label>
                            <select value={settlementReceivableId} onChange={e => setSettlementReceivableId(e.target.value)} className={selectClasses}>
                                {availableReceivablesForSettlement.map(r => <option key={r.id} value={r.id}>{r.debtor} ({formatCurrency(r.amount - r.paid, r.currency)})</option>)}
                            </select>
                            {availableReceivablesForSettlement.length === 0 && <p className="text-xs text-red-500 mt-1">لا توجد مستحقات متاحة بنفس العملة.</p>}
                        </div>
                    )}


                    {!isSettlement && !isExternalSettlement && (
                        <>
                            {selectedCustomerForPayment?.currency === Currency.LYD && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                        <select value={paymentDestination} onChange={e => setPaymentDestination(e.target.value as 'cashLyd' | 'bank')} className={selectClasses}>
                                            <option value="cashLyd">الخزنة النقدية</option>
                                            <option value="bank">{ASSET_NAMES.bankLyd}</option>
                                        </select>
                                    </div>
                                    {paymentDestination === 'bank' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المصرف</label>
                                            <select value={paymentBankId} onChange={e => setPaymentBankId(e.target.value)} className={selectClasses}>
                                                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الخزنة</label>
                                            <select value={paymentLydCashAsset} onChange={e => setPaymentLydCashAsset(e.target.value as AssetId)} className={selectClasses}>
                                                {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                            {selectedCustomerForPayment?.currency === Currency.USD && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={paymentUsdAsset} onChange={e => setPaymentUsdAsset(e.target.value as 'cashUsdLibya' | 'cashUsdTurkey')} className={selectClasses}>
                                        <option value="cashUsdLibya">{ASSET_NAMES.cashUsdLibya}</option>
                                        <option value="cashUsdTurkey">{ASSET_NAMES.cashUsdTurkey}</option>
                                    </select>
                                </div>
                            )}
                             {selectedCustomerForPayment?.currency === Currency.EUR && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={paymentEurAsset} onChange={e => setPaymentEurAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashEurLibya">{ASSET_NAMES.cashEurLibya}</option>
                                        <option value="cashEurTurkey">{ASSET_NAMES.cashEurTurkey}</option>
                                    </select>
                                </div>
                            )}
                            {selectedCustomerForPayment?.currency === Currency.TND && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع في</label>
                                    <select value={paymentTndAsset} onChange={e => setPaymentTndAsset(e.target.value as AssetId)} className={selectClasses}>
                                        <option value="cashTnd">{ASSET_NAMES.cashTnd}</option>
                                    </select>
                                </div>
                            )}
                        </>
                    )}

                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">تسديد</button>
                </form>
            </Modal>}

            {surplusInfo && (
                <Modal isOpen={!!surplusInfo} onClose={() => setSurplusInfo(null)} title="معالجة المبلغ الفائض">
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-100 dark:bg-dark-bg rounded-lg space-y-2 text-center">
                            <p>المبلغ الإجمالي: <span className="font-mono font-bold">{formatCurrency(surplusInfo.paymentAmount, selectedCustomerForPayment!.currency)}</span></p>
                            <p>لتسوية الدين: <span className="font-mono text-green-500">{formatCurrency(surplusInfo.remainingDebt, selectedCustomerForPayment!.currency)}</span></p>
                            <p>المبلغ الفائض: <span className="font-mono font-bold text-yellow-400">{formatCurrency(surplusInfo.surplusAmount, selectedCustomerForPayment!.currency)}</span></p>
                        </div>
                        
                        <p className="font-semibold text-gray-700 dark:text-gray-300">كيف تريد التعامل مع الفائض؟</p>
                        
                        <div className="space-y-2">
                            <label className="flex items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border cursor-pointer">
                                <input type="radio" name="surplusHandling" value="deposit" checked={surplusHandlingOption === 'deposit'} onChange={() => setSurplusHandlingOption('deposit')} className="form-radio h-4 w-4 text-primary dark:text-gold" />
                                <span className="ms-3 text-sm text-gray-700 dark:text-gray-300">إيداع في الخزنة فقط</span>
                            </label>
                             <label className="flex items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border cursor-pointer">
                                <input type="radio" name="surplusHandling" value="profit" checked={surplusHandlingOption === 'profit'} onChange={() => setSurplusHandlingOption('profit')} className="form-radio h-4 w-4 text-primary dark:text-gold" />
                                <span className="ms-3 text-sm text-gray-700 dark:text-gray-300">تسجيل كمربح</span>
                            </label>
                             <label className="flex items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border cursor-pointer">
                                <input type="radio" name="surplusHandling" value="receivable" checked={surplusHandlingOption === 'receivable'} onChange={() => setSurplusHandlingOption('receivable')} className="form-radio h-4 w-4 text-primary dark:text-gold" />
                                <span className="ms-3 text-sm text-gray-700 dark:text-gray-300">تسجيل كمستحق (دين على الشركة)</span>
                            </label>
                        </div>

                        {surplusHandlingOption === 'receivable' && (
                            <div className="p-3 bg-gray-100 dark:bg-dark-bg/50 rounded-lg animate-fade-in">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تسجيل المستحق على</label>
                                <CreatableSelect
                                    isClearable
                                    options={surplusReceivableOptions}
                                    value={surplusReceivableCustomer}
                                    onChange={(option) => setSurplusReceivableCustomer(option)}
                                    placeholder="اختر أو أنشئ دائن..."
                                    formatCreateLabel={(inputValue) => `إضافة دائن جديد: "${inputValue}"`}
                                    classNamePrefix="rs"
                                />
                            </div>
                        )}
                        
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setSurplusInfo(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">إلغاء</button>
                            <button type="button" onClick={handleConfirmSurplusPayment} className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg">تأكيد</button>
                        </div>
                    </div>
                </Modal>
            )}
            
            {isConversionModalOpen && debtToConvert && (
                <Modal isOpen={isConversionModalOpen} onClose={() => setIsConversionModalOpen(false)} title={`تحويل دين ${debtToConvert.customer.name}`}>
                    <form onSubmit={handleConversionSubmit} className="space-y-4">
                        <p className="text-gray-600 dark:text-gray-300">
                            الدين الأصلي المتبقي: <span className="font-bold text-red-500">{formatCurrency(debtToConvert.debt.amount - debtToConvert.debt.paid, Currency.USD)}</span>
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مبلغ الدولار المراد تحويله</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <FormattedInput
                                    inputMode="decimal"
                                    placeholder="مبلغ الدولار"
                                    value={amountToConvert}
                                    onChange={e => setAmountToConvert(e.target.value.replace(/[^0-9.]/g, ''))}
                                    required
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-s-md focus:ring-primary dark:focus:ring-gold bg-gray-50 dark:bg-dark-bg border-gray-300 dark:border-dark-border"
                                />
                                <button
                                    type="button"
                                    onClick={() => setAmountToConvert(String(debtToConvert.debt.amount - debtToConvert.debt.paid))}
                                    className="inline-flex items-center px-3 rounded-e-md border border-s-0 border-gray-300 dark:border-dark-border bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                                >
                                    كامل المبلغ
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
                            <button type="button" onClick={() => setConversionMode('rate')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${conversionMode === 'rate' ? 'bg-white dark:bg-dark-card shadow text-primary dark:text-gold' : 'text-gray-600 dark:text-gray-400'}`}>
                                حسب السعر
                            </button>
                            <button type="button" onClick={() => setConversionMode('total')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${conversionMode === 'total' ? 'bg-white dark:bg-dark-card shadow text-primary dark:text-gold' : 'text-gray-600 dark:text-gray-400'}`}>
                                حسب الإجمالي
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">سعر الصرف</label>
                                <FormattedInput
                                    inputMode="decimal"
                                    value={rateInput}
                                    onChange={e => setRateInput(e.target.value.replace(/[^0-9.]/g, ''))}
                                    disabled={conversionMode === 'total'}
                                    required={conversionMode === 'rate'}
                                    className={inputClasses}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المجموع بالدينار (LYD)</label>
                                <FormattedInput
                                    inputMode="decimal"
                                    value={totalInput}
                                    onChange={e => setTotalInput(e.target.value.replace(/[^0-9.]/g, ''))}
                                    disabled={conversionMode === 'rate'}
                                    required={conversionMode === 'total'}
                                    className={inputClasses}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تحويل الدين إلى زبون (LYD)</label>
                            <CreatableSelect
                                isClearable
                                options={lydCustomerOptions}
                                value={destinationCustomer}
                                onChange={(option) => setDestinationCustomer(option)}
                                placeholder="اختر أو أضف زبون جديد..."
                                formatCreateLabel={(inputValue) => `إضافة زبون جديد: "${inputValue}"`}
                                classNamePrefix="rs"
                                className="mt-1"
                            />
                        </div>

                        <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">
                            تنفيذ التحويل
                        </button>
                    </form>
                </Modal>
            )}

             <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={onConfirmAction}
                title={modalProps.title}
                message={confirmationState.message}
                confirmButtonVariant={modalProps.variant}
                confirmText={modalProps.confirmText}
            />
            <CustomerHistoryModal 
                isOpen={isHistoryModalOpen} 
                onClose={() => setIsHistoryModalOpen(false)} 
                customer={selectedHistoryCustomer} 
                transactions={transactions}
            />
        </div>
    );
};

export default Debts;