
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Currency, ASSET_NAMES, AssetId, LYD_CASH_ASSET_IDS, PendingTrade, Receivable } from '../types';
import Modal from './Modal';
import { DollarSign, ArrowRightLeft, Globe, RefreshCw, ClipboardList, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import FormattedInput from './FormattedInput';

type Tab = 'buy_sell' | 'adjust_balance' | 'other_currencies';
type InputMode = 'rate' | 'total';

const formatOptionLabel = ({ label, flag, icon }: { value: string, label: string, flag: string, icon?: string }) => (
  <div className="flex items-center">
    {icon && <span className="me-2">{icon}</span>}
    {flag && <span className={`fi fi-${flag} fis me-2`}></span>}
    <span>{label}</span>
  </div>
);

const DailyTransactionsModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    tradeToEdit?: PendingTrade | null;
}> = ({ isOpen, onClose, tradeToEdit }) => {
    const { 
        customers, 
        buyUsd, sellUsd, adjustAssetBalance, 
        banks, 
        buyForeignCurrency, sellForeignCurrency, 
        hasPermission, 
        addPendingTrade,
        updatePendingTrade,
        receivables,
    } = useAppContext();
    
    const canBuySellUsd = hasPermission('dailyTransactions', 'buySellUsd');
    const canBuySellOther = hasPermission('dailyTransactions', 'buySellOther');
    const canAdjustBalance = hasPermission('dailyTransactions', 'adjustBalance');
    const canUsePending = hasPermission('incompleteTrades', 'view');
    const isEditMode = !!tradeToEdit;

    const lydAssetIcons: Record<string, string> = {
        cashLydMisrata: '🐎',
        cashLydTripoli: '🌴',
        cashLydZliten: '🟩',
    };

    const getDefaultTab = (): Tab => {
        if (canBuySellUsd) return 'buy_sell';
        if (canBuySellOther) return 'other_currencies';
        if (canAdjustBalance) return 'adjust_balance';
        return 'buy_sell';
    };

    const [activeTab, setActiveTab] = useState<Tab>(getDefaultTab());

    useEffect(() => {
        if (!isOpen) {
            resetForms();
        } else {
             if (!tradeToEdit) {
                setActiveTab(getDefaultTab());
             }
        }
    }, [isOpen, tradeToEdit]);

    // State for Buy/Sell USD
    const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
    const [usdAmount, setUsdAmount] = useState('');
    const [rate, setRate] = useState('');
    const [note, setNote] = useState('');
    const [totalLyd, setTotalLyd] = useState('');
    const [usdInputMode, setUsdInputMode] = useState<InputMode>('rate');
    const [isPending, setIsPending] = useState(false);
    const [originalUsdRate, setOriginalUsdRate] = useState<string | null>(null);


    // -- Options
    const [isDebt, setIsDebt] = useState(false);
    const [isReceivable, setIsReceivable] = useState(false);
    const [receivablePartyOption, setReceivablePartyOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);
    // -- Buy state
    const [buyUsdDestination, setBuyUsdDestination] = useState<'cashUsdLibya' | 'cashUsdTurkey'>('cashUsdLibya');
    const [buyLydSource, setBuyLydSource] = useState<'cashLyd' | 'bank'>('cashLyd');
    const [buySourceBankId, setBuySourceBankId] = useState('');
    const [buyLydCashAsset, setBuyLydCashAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    // -- Sell state
    const [sellUsdSource, setSellUsdSource] = useState<'cashUsdLibya' | 'cashUsdTurkey'>('cashUsdLibya');
    const [sellLydDestination, setSellLydDestination] = useState<'cashLyd' | 'bank'>('cashLyd');
    const [sellDestinationBankId, setSellDestinationBankId] = useState('');
    const [sellLydCashAsset, setSellLydCashAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    // -- Debt state
    const [debtCustomerOption, setDebtCustomerOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);
    // -- Receivable Settlement state
    const [isReceivableSettlement, setIsReceivableSettlement] = useState(false);
    const [settlementReceivableId, setSettlementReceivableId] = useState('');
    const [surplusHandling, setSurplusHandling] = useState<'deposit' | 'debt'>('deposit');
    const [surplusCustomerOption, setSurplusCustomerOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);
    // -- Debt Settlement state
    const [isDebtSettlement, setIsDebtSettlement] = useState(false);
    const [settlementDebtCustomerOption, setSettlementDebtCustomerOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);


    // State for Adjust Balance
    const [adjustType, setAdjustType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustAsset, setAdjustAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [adjustNote, setAdjustNote] = useState('');
    const [isProfit, setIsProfit] = useState(false);
    const [isLoss, setIsLoss] = useState(false);

    // State for Other Currencies
    const [otherTradeType, setOtherTradeType] = useState<'buy' | 'sell'>('buy');
    const [otherForeignAssetId, setOtherForeignAssetId] = useState<AssetId>('cashTnd');
    const [otherForeignAmount, setOtherForeignAmount] = useState('');
    const [otherRate, setOtherRate] = useState('');
    const [otherTotalLyd, setOtherTotalLyd] = useState('');
    const [otherInputMode, setOtherInputMode] = useState<InputMode>('rate');
    const [otherLydSourceType, setOtherLydSourceType] = useState<'cashLyd' | 'bank'>('cashLyd');
    const [otherLydCashAsset, setOtherLydCashAsset] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [otherLydBankId, setOtherLydBankId] = useState('');
    const [isOtherDebt, setIsOtherDebt] = useState(false);
    const [isOtherReceivable, setIsOtherReceivable] = useState(false);
    const [otherDebtCustomerOption, setOtherDebtCustomerOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);
    const [otherReceivablePartyOption, setOtherReceivablePartyOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);
    const [otherNote, setOtherNote] = useState('');
    const [originalOtherRate, setOriginalOtherRate] = useState<string | null>(null);
    const [isOtherDebtSettlement, setIsOtherDebtSettlement] = useState(false);
    const [otherSettlementDebtCustomerOption, setOtherSettlementDebtCustomerOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);
    const [isOtherReceivableSettlement, setIsOtherReceivableSettlement] = useState(false);
    const [otherSettlementReceivableId, setOtherSettlementReceivableId] = useState('');
    const [otherSurplusHandling, setOtherSurplusHandling] = useState<'deposit' | 'debt'>('deposit');
    const [otherSurplusCustomerOption, setOtherSurplusCustomerOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);


    const inputClasses = "mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold disabled:bg-gray-200 dark:disabled:bg-gray-700";
    const checkboxClasses = "focus:ring-primary dark:focus:ring-gold h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded";
    
    // Dynamic styling for a "glassmorphism" or "blurry" effect
    const greenStyle: React.CSSProperties = {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        border: '1px solid rgba(34, 197, 94, 0.2)',
    };
    
    const redStyle: React.CSSProperties = {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
    };

    const getDynamicFormStyle = () => {
        if (activeTab === 'buy_sell') {
            return tradeType === 'buy' ? greenStyle : redStyle;
        }
        if (activeTab === 'other_currencies') {
            return otherTradeType === 'buy' ? greenStyle : redStyle;
        }
        if (activeTab === 'adjust_balance') {
            return adjustType === 'deposit' ? greenStyle : redStyle;
        }
        return {};
    };

    const getBackdropClassName = () => {
        if (activeTab === 'buy_sell') {
            return tradeType === 'buy' ? 'bg-green-900/30' : 'bg-red-900/30';
        }
        if (activeTab === 'other_currencies') {
            return otherTradeType === 'buy' ? 'bg-green-900/30' : 'bg-red-900/30';
        }
        if (activeTab === 'adjust_balance') {
            return adjustType === 'deposit' ? 'bg-green-900/30' : 'bg-red-900/30';
        }
        return ''; // Will use default
    };


    useEffect(() => {
        const numUsd = parseFloat(usdAmount);
        if (isNaN(numUsd) || numUsd <= 0) {
            setTotalLyd('');
            if (usdInputMode === 'total') setRate('');
            return;
        }

        if (usdInputMode === 'rate') {
            const numRate = parseFloat(rate);
            if (!isNaN(numRate)) {
                setTotalLyd((numUsd * numRate).toFixed(3));
            } else {
                setTotalLyd('');
            }
        } else { // usdInputMode === 'total'
            const numTotal = parseFloat(totalLyd);
            if (!isNaN(numTotal) && numTotal > 0) {
                setRate((numTotal / numUsd).toFixed(4));
            } else {
                setRate('');
            }
        }
    }, [usdAmount, rate, totalLyd, usdInputMode]);
    
    useEffect(() => {
        const numAmount = parseFloat(otherForeignAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setOtherTotalLyd('');
            if (otherInputMode === 'total') setOtherRate('');
            return;
        }
        
        if (otherInputMode === 'rate') {
            const numRate = parseFloat(otherRate);
            if (!isNaN(numRate)) {
                setOtherTotalLyd((numAmount * numRate).toFixed(3));
            } else {
                setOtherTotalLyd('');
            }
        } else { // otherInputMode === 'total'
            const numTotal = parseFloat(otherTotalLyd);
            if (!isNaN(numTotal) && numTotal > 0) {
                setOtherRate((numTotal / numAmount).toFixed(4));
            } else {
                setOtherRate('');
            }
        }
    }, [otherForeignAmount, otherRate, otherTotalLyd, otherInputMode]);

    useEffect(() => {
        if (usdInputMode === 'rate') {
            setOriginalUsdRate(null);
        }
    }, [usdInputMode]);

    useEffect(() => {
        if (otherInputMode === 'rate') {
            setOriginalOtherRate(null);
        }
    }, [otherInputMode]);


    useEffect(() => {
        if(banks.length > 0) {
            setBuySourceBankId(banks[0].id);
            setSellDestinationBankId(banks[0].id);
            setOtherLydBankId(banks[0].id);
        }
    }, [banks]);

     useEffect(() => {
        setIsDebt(false);
        setIsReceivable(false);
        setIsReceivableSettlement(false);
        setIsDebtSettlement(false);
        setDebtCustomerOption(null);
        setReceivablePartyOption(null);
        setSettlementReceivableId('');
        setSettlementDebtCustomerOption(null);
        setNote('');
        setIsPending(false);
    }, [tradeType, activeTab]);

    useEffect(() => {
        setIsOtherDebt(false);
        setIsOtherReceivable(false);
        setIsOtherDebtSettlement(false);
        setIsOtherReceivableSettlement(false);
        setOtherDebtCustomerOption(null);
        setOtherReceivablePartyOption(null);
        setOtherSettlementDebtCustomerOption(null);
        setOtherSettlementReceivableId('');
        setOtherNote('');
        setIsPending(false);
    }, [otherTradeType]);

    useEffect(() => {
        if (isOpen && tradeToEdit) {
            const { tradeData } = tradeToEdit;
            const { type, options, ...data } = tradeData;

            switch (type) {
                case 'buyUsd':
                case 'sellUsd':
                    setActiveTab('buy_sell');
                    setTradeType(type === 'buyUsd' ? 'buy' : 'sell');
                    setUsdAmount(String(data.usdAmount || ''));
                    setRate(String(data.rate || ''));
                    setTotalLyd(String(data.lydAmount || ''));
                    setNote(options.note || '');
                    setIsDebt(options.isDebt || false);
                    setIsReceivable(options.isReceivable || false);
                    setIsReceivableSettlement(options.isReceivableSettlement || false);
                    setDebtCustomerOption(options.customerId ? { value: options.customerId, label: customers.find(c=>c.id === options.customerId)?.name || '' } : null);
                    setReceivablePartyOption(options.receivablePartyOption || null);
                    setSettlementReceivableId(options.receivableId || '');
                    setBuyUsdDestination(data.usdDestination || 'cashUsdLibya');
                    setBuyLydSource(data.lydSource || 'cashLyd');
                    setBuyLydCashAsset(options.lydCashAssetId || LYD_CASH_ASSET_IDS[0]);
                    setBuySourceBankId(options.bankId || (banks.length > 0 ? banks[0].id : ''));
                    setSellUsdSource(data.usdSource || 'cashUsdLibya');
                    setSellLydDestination(data.lydDestination || 'cashLyd');
                    setSellLydCashAsset(options.lydCashAssetId || LYD_CASH_ASSET_IDS[0]);
                    setSellDestinationBankId(options.bankId || (banks.length > 0 ? banks[0].id : ''));
                    break;
                case 'buyForeignCurrency':
                case 'sellForeignCurrency':
                    setActiveTab('other_currencies');
                    setOtherTradeType(type === 'buyForeignCurrency' ? 'buy' : 'sell');
                    setOtherForeignAmount(String(data.foreignAmount || ''));
                    setOtherRate(String(data.rate || ''));
                    setOtherTotalLyd(String(data.lydAmount || ''));
                    setOtherForeignAssetId(data.foreignAssetId || 'cashTnd');
                    setOtherNote(options.note || '');
                    setIsOtherDebt(options.isDebt || false);
                    setIsOtherReceivable(options.isReceivable || false);
                    setOtherDebtCustomerOption(options.customerId ? { value: options.customerId, label: customers.find(c=>c.id === options.customerId)?.name || '' } : null);
                    setOtherReceivablePartyOption(options.receivablePartyOption || null);
                    setOtherLydSourceType(data.lydSource?.type || data.lydDestination?.type || 'cashLyd');
                    setOtherLydCashAsset(data.lydSource?.lydCashAssetId || data.lydDestination?.lydCashAssetId || LYD_CASH_ASSET_IDS[0]);
                    setOtherLydBankId(data.lydSource?.bankId || data.lydDestination?.bankId || (banks.length > 0 ? banks[0].id : ''));
                    break;
                case 'adjustBalance':
                    setActiveTab('adjust_balance');
                    setAdjustType(data.txType || 'deposit');
                    setAdjustAmount(String(data.amount || ''));
                    setAdjustAsset(data.assetId || LYD_CASH_ASSET_IDS[0]);
                    setAdjustNote(data.note || '');
                    setIsProfit(data.options?.isProfit || false);
                    setIsLoss(data.options?.isLoss || false);
                    break;
            }
        }
    }, [tradeToEdit, isOpen, banks, customers]);

    const handleBuySellSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numUsd = parseFloat(usdAmount);
        const numRate = parseFloat(rate);
        const lydAmount = parseFloat(totalLyd);
        if (isNaN(numUsd) || isNaN(numRate) || numUsd <= 0 || numRate <= 0) return;
        
        if (tradeType === 'buy') {
            if (isReceivable && !receivablePartyOption) return;
            if (isDebtSettlement && !settlementDebtCustomerOption) return;
            if (!isReceivable && buyLydSource === 'bank' && !buySourceBankId) return;

            const options = { isReceivable, receivablePartyOption, bankId: buySourceBankId, lydCashAssetId: buyLydCashAsset, note, originalRate: originalUsdRate ? parseFloat(originalUsdRate) : undefined, totalLydAmount: lydAmount, isDebtSettlement, settlementDebtCustomerId: !settlementDebtCustomerOption?.__isNew__ ? settlementDebtCustomerOption?.value : undefined, newSettlementDebtCustomerName: settlementDebtCustomerOption?.__isNew__ ? settlementDebtCustomerOption?.label : undefined };
            const tradeData: PendingTrade['tradeData'] = { type: 'buyUsd', usdAmount: numUsd, rate: numRate, lydAmount, lydSource: buyLydSource, usdDestination: buyUsdDestination, options };
            const description = `شراء ${numUsd.toLocaleString()}$ بسعر ${originalUsdRate || rate}${isEditMode ? '' : ' (معلق)'}`;
            
            if (isEditMode) {
                updatePendingTrade(tradeToEdit!.id, description, tradeData);
            } else if (isPending) {
                addPendingTrade(description, tradeData);
            } else {
                buyUsd(numUsd, numRate, buyLydSource, buyUsdDestination, options);
            }
        } else { // sell
            if (isDebt && !debtCustomerOption) return;
            if(isReceivableSettlement && !settlementReceivableId) return;
            if (!isDebt && !isReceivableSettlement && sellLydDestination === 'bank' && !sellDestinationBankId) return;
            
            let excessHandlingOptions;
            if (isReceivableSettlement && receivableSurplus > 0) {
                if (surplusHandling === 'debt') {
                    if (!surplusCustomerOption) { alert('الرجاء اختيار زبون للفائض.'); return; }
                    excessHandlingOptions = {
                        type: 'debt',
                        customerId: !surplusCustomerOption.__isNew__ ? surplusCustomerOption.value : undefined,
                        newCustomerName: surplusCustomerOption.__isNew__ ? surplusCustomerOption.label : undefined,
                    };
                } else {
                    excessHandlingOptions = { type: 'deposit' };
                }
            }

            const options = { isDebt, customerId: !debtCustomerOption?.__isNew__ ? debtCustomerOption?.value : undefined, newCustomerName: debtCustomerOption?.__isNew__ ? debtCustomerOption?.label : undefined, isReceivableSettlement, receivableId: settlementReceivableId, bankId: sellDestinationBankId, lydCashAssetId: sellLydCashAsset, note, originalRate: originalUsdRate ? parseFloat(originalUsdRate) : undefined, totalLydAmount: lydAmount, excessHandling: excessHandlingOptions };
            const tradeData: PendingTrade['tradeData'] = { type: 'sellUsd', usdAmount: numUsd, rate: numRate, lydAmount, usdSource: sellUsdSource, lydDestination: sellLydDestination, options };
            const description = `بيع ${numUsd.toLocaleString()}$ بسعر ${originalUsdRate || rate}${isEditMode ? '' : ' (معلق)'}`;

            if (isEditMode) {
                updatePendingTrade(tradeToEdit!.id, description, tradeData);
            } else if (isPending) {
                addPendingTrade(description, tradeData);
            } else {
                sellUsd(numUsd, numRate, sellUsdSource, sellLydDestination, options);
            }
        }
        onClose();
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(adjustAmount);
        if (isNaN(numAmount) || numAmount <= 0 || !adjustNote) return;

        const options = { isProfit, isLoss };
        const tradeData: PendingTrade['tradeData'] = { type: 'adjustBalance', assetId: adjustAsset, amount: numAmount, txType: adjustType, note: adjustNote, options };
        const description = `إدخال/إخراج: ${adjustNote}${isEditMode ? '' : ' (معلق)'}`;

        if (isEditMode) {
            updatePendingTrade(tradeToEdit!.id, description, tradeData);
        } else if (isPending) {
            addPendingTrade(description, tradeData);
        } else {
            adjustAssetBalance(adjustAsset, numAmount, adjustType, adjustNote, options);
        }
        onClose();
    };
    
     const handleOtherCurrencySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(otherForeignAmount);
        const numRate = parseFloat(otherRate);
        const lydAmount = parseFloat(otherTotalLyd);
        if (isNaN(numAmount) || isNaN(numRate) || numAmount <= 0 || numRate <= 0 || !otherForeignAssetId) return;

        let foreignCurrency = Currency.EUR; // Default
        if (otherForeignAssetId.includes('Tnd')) foreignCurrency = Currency.TND;
        else if (otherForeignAssetId.includes('Sar')) foreignCurrency = Currency.SAR;
        else if (otherForeignAssetId.includes('Egp')) foreignCurrency = Currency.EGP;

        if (otherTradeType === 'buy') {
            if (isOtherReceivable && !otherReceivablePartyOption) return;
            if (isOtherDebtSettlement && !otherSettlementDebtCustomerOption) return;
            if (!isOtherReceivable && otherLydSourceType === 'bank' && !otherLydBankId) return;
            
            const lydSource = { type: otherLydSourceType, bankId: otherLydBankId, lydCashAssetId: otherLydCashAsset };
            const options = { isReceivable: isOtherReceivable, receivablePartyOption: otherReceivablePartyOption, note: otherNote, originalRate: originalOtherRate ? parseFloat(originalOtherRate) : undefined, totalLydAmount: lydAmount, isDebtSettlement: isOtherDebtSettlement, settlementDebtCustomerId: !otherSettlementDebtCustomerOption?.__isNew__ ? otherSettlementDebtCustomerOption?.value : undefined, newSettlementDebtCustomerName: otherSettlementDebtCustomerOption?.__isNew__ ? otherSettlementDebtCustomerOption?.label : undefined };
            const tradeData: PendingTrade['tradeData'] = { type: 'buyForeignCurrency', foreignAmount: numAmount, rate: numRate, lydAmount, foreignCurrency, foreignAssetId: otherForeignAssetId, lydSource, options };
            const description = `شراء ${numAmount.toLocaleString()} ${foreignCurrency} بسعر ${originalOtherRate || otherRate}${isEditMode ? '' : ' (معلق)'}`;
            
            if (isEditMode) {
                updatePendingTrade(tradeToEdit!.id, description, tradeData);
            } else if (isPending) {
                addPendingTrade(description, tradeData);
            } else {
                buyForeignCurrency(numAmount, numRate, foreignCurrency, otherForeignAssetId, lydSource, options);
            }
        } else { // sell
            if (isOtherDebt && !otherDebtCustomerOption) return;
            if (isOtherReceivableSettlement && !otherSettlementReceivableId) return;
            if (!isOtherDebt && !isOtherReceivableSettlement && otherLydSourceType === 'bank' && !otherLydBankId) return;
            
            let excessHandlingOptions;
            if (isOtherReceivableSettlement && otherReceivableSurplus > 0) {
                 if (otherSurplusHandling === 'debt') {
                    if (!otherSurplusCustomerOption) { alert('الرجاء اختيار زبون للفائض.'); return; }
                    excessHandlingOptions = {
                        type: 'debt',
                        customerId: !otherSurplusCustomerOption.__isNew__ ? otherSurplusCustomerOption.value : undefined,
                        newCustomerName: otherSurplusCustomerOption.__isNew__ ? otherSurplusCustomerOption.label : undefined,
                    };
                } else {
                    excessHandlingOptions = { type: 'deposit' };
                }
            }
            
            const lydDestination = { type: otherLydSourceType, bankId: otherLydBankId, lydCashAssetId: otherLydCashAsset };
            const options = { isDebt: isOtherDebt, customerId: !otherDebtCustomerOption?.__isNew__ ? otherDebtCustomerOption?.value : undefined, newCustomerName: otherDebtCustomerOption?.__isNew__ ? otherDebtCustomerOption?.label : undefined, isReceivableSettlement: isOtherReceivableSettlement, receivableId: otherSettlementReceivableId, note: otherNote, originalRate: originalOtherRate ? parseFloat(originalOtherRate) : undefined, totalLydAmount: lydAmount, excessHandling: excessHandlingOptions };
            const tradeData: PendingTrade['tradeData'] = { type: 'sellForeignCurrency', foreignAmount: numAmount, rate: numRate, lydAmount, foreignCurrency, foreignAssetId: otherForeignAssetId, lydDestination, options };
            const description = `بيع ${numAmount.toLocaleString()} ${foreignCurrency} بسعر ${originalOtherRate || otherRate}${isEditMode ? '' : ' (معلق)'}`;

            if (isEditMode) {
                updatePendingTrade(tradeToEdit!.id, description, tradeData);
            } else if (isPending) {
                 addPendingTrade(description, tradeData);
            } else {
                sellForeignCurrency(numAmount, numRate, foreignCurrency, otherForeignAssetId, lydDestination, options);
            }
        }
        onClose();
    };


    const resetForms = () => {
        setUsdAmount('');
        setRate('');
        setTotalLyd('');
        setNote('');
        setIsDebt(false);
        setIsReceivable(false);
        setIsReceivableSettlement(false);
        setIsDebtSettlement(false);
        setReceivablePartyOption(null);
        setDebtCustomerOption(null);
        setSettlementReceivableId('');
        setSettlementDebtCustomerOption(null);
        setSurplusCustomerOption(null);
        setSurplusHandling('deposit');
        setIsPending(false);
        setOriginalUsdRate(null);

        setAdjustAmount('');
        setAdjustNote('');
        setIsProfit(false);
        setIsLoss(false);

        setOtherForeignAmount('');
        setOtherRate('');
        setOtherTotalLyd('');
        setOtherNote('');
        setIsOtherDebt(false);
        setIsOtherReceivable(false);
        setIsOtherDebtSettlement(false);
        setIsOtherReceivableSettlement(false);
        setOtherReceivablePartyOption(null);
        setOtherDebtCustomerOption(null);
        setOtherSettlementDebtCustomerOption(null);
        setOtherSettlementReceivableId('');
        setOtherSurplusHandling('deposit');
        setOtherSurplusCustomerOption(null);
        setOriginalOtherRate(null);
    };

    const handleRound = (
        direction: 'down' | 'up',
        totalState: string,
        setTotalState: React.Dispatch<React.SetStateAction<string>>,
        setInputMode: React.Dispatch<React.SetStateAction<InputMode>>
    ) => {
        setInputMode('total');
        const numTotal = parseFloat(totalState);
        if (isNaN(numTotal) || numTotal <= 0) return;

        let newValue: number;
        if (direction === 'down') {
            newValue = Math.floor(numTotal / 10) * 10;
        } else { // up
            const lastDigit = Math.round(numTotal) % 10;
            if (lastDigit > 0 && lastDigit <= 5) {
                newValue = Math.floor(numTotal / 10) * 10 + 5;
            } else if (lastDigit > 5) {
                newValue = Math.ceil(numTotal / 10) * 10;
            } else {
                newValue = numTotal; // Already ends in 0 or 5
            }
        }
        setTotalState(newValue.toFixed(3));
    };

    const lydCustomers = useMemo(() => customers.filter(c => c.currency === Currency.LYD && !c.isArchived), [customers]);
    const lydReceivables = useMemo(() => receivables.filter(r => r.currency === Currency.LYD && !r.isArchived && (r.amount - r.paid > 0)), [receivables]);
    const lydDebtors = useMemo(() => customers.filter(c =>
        c.currency === Currency.LYD && !c.isArchived && c.debts.some(d => d.amount - d.paid > 0)
    ), [customers]);
    const lydDebtorOptions = useMemo(() => [...new Set(receivables.filter(r => r.currency === Currency.LYD).map(r => r.debtor))].map(d => ({ value: d, label: d })), [receivables]);
    
    const usdAssetOptions = useMemo(() => [
        { value: 'cashUsdLibya', label: ASSET_NAMES.cashUsdLibya, flag: 'ly' },
        { value: 'cashUsdTurkey', label: ASSET_NAMES.cashUsdTurkey, flag: 'tr' }
    ], []);

    const otherForeignAssetOptions = useMemo(() => [
        { value: 'cashTnd', label: ASSET_NAMES.cashTnd, flag: 'tn' },
        { value: 'cashEurLibya', label: ASSET_NAMES.cashEurLibya, flag: 'ly' },
        { value: 'cashEurTurkey', label: ASSET_NAMES.cashEurTurkey, flag: 'tr' },
        { value: 'cashSar', label: ASSET_NAMES.cashSar, flag: 'sa' },
        { value: 'cashEgp', label: ASSET_NAMES.cashEgp, flag: 'eg' },
    ], []);
    
    const allCashAssetsWithOptions = useMemo(() => {
        return (Object.keys(ASSET_NAMES) as AssetId[])
            .filter(k => k !== 'bankLyd')
            .map(id => {
                let flag = '';
                if (id.includes('Lyd') || id.includes('Libya')) flag = 'ly';
                else if (id.includes('Turkey')) flag = 'tr';
                else if (id.includes('Tnd')) flag = 'tn';
                else if (id.includes('Sar')) flag = 'sa';
                else if (id.includes('Egp')) flag = 'eg';
                return { value: id, label: ASSET_NAMES[id], flag, icon: lydAssetIcons[id] };
            });
    }, []);
    
    const selectedReceivableForSettlement = useMemo(() => {
        if (!isReceivableSettlement || !settlementReceivableId) return null;
        return lydReceivables.find(r => r.id === settlementReceivableId);
    }, [isReceivableSettlement, settlementReceivableId, lydReceivables]);
    
    const receivableSurplus = useMemo(() => {
        if (!selectedReceivableForSettlement) return 0;
        const remaining = selectedReceivableForSettlement.amount - selectedReceivableForSettlement.paid;
        const total = parseFloat(totalLyd) || 0;
        return total - remaining;
    }, [selectedReceivableForSettlement, totalLyd]);

    const otherSelectedReceivable = useMemo(() => {
        if (!isOtherReceivableSettlement || !otherSettlementReceivableId) return null;
        return receivables.find(r => r.id === otherSettlementReceivableId);
    }, [isOtherReceivableSettlement, otherSettlementReceivableId, receivables]);

    const otherReceivableSurplus = useMemo(() => {
        if (!otherSelectedReceivable) return 0;
        const remaining = otherSelectedReceivable.amount - otherSelectedReceivable.paid;
        const total = parseFloat(otherTotalLyd) || 0;
        return total - remaining;
    }, [otherSelectedReceivable, otherTotalLyd]);

    const TabButton: React.FC<{ tabId: Tab, label: string, icon: React.ReactNode }> = ({ tabId, label, icon }) => (
         <button
            type="button"
            onClick={() => setActiveTab(tabId)}
            disabled={isEditMode}
            className={`flex-1 flex justify-center items-center gap-2 p-3 text-sm font-medium border-b-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                activeTab === tabId
                    ? 'border-primary dark:border-gold text-primary-dark dark:text-gold-light'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
        >
            {icon} {label}
        </button>
    );
    
    const renderBuyOptions = () => (
        <>
            <div className="grid grid-cols-2 gap-4">
                 <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="isReceivable" type="checkbox" checked={isReceivable} onChange={e => { setIsReceivable(e.target.checked); if(e.target.checked) setIsDebtSettlement(false); }} className={checkboxClasses} />
                    </div>
                    <div className="ms-3 text-sm">
                        <label htmlFor="isReceivable" className="font-medium text-gray-700 dark:text-gray-300">تسجيل كمستحق</label>
                    </div>
                </div>
                 <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="isDebtSettlement" type="checkbox" checked={isDebtSettlement} onChange={e => { setIsDebtSettlement(e.target.checked); if(e.target.checked) setIsReceivable(false); }} className={checkboxClasses} />
                    </div>
                    <div className="ms-3 text-sm">
                        <label htmlFor="isDebtSettlement" className="font-medium text-gray-700 dark:text-gray-300">تسوية مع مدين</label>
                    </div>
                </div>
            </div>

             {isReceivable && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الطرف المستحق عليه</label>
                    <CreatableSelect
                        isClearable
                        options={lydDebtorOptions}
                        value={receivablePartyOption}
                        onChange={(option) => setReceivablePartyOption(option)}
                        placeholder="اختر أو أضف طرف..."
                        formatCreateLabel={(inputValue) => `إضافة طرف جديد: "${inputValue}"`}
                        classNamePrefix="rs"
                     />
                </div>
            )}
             {isDebtSettlement && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المدين</label>
                    <CreatableSelect
                        isClearable
                        options={lydDebtors.map(c => {
                             const totalUnpaid = c.debts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
                             return { value: c.id, label: `${c.name} (${formatCurrency(totalUnpaid, Currency.LYD)})` };
                        })}
                        value={settlementDebtCustomerOption}
                        onChange={(option) => setSettlementDebtCustomerOption(option)}
                        placeholder="اختر أو أضف مدين (LYD)..."
                        formatCreateLabel={(inputValue) => `إضافة مدين جديد: "${inputValue}"`}
                        classNamePrefix="rs"
                    />
                    {lydDebtors.length === 0 && !settlementDebtCustomerOption?.__isNew__ && <p className="text-xs text-red-500 dark:text-red-400 mt-1">لا يوجد زبائن لديهم ديون بالدينار الليبي للتسوية.</p>}
                </div>
            )}
            {!isReceivable && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع الدولار في</label>
                            <Select
                                value={usdAssetOptions.find(o => o.value === buyUsdDestination)}
                                onChange={(option) => option && setBuyUsdDestination(option.value as 'cashUsdLibya' | 'cashUsdTurkey')}
                                options={usdAssetOptions}
                                formatOptionLabel={formatOptionLabel}
                                classNamePrefix="rs"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم الدينار من</label>
                            <select value={buyLydSource} onChange={e => setBuyLydSource(e.target.value as 'cashLyd' | 'bank')} className={inputClasses}>
                                <option value="cashLyd">الخزنة النقدية</option>
                                <option value="bank">{ASSET_NAMES.bankLyd}</option>
                            </select>
                        </div>
                    </div>
                    {buyLydSource === 'bank' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر المصرف</label>
                            <select value={buySourceBankId} onChange={e => setBuySourceBankId(e.target.value)} required className={inputClasses}>
                                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    {buyLydSource === 'cashLyd' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر خزنة الدينار</label>
                            <select value={buyLydCashAsset} onChange={e => setBuyLydCashAsset(e.target.value as AssetId)} required className={inputClasses}>
                                {LYD_CASH_ASSET_IDS.map(assetId => <option key={assetId} value={assetId}>
                                    {lydAssetIcons[assetId] ? `${lydAssetIcons[assetId]} ` : ''}{ASSET_NAMES[assetId]}
                                </option>)}
                            </select>
                        </div>
                    )}
                </>
            )}
        </>
    );

    const showSellDepositLocation = !isDebt && (!isReceivableSettlement || (isReceivableSettlement && receivableSurplus > 0 && surplusHandling === 'deposit'));

    const renderSellOptions = () => (
         <>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم الدولار من</label>
                <Select
                    value={usdAssetOptions.find(o => o.value === sellUsdSource)}
                    onChange={(option) => option && setSellUsdSource(option.value as 'cashUsdLibya' | 'cashUsdTurkey')}
                    options={usdAssetOptions}
                    formatOptionLabel={formatOptionLabel}
                    classNamePrefix="rs"
                />
            </div>
            <div className='grid grid-cols-2 gap-4'>
                 <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="isDebt" type="checkbox" checked={isDebt} onChange={e => { setIsDebt(e.target.checked); if (e.target.checked) setIsReceivableSettlement(false); }} className={checkboxClasses} />
                    </div>
                    <div className="ms-3 text-sm">
                        <label htmlFor="isDebt" className="font-medium text-gray-700 dark:text-gray-300">تسجيل كـ دين (بالدينار)</label>
                    </div>
                </div>
                 <div className="relative flex items-start">
                    <div className="flex items-center h-5">
                        <input id="isReceivableSettlement" type="checkbox" checked={isReceivableSettlement} onChange={e => { setIsReceivableSettlement(e.target.checked); if (e.target.checked) setIsDebt(false); }} className={checkboxClasses} />
                    </div>
                    <div className="ms-3 text-sm">
                        <label htmlFor="isReceivableSettlement" className="font-medium text-gray-700 dark:text-gray-300">تسوية مع مستحق</label>
                    </div>
                </div>
            </div>
            
            {isDebt && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الزبون</label>
                     <CreatableSelect
                        isClearable
                        options={lydCustomers.map(c => ({ value: c.id, label: c.name }))}
                        value={debtCustomerOption}
                        onChange={(option) => setDebtCustomerOption(option)}
                        placeholder="اختر أو أضف زبون (LYD)..."
                        formatCreateLabel={(inputValue) => `إضافة زبون جديد: "${inputValue}"`}
                        classNamePrefix="rs"
                     />
                </div>
            )}

            {isReceivableSettlement && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المستحق المراد التسوية به</label>
                    <select value={settlementReceivableId} onChange={e => setSettlementReceivableId(e.target.value)} required className={inputClasses}>
                        <option value="" disabled>-- اختر مستحق (LYD) --</option>
                        {lydReceivables.map(r => <option key={r.id} value={r.id}>{r.debtor} ({formatCurrency(r.amount - r.paid, Currency.LYD)})</option>)}
                    </select>
                    {lydReceivables.length === 0 && <p className="text-xs text-red-500 dark:text-red-400 mt-1">لا توجد مستحقات بالدينار الليبي للتسوية.</p>}
                </div>
            )}
            
            {isReceivableSettlement && receivableSurplus > 0 && (
                 <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/40 rounded-lg border border-yellow-200 dark:border-yellow-500/30 space-y-2">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">يوجد فائض بقيمة {formatCurrency(receivableSurplus, Currency.LYD)}.</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">كيفية التعامل مع الفائض:</p>
                    <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input type="radio" value="deposit" checked={surplusHandling === 'deposit'} onChange={() => setSurplusHandling('deposit')} className="form-radio" />
                            إيداع في الخزنة
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                             <input type="radio" value="debt" checked={surplusHandling === 'debt'} onChange={() => setSurplusHandling('debt')} className="form-radio" />
                             تسجيل كدين
                        </label>
                    </div>
                     {surplusHandling === 'debt' && (
                        <div className="pt-2">
                             <CreatableSelect
                                isClearable
                                options={lydCustomers.map(c => ({ value: c.id, label: c.name }))}
                                value={surplusCustomerOption}
                                onChange={(option) => setSurplusCustomerOption(option)}
                                placeholder="اختر أو أضف زبون للدين..."
                                formatCreateLabel={(inputValue) => `إضافة زبون جديد: "${inputValue}"`}
                                classNamePrefix="rs"
                             />
                        </div>
                    )}
                 </div>
            )}

            {showSellDepositLocation && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع الدينار في</label>
                        <select value={sellLydDestination} onChange={e => setSellLydDestination(e.target.value as 'cashLyd' | 'bank')} className={inputClasses}>
                            <option value="cashLyd">الخزنة النقدية</option>
                            <option value="bank">{ASSET_NAMES.bankLyd}</option>
                        </select>
                    </div>
                    {sellLydDestination === 'bank' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر المصرف</label>
                            <select value={sellDestinationBankId} onChange={e => setSellDestinationBankId(e.target.value)} required className={inputClasses}>
                                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    {sellLydDestination === 'cashLyd' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر خزنة الدينار</label>
                            <select value={sellLydCashAsset} onChange={e => setSellLydCashAsset(e.target.value as AssetId)} required className={inputClasses}>
                                {LYD_CASH_ASSET_IDS.map(assetId => <option key={assetId} value={assetId}>
                                    {lydAssetIcons[assetId] ? `${lydAssetIcons[assetId]} ` : ''}{ASSET_NAMES[assetId]}
                                </option>)}
                            </select>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    const showOtherSellDepositLocation = !isOtherDebt && (!isOtherReceivableSettlement || (isOtherReceivableSettlement && otherReceivableSurplus > 0 && otherSurplusHandling === 'deposit'));


    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "تعديل معاملة" : "المهام اليومية"} size="2xl" backdropClassName={getBackdropClassName()} className="w-[75%]">
            <div className="flex border-b border-gray-200 dark:border-dark-border mb-4">
                {canBuySellUsd && <TabButton tabId="buy_sell" label="شراء وبيع دولار" icon={<DollarSign size={16}/>} />}
                {canBuySellOther && <TabButton tabId="other_currencies" label="عملات أخرى" icon={<Globe size={16}/>} />}
                {canAdjustBalance && <TabButton tabId="adjust_balance" label="ادخال/اخراج نقدي" icon={<ArrowRightLeft size={16}/>} />}
            </div>
            
            <div style={getDynamicFormStyle()} className="p-4 rounded-lg transition-all duration-300">
                {activeTab === 'buy_sell' && canBuySellUsd && (
                     <form onSubmit={handleBuySellSubmit} className="space-y-4">
                        <div className="flex gap-2 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
                            <button type="button" onClick={() => setTradeType('buy')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${tradeType === 'buy' ? 'bg-green-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>شراء USD</button>
                            <button type="button" onClick={() => setTradeType('sell')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${tradeType === 'sell' ? 'bg-red-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'}`}>بيع USD</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="usdAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">مبلغ الدولار (USD)</label>
                                <FormattedInput inputMode="decimal" id="usdAmount" value={usdAmount} onChange={(e) => setUsdAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses} />
                            </div>
                            <div>
                                <label htmlFor="rate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">سعر الصرف</label>
                                <FormattedInput inputMode="decimal" id="rate" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ''))} required disabled={usdInputMode === 'total'} className={inputClasses} />
                            </div>
                        </div>
                         <div className="relative">
                            <label htmlFor="totalLyd" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المجموع بالدينار (LYD)</label>
                            <FormattedInput inputMode="decimal" id="totalLyd" value={totalLyd} onChange={(e) => setTotalLyd(e.target.value.replace(/[^0-9.]/g, ''))} required disabled={usdInputMode === 'rate'} className={`${inputClasses} pe-40`} />
                            <div className="absolute top-7 end-2 flex items-center h-[2.375rem] gap-2">
                                <button type="button" onClick={() => setUsdInputMode(p => p === 'rate' ? 'total' : 'rate')} title="تبديل طريقة الإدخال" className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                                    <RefreshCw size={14} className="text-gray-600 dark:text-gray-300" />
                                </button>
                                <div className="flex items-center gap-1 p-1 rounded-md bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ps-1">حل الكسر:</span>
                                    <button type="button" onClick={() => { if (originalUsdRate === null) setOriginalUsdRate(rate); handleRound('down', totalLyd, setTotalLyd, setUsdInputMode); }} title="تصفير الكسر للأسفل" className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">تصفير</button>
                                    <button type="button" onClick={() => { if (originalUsdRate === null) setOriginalUsdRate(rate); handleRound('up', totalLyd, setTotalLyd, setUsdInputMode); }} title="تقريب الكسر للأعلى" className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">تقريب</button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {tradeType === 'buy' ? renderBuyOptions() : renderSellOptions()}
                        </div>
                        
                        <div>
                            <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظة إضافية (اختياري)</label>
                            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClasses}></textarea>
                        </div>

                        {canUsePending && !isEditMode && (
                            <div className="relative flex items-start p-3 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-500/30">
                                <div className="flex items-center h-5">
                                    <input id="isPending" type="checkbox" checked={isPending} onChange={e => setIsPending(e.target.checked)} className={checkboxClasses} />
                                </div>
                                <div className="ms-3 text-sm">
                                    <label htmlFor="isPending" className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2"><ClipboardList size={16}/>إضافة إلى قائمة التأكيد</label>
                                    <p className="text-blue-700 dark:text-blue-400 text-xs">سيتم حفظ المعاملة في قائمة "بيع وشراء غير مكتمل" ولن يتم تنفيذها مالياً حتى يتم تأكيدها.</p>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="w-full bg-primary hover:bg-primary-dark dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity">
                            {isEditMode ? 'حفظ التعديلات' : isPending ? 'إضافة للقائمة' : 'تنفيذ العملية'}
                        </button>
                     </form>
                )}

                {activeTab === 'other_currencies' && canBuySellOther && (
                     <form onSubmit={handleOtherCurrencySubmit} className="space-y-4">
                        <div className="flex gap-2 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
                            <button type="button" onClick={() => setOtherTradeType('buy')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${otherTradeType === 'buy' ? 'bg-green-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>شراء</button>
                            <button type="button" onClick={() => setOtherTradeType('sell')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${otherTradeType === 'sell' ? 'bg-red-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'}`}>بيع</button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">العملة/الأصل</label>
                            <Select
                                value={otherForeignAssetOptions.find(o => o.value === otherForeignAssetId)}
                                onChange={(option) => option && setOtherForeignAssetId(option.value as AssetId)}
                                options={otherForeignAssetOptions}
                                formatOptionLabel={formatOptionLabel}
                                classNamePrefix="rs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ الأجنبي</label>
                                <FormattedInput inputMode="decimal" value={otherForeignAmount} onChange={(e) => setOtherForeignAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses} />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">سعر الصرف</label>
                                <FormattedInput inputMode="decimal" value={otherRate} onChange={(e) => setOtherRate(e.target.value.replace(/[^0-9.]/g, ''))} required disabled={otherInputMode === 'total'} className={inputClasses} />
                            </div>
                        </div>
                         <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المجموع بالدينار (LYD)</label>
                            <FormattedInput inputMode="decimal" value={otherTotalLyd} onChange={(e) => setOtherTotalLyd(e.target.value.replace(/[^0-9.]/g, ''))} required disabled={otherInputMode === 'rate'} className={`${inputClasses} pe-40`} />
                             <div className="absolute top-7 end-2 flex items-center h-[2.375rem] gap-2">
                                <button type="button" onClick={() => setOtherInputMode(p => p === 'rate' ? 'total' : 'rate')} title="تبديل طريقة الإدخال" className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                                    <RefreshCw size={14} className="text-gray-600 dark:text-gray-300" />
                                </button>
                                <div className="flex items-center gap-1 p-1 rounded-md bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ps-1">حل الكسر:</span>
                                    <button type="button" onClick={() => { if (originalOtherRate === null) setOriginalOtherRate(otherRate); handleRound('down', otherTotalLyd, setOtherTotalLyd, setOtherInputMode); }} title="تصفير الكسر للأسفل" className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">تصفير</button>
                                    <button type="button" onClick={() => { if (originalOtherRate === null) setOriginalOtherRate(otherRate); handleRound('up', otherTotalLyd, setOtherTotalLyd, setOtherInputMode); }} title="تقريب الكسر للأعلى" className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600">تقريب</button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                             {otherTradeType === 'buy' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative flex items-start"><div className="flex items-center h-5"><input id="isOtherReceivable" type="checkbox" checked={isOtherReceivable} onChange={e => { setIsOtherReceivable(e.target.checked); if(e.target.checked) setIsOtherDebtSettlement(false);}} className={checkboxClasses}/></div><div className="ms-3 text-sm"><label htmlFor="isOtherReceivable" className="font-medium text-gray-700 dark:text-gray-300">تسجيل كمستحق</label></div></div>
                                        <div className="relative flex items-start"><div className="flex items-center h-5"><input id="isOtherDebtSettlement" type="checkbox" checked={isOtherDebtSettlement} onChange={e => { setIsOtherDebtSettlement(e.target.checked); if(e.target.checked) setIsOtherReceivable(false);}} className={checkboxClasses}/></div><div className="ms-3 text-sm"><label htmlFor="isOtherDebtSettlement" className="font-medium text-gray-700 dark:text-gray-300">تسوية مع مدين</label></div></div>
                                    </div>
                                    {isOtherReceivable && (
                                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الطرف المستحق عليه</label><CreatableSelect isClearable options={lydDebtorOptions} value={otherReceivablePartyOption} onChange={(option) => setOtherReceivablePartyOption(option)} placeholder="اختر أو أضف طرف..." formatCreateLabel={(inputValue) => `إضافة طرف جديد: "${inputValue}"`} classNamePrefix="rs"/></div>
                                    )}
                                    {isOtherDebtSettlement && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المدين</label>
                                            <CreatableSelect
                                                isClearable
                                                options={lydDebtors.map(c => {
                                                    const totalUnpaid = c.debts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
                                                    return { value: c.id, label: `${c.name} (${formatCurrency(totalUnpaid, Currency.LYD)})` };
                                                })}
                                                value={otherSettlementDebtCustomerOption}
                                                onChange={(option) => setOtherSettlementDebtCustomerOption(option)}
                                                placeholder="اختر أو أضف مدين (LYD)..."
                                                formatCreateLabel={(inputValue) => `إضافة مدين جديد: "${inputValue}"`}
                                                classNamePrefix="rs"
                                            />
                                            {lydDebtors.length === 0 && !otherSettlementDebtCustomerOption?.__isNew__ && <p className="text-xs text-red-500 dark:text-red-400 mt-1">لا يوجد زبائن لديهم ديون للتسوية.</p>}
                                        </div>
                                    )}
                                    {!isOtherReceivable && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خصم الدينار من</label>
                                                <select value={otherLydSourceType} onChange={e => setOtherLydSourceType(e.target.value as 'cashLyd' | 'bank')} className={inputClasses}>
                                                    <option value="cashLyd">الخزنة النقدية</option><option value="bank">{ASSET_NAMES.bankLyd}</option>
                                                </select>
                                            </div>
                                            {otherLydSourceType === 'bank' ? (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر المصرف</label>
                                                    <select value={otherLydBankId} onChange={e => setOtherLydBankId(e.target.value)} required className={inputClasses}>
                                                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر خزنة الدينار</label>
                                                    <select value={otherLydCashAsset} onChange={e => setOtherLydCashAsset(e.target.value as AssetId)} required className={inputClasses}>
                                                        {LYD_CASH_ASSET_IDS.map(assetId => <option key={assetId} value={assetId}>
                                                            {lydAssetIcons[assetId] ? `${lydAssetIcons[assetId]} ` : ''}{ASSET_NAMES[assetId]}
                                                        </option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                             ) : ( // Sell
                                 <>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className="relative flex items-start"><div className="flex items-center h-5"><input id="isOtherDebt" type="checkbox" checked={isOtherDebt} onChange={e => {setIsOtherDebt(e.target.checked); if(e.target.checked) setIsOtherReceivableSettlement(false);}} className={checkboxClasses}/></div><div className="ms-3 text-sm"><label htmlFor="isOtherDebt" className="font-medium text-gray-700 dark:text-gray-300">تسجيل كـ دين</label></div></div>
                                        <div className="relative flex items-start"><div className="flex items-center h-5"><input id="isOtherReceivableSettlement" type="checkbox" checked={isOtherReceivableSettlement} onChange={e => {setIsOtherReceivableSettlement(e.target.checked); if(e.target.checked) setIsOtherDebt(false);}} className={checkboxClasses}/></div><div className="ms-3 text-sm"><label htmlFor="isOtherReceivableSettlement" className="font-medium text-gray-700 dark:text-gray-300">تسوية مع مستحق</label></div></div>
                                    </div>
                                     {isOtherDebt ? (
                                        <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الزبون</label>
                                         <CreatableSelect
                                            isClearable
                                            options={lydCustomers.map(c => ({ value: c.id, label: c.name }))}
                                            value={otherDebtCustomerOption}
                                            onChange={(option) => setOtherDebtCustomerOption(option)}
                                            placeholder="اختر أو أضف زبون (LYD)..."
                                            formatCreateLabel={(inputValue) => `إضافة زبون جديد: "${inputValue}"`}
                                            classNamePrefix="rs"
                                        />
                                        </div>
                                    ) : isOtherReceivableSettlement ? (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المستحق المراد التسوية به</label>
                                            <select value={otherSettlementReceivableId} onChange={e => setOtherSettlementReceivableId(e.target.value)} required className={inputClasses}>
                                                <option value="" disabled>-- اختر مستحق --</option>
                                                {receivables.filter(r => r.currency === Currency.LYD && !r.isArchived && (r.amount - r.paid > 0)).map(r => <option key={r.id} value={r.id}>{r.debtor} ({formatCurrency(r.amount - r.paid, Currency.LYD)})</option>)}
                                            </select>
                                        </div>
                                    ) : null}
                                    {isOtherReceivableSettlement && otherReceivableSurplus > 0 && (
                                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/40 rounded-lg border border-yellow-200 dark:border-yellow-500/30 space-y-2">
                                            <p className="font-semibold text-yellow-800 dark:text-yellow-200">يوجد فائض بقيمة {formatCurrency(otherReceivableSurplus, Currency.LYD)}.</p>
                                            <div className="flex gap-4 pt-1">
                                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="radio" value="deposit" checked={otherSurplusHandling === 'deposit'} onChange={() => setOtherSurplusHandling('deposit')} className="form-radio" /> إيداع في الخزنة</label>
                                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="radio" value="debt" checked={otherSurplusHandling === 'debt'} onChange={() => setOtherSurplusHandling('debt')} className="form-radio" /> تسجيل كدين</label>
                                            </div>
                                            {otherSurplusHandling === 'debt' && (
                                                <div className="pt-2">
                                                    <CreatableSelect isClearable options={lydCustomers.map(c => ({ value: c.id, label: c.name }))} value={otherSurplusCustomerOption} onChange={(option) => setOtherSurplusCustomerOption(option)} placeholder="اختر أو أضف زبون للدين..." formatCreateLabel={(inputValue) => `إضافة زبون جديد: "${inputValue}"`} classNamePrefix="rs"/>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                     {showOtherSellDepositLocation && (
                                         <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع الدينار في</label><select value={otherLydSourceType} onChange={e => setOtherLydSourceType(e.target.value as 'cashLyd' | 'bank')} className={inputClasses}><option value="cashLyd">الخزنة النقدية</option><option value="bank">{ASSET_NAMES.bankLyd}</option></select></div>
                                             {otherLydSourceType === 'bank' ? (
                                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر المصرف</label><select value={otherLydBankId} onChange={e => setOtherLydBankId(e.target.value)} required className={inputClasses}>{banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                                            ) : (
                                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر خزنة الدينار</label><select value={otherLydCashAsset} onChange={e => setOtherLydCashAsset(e.target.value as AssetId)} required className={inputClasses}>
                                                    {LYD_CASH_ASSET_IDS.map(assetId => <option key={assetId} value={assetId}>
                                                        {lydAssetIcons[assetId] ? `${lydAssetIcons[assetId]} ` : ''}{ASSET_NAMES[assetId]}
                                                    </option>)}
                                                </select></div>
                                            )}
                                        </div>
                                    )}
                                 </>
                             )}
                        </div>
                        
                        <div>
                            <label htmlFor="otherNote" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظة (اختياري)</label>
                            <textarea id="otherNote" value={otherNote} onChange={e => setOtherNote(e.target.value)} rows={2} className={inputClasses}></textarea>
                        </div>
                        
                        {canUsePending && !isEditMode && (
                            <div className="relative flex items-start p-3 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-500/30">
                                <div className="flex items-center h-5">
                                    <input id="isPendingOther" type="checkbox" checked={isPending} onChange={e => setIsPending(e.target.checked)} className={checkboxClasses} />
                                </div>
                                <div className="ms-3 text-sm">
                                    <label htmlFor="isPendingOther" className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2"><ClipboardList size={16}/>إضافة إلى قائمة التأكيد</label>
                                    <p className="text-blue-700 dark:text-blue-400 text-xs">سيتم حفظ المعاملة في قائمة "بيع وشراء غير مكتمل" ولن يتم تنفيذها مالياً حتى يتم تأكيدها.</p>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="w-full bg-primary hover:bg-primary-dark dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity">
                            {isEditMode ? 'حفظ التعديلات' : isPending ? 'إضافة للقائمة' : 'تنفيذ العملية'}
                        </button>
                     </form>
                )}

                {activeTab === 'adjust_balance' && canAdjustBalance && (
                    <form onSubmit={handleAdjustSubmit} className="space-y-4">
                        <div className="flex gap-2 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
                            <button type="button" onClick={() => { setAdjustType('deposit'); setIsLoss(false); }} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${adjustType === 'deposit' ? 'bg-green-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>إيداع / إدخال</button>
                            <button type="button" onClick={() => { setAdjustType('withdrawal'); setIsProfit(false); }} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${adjustType === 'withdrawal' ? 'bg-red-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'}`}>سحب / إخراج</button>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الأصل النقدي</label>
                             <Select
                                value={allCashAssetsWithOptions.find(o => o.value === adjustAsset)}
                                onChange={(option) => option && setAdjustAsset(option.value as AssetId)}
                                options={allCashAssetsWithOptions}
                                formatOptionLabel={formatOptionLabel}
                                classNamePrefix="rs"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ</label>
                            <FormattedInput inputMode="decimal" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظة / سبب</label>
                            <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} required className={inputClasses} />
                        </div>
                        <div>
                            {adjustType === 'deposit' && (
                                <button type="button" onClick={() => setIsProfit(!isProfit)} className={`mt-1 w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${isProfit ? 'bg-green-600 text-white border-green-700' : 'bg-transparent border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:border-green-500'}`}>
                                    <TrendingUp size={16} />
                                    أضف للأرباح
                                </button>
                            )}
                            {adjustType === 'withdrawal' && (
                                <button type="button" onClick={() => setIsLoss(!isLoss)} className={`mt-1 w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${isLoss ? 'bg-red-600 text-white border-red-700' : 'bg-transparent border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:border-red-500'}`}>
                                    <TrendingDown size={16} />
                                    أضف للخسائر
                                </button>
                            )}
                        </div>
                        
                        {canUsePending && !isEditMode && (
                            <div className="relative flex items-start p-3 bg-blue-50 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-500/30">
                                <div className="flex items-center h-5">
                                    <input id="isPendingAdjust" type="checkbox" checked={isPending} onChange={e => setIsPending(e.target.checked)} className={checkboxClasses} />
                                </div>
                                <div className="ms-3 text-sm">
                                    <label htmlFor="isPendingAdjust" className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2"><ClipboardList size={16}/>إضافة إلى قائمة التأكيد</label>
                                </div>
                            </div>
                        )}

                        <button type="submit" className="w-full bg-primary hover:bg-primary-dark dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity">
                            {isEditMode ? 'حفظ التعديلات' : isPending ? 'إضافة للقائمة' : 'تنفيذ'}
                        </button>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default DailyTransactionsModal;
