import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useAppContext } from '../contexts/AppContext';
import { ASSET_NAMES, LYD_CASH_ASSET_IDS, AssetId, Currency, Receivable } from '../types';
import { ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import FormattedInput from './FormattedInput';

interface CurrencyExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const formatOptionLabel = ({ label, flag }: { value: string, label: string, flag: string }) => (
  <div className="flex items-center">
    {flag && <span className={`fi fi-${flag} fis me-2`}></span>}
    <span>{label}</span>
  </div>
);

const CurrencyExchangeModal: React.FC<CurrencyExchangeModalProps> = ({ isOpen, onClose }) => {
    const { assets, exchangeBetweenUsdAssets, exchangeBetweenEurAssets, customers, receivables } = useAppContext();

    const [currency, setCurrency] = useState<'USD' | 'EUR'>('USD');
    const [amount, setAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [fromAsset, setFromAsset] = useState<'cashUsdLibya' | 'cashUsdTurkey' | 'cashEurLibya' | 'cashEurTurkey'>('cashUsdLibya');
    const [feeType, setFeeType] = useState<'deduct' | 'add'>('deduct');
    const [feeAmount, setFeeAmount] = useState('');
    const [lydAssetId, setLydAssetId] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [note, setNote] = useState('');
    const [feeHandling, setFeeHandling] = useState<'cash' | 'debt' | 'receivable'>('cash');
    
    const [debtCustomerOption, setDebtCustomerOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);
    const [receivablePartyOption, setReceivablePartyOption] = useState<{ value: string; label: string; __isNew__?: boolean } | null>(null);

    const lydCustomers = useMemo(() => customers.filter(c => c.currency === Currency.LYD && !c.isArchived), [customers]);
    
    const lydDebtorOptions = useMemo(() => {
        const uniqueDebtors = [...new Set(
            receivables
                .filter(r => r.currency === Currency.LYD)
                .map(r => r.debtor)
        )];
        return uniqueDebtors.map(d => ({ value: d, label: d }));
    }, [receivables]);

    const assetOptions = useMemo(() => {
        if (currency === 'USD') {
            return [
                { value: 'cashUsdLibya', label: ASSET_NAMES.cashUsdLibya, flag: 'ly' },
                { value: 'cashUsdTurkey', label: ASSET_NAMES.cashUsdTurkey, flag: 'tr' }
            ];
        } else { // EUR
            return [
                { value: 'cashEurLibya', label: ASSET_NAMES.cashEurLibya, flag: 'ly' },
                { value: 'cashEurTurkey', label: ASSET_NAMES.cashEurTurkey, flag: 'tr' }
            ];
        }
    }, [currency]);

    useEffect(() => {
        if (isOpen) {
            setCurrency('USD');
            setFromAsset('cashUsdLibya');
            setAmount('');
            setToAmount('');
            setFeeType('deduct');
            setFeeAmount('');
            setLydAssetId(LYD_CASH_ASSET_IDS[0]);
            setNote('');
            setFeeHandling('cash');
            setDebtCustomerOption(null);
            setReceivablePartyOption(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (currency === 'USD') {
            setFromAsset('cashUsdLibya');
        } else {
            setFromAsset('cashEurLibya');
        }
        setAmount('');
        setToAmount('');
    }, [currency]);

    useEffect(() => {
        setToAmount(amount);
    }, [amount]);
    
    useEffect(() => {
        setFeeHandling('cash');
    }, [feeType]);

    const toAsset = useMemo(() => {
        if (fromAsset === 'cashUsdLibya') return 'cashUsdTurkey';
        if (fromAsset === 'cashUsdTurkey') return 'cashUsdLibya';
        if (fromAsset === 'cashEurLibya') return 'cashEurTurkey';
        if (fromAsset === 'cashEurTurkey') return 'cashEurLibya';
        return fromAsset; // Fallback
    }, [fromAsset]);

    const fromAssetBalance = assets[fromAsset];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        const numToAmount = parseFloat(toAmount);
        const numFeeAmount = parseFloat(feeAmount) || 0;

        if (isNaN(numAmount) || numAmount <= 0 || isNaN(numToAmount) || numToAmount < 0) {
            alert('الرجاء إدخال مبالغ صحيحة للبدل.');
            return;
        }
        if (numAmount > fromAssetBalance) {
            alert(`الرصيد في ${ASSET_NAMES[fromAsset]} غير كافٍ.`);
            return;
        }

        const feeDetails: any = {
            type: feeType,
            amount: numFeeAmount,
            handling: feeHandling,
        };
    
        if (numFeeAmount > 0) {
            if (feeHandling === 'cash') {
                if (!lydAssetId) { alert('الرجاء اختيار خزنة الدينار للفرق.'); return; }
                feeDetails.lydAssetId = lydAssetId;
            } else if (feeHandling === 'debt') {
                if (!debtCustomerOption) { alert('الرجاء اختيار أو إنشاء زبون للدين.'); return; }
                feeDetails.customerOption = debtCustomerOption;
            } else if (feeHandling === 'receivable') {
                if (!receivablePartyOption) { alert('الرجاء اختيار أو إنشاء طرف للمستحق.'); return; }
                feeDetails.receivableOption = receivablePartyOption;
            }
        }

        const details = { amount: numAmount, toAmount: numToAmount, fee: feeDetails, note };

        if (currency === 'USD') {
            exchangeBetweenUsdAssets({ ...details, fromAsset: fromAsset as 'cashUsdLibya' | 'cashUsdTurkey' });
        } else {
            exchangeBetweenEurAssets({ ...details, fromAsset: fromAsset as 'cashEurLibya' | 'cashEurTurkey' });
        }
        
        onClose();
    };
    
    const inputClasses = "mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="بدل عملات بين الخزائن" size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
                    <button type="button" onClick={() => setCurrency('USD')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'}`}>بدل دولار (USD)</button>
                    <button type="button" onClick={() => setCurrency('EUR')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${currency === 'EUR' ? 'bg-purple-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}>بدل يورو (EUR)</button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ الخارج من</label>
                        <Select
                            value={assetOptions.find(o => o.value === fromAsset)}
                            onChange={(option) => option && setFromAsset(option.value as any)}
                            options={assetOptions}
                            formatOptionLabel={formatOptionLabel}
                            classNamePrefix="rs"
                        />
                         <FormattedInput inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={`${inputClasses} mt-2`} placeholder="المبلغ الخارج" />
                        <p className="text-xs text-gray-500 mt-1">الرصيد: {formatCurrency(fromAssetBalance, currency as Currency)}</p>
                    </div>
                    <div className="pt-6">
                        <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ الداخل إلى</label>
                        <div className="p-2 bg-gray-100 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-md h-[42px] flex items-center mb-2">
                             <div className="flex items-center text-gray-800 dark:text-gray-200">
                                <span className={`fi fi-${toAsset.includes('Libya') ? 'ly' : 'tr'} fis me-2`}></span>
                                <span>{ASSET_NAMES[toAsset]}</span>
                            </div>
                        </div>
                        <FormattedInput inputMode="decimal" value={toAmount} onChange={e => setToAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={`${inputClasses}`} placeholder="المبلغ الداخل"/>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-dark-border space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">فرق الحوالة (LYD)</label>
                    <div className="flex gap-2 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
                        <button type="button" onClick={() => setFeeType('deduct')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${feeType === 'deduct' ? 'bg-red-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'}`}>خصم فرق</button>
                        <button type="button" onClick={() => setFeeType('add')} className={`w-full p-2 rounded-md text-sm font-medium transition-colors ${feeType === 'add' ? 'bg-green-600 text-white shadow' : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>إضافة فرق</button>
                    </div>

                    <div className="flex justify-around items-center pt-2">
                        {(['cash', 'debt', 'receivable'] as const).filter(type => {
                            if (feeType === 'deduct' && type === 'debt') return false;
                            if (feeType === 'add' && type === 'receivable') return false;
                            return true;
                        }).map(type => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    name="feeHandling"
                                    value={type}
                                    checked={feeHandling === type}
                                    onChange={() => setFeeHandling(type)}
                                    className="h-4 w-4 text-primary dark:text-gold focus:ring-primary dark:focus:ring-gold bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-500"
                                />
                                {type === 'cash' ? 'نقدي' : type === 'debt' ? 'دين' : 'مستحق'}
                            </label>
                        ))}
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مبلغ الفرق</label>
                        <FormattedInput inputMode="decimal" value={feeAmount} onChange={e => setFeeAmount(e.target.value.replace(/[^0-9.]/g, ''))} className={inputClasses} placeholder="0.00"/>
                    </div>
                    {feeHandling === 'cash' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">خزنة الدينار</label>
                            <select value={lydAssetId} onChange={e => setLydAssetId(e.target.value as AssetId)} className={inputClasses}>
                                {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                            </select>
                        </div>
                    )}
                    {feeHandling === 'debt' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تسجيل الدين على</label>
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
                    {feeHandling === 'receivable' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تسجيل المستحق لـ</label>
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
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظة (اختياري)</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputClasses}></textarea>
                </div>
                <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                    <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">تنفيذ البدل</button>
                </div>
            </form>
        </Modal>
    );
};

export default CurrencyExchangeModal;