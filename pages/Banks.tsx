

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import Modal from '../components/Modal';
import { Bank, Currency, LYD_CASH_ASSET_IDS, ASSET_NAMES, AssetId, Transaction } from '../types';
import { Plus, Edit, Trash2, ArrowRightLeft, ArrowDownCircle, ArrowUpCircle, CreditCard, Shuffle, History, Settings } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import useLocalStorage from '../hooks/useLocalStorage';
import FormattedInput from '../components/FormattedInput';

type DateFilter = 'daily' | 'weekly' | 'monthly';

const BankHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    bank: Bank | null;
    transactions: Transaction[];
}> = ({ isOpen, onClose, bank, transactions }) => {
    const [dateFilter, setDateFilter] = useState<DateFilter>('daily');

    const filteredTransactions = useMemo(() => {
        if (!bank) return [];
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
        return transactions
            .filter(t => !t.isDeleted && t.assetId === bank.id && new Date(t.date) >= startDate)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [bank, transactions, dateFilter]);

    const totals = useMemo(() => {
        const totalIn = filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
        const totalOut = filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
        return { totalIn, totalOut };
    }, [filteredTransactions]);

    if (!isOpen || !bank) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`سجل معاملات مصرف: ${bank.name}`} size="2xl">
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
                         {filteredTransactions.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد معاملات لهذه الفترة.</p>}
                    </ul>
                </div>
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg text-center">
                        <p className="text-sm text-green-700 dark:text-green-300">إجمالي الدخول</p>
                        <p className="font-bold text-lg text-green-600 dark:text-green-400 font-mono">{formatCurrency(totals.totalIn, Currency.LYD)}</p>
                    </div>
                     <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg text-center">
                        <p className="text-sm text-red-700 dark:text-red-300">إجمالي الخروج</p>
                        <p className="font-bold text-lg text-red-600 dark:text-red-400 font-mono">{formatCurrency(totals.totalOut, Currency.LYD)}</p>
                    </div>
                </div>
            </div>
        </Modal>
    )
}


const Banks: React.FC = () => {
    const { banks, addBank, updateBank, deleteBank, transactions, transferBetweenBanks, adjustBankBalance, exchangeFromBankToCash, exchangeFromCashToBank, hasPermission } = useAppContext();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<Bank | null>(null);
    const [bankName, setBankName] = useState('');
    const [bankBalance, setBankBalance] = useState('');
    const [isPosEnabled, setIsPosEnabled] = useState(false);
    
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [fromBankId, setFromBankId] = useState('');
    const [toBankId, setToBankId] = useState('');
    const [transferAmount, setTransferAmount] = useState('');

    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustType, setAdjustType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [adjustBankId, setAdjustBankId] = useState('');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustNote, setAdjustNote] = useState('');

    const [isCashExchangeModalOpen, setIsCashExchangeModalOpen] = useState(false);
    const [cashExchangeBankId, setCashExchangeBankId] = useState('');
    const [cashExchangeAmount, setCashExchangeAmount] = useState('');
    const [cashExchangeAssetId, setCashExchangeAssetId] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [exchangeDirection, setExchangeDirection] = useState<'bankToCash' | 'cashToBank'>('bankToCash');

    const [confirmationState, setConfirmationState] = useState<{ isOpen: boolean; bank: Bank | null }>({ isOpen: false, bank: null });
    
    const [mainListDateFilter, setMainListDateFilter] = useState<DateFilter>('daily');
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyBank, setHistoryBank] = useState<Bank | null>(null);

    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [buttonConfig, setButtonConfig] = useLocalStorage('bankActionButtonsConfig', {
        deposit: true,
        withdraw: true,
        transfer: true,
        exchange: true,
    });

    const buttonLabels = {
        deposit: 'إيداع',
        withdraw: 'سحب',
        transfer: 'بدل',
        exchange: 'سحب نقدي'
    };


    const { nonPosBankTransactions, posBankTransactions } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        switch (mainListDateFilter) {
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
        
        const filteredTxs = transactions.filter(t => new Date(t.date) >= startDate);

        const nonPosBankIds = new Set(banks.filter(b => !b.isPosEnabled).map(b => b.id));
        const posBankIds = new Set(banks.filter(b => b.isPosEnabled).map(b => b.id));
        
        const nonPos = filteredTxs.filter(t => !t.isDeleted && nonPosBankIds.has(t.assetId)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const pos = filteredTxs.filter(t => !t.isDeleted && posBankIds.has(t.assetId)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return { nonPosBankTransactions: nonPos, posBankTransactions: pos };
    }, [transactions, banks, mainListDateFilter]);


    const openModalForNew = () => {
        setEditingBank(null);
        setBankName('');
        setBankBalance('0');
        setIsPosEnabled(false);
        setIsEditModalOpen(true);
    };

    const openModalForEdit = (bank: Bank) => {
        setEditingBank(bank);
        setBankName(bank.name);
        setBankBalance(String(bank.balance));
        setIsPosEnabled(bank.isPosEnabled || false);
        setIsEditModalOpen(true);
    };
    
    const openHistoryModal = (bank: Bank) => {
        setHistoryBank(bank);
        setIsHistoryModalOpen(true);
    };

    const handleEditFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numBalance = parseFloat(bankBalance);
        if (editingBank) {
            updateBank(editingBank.id, bankName, numBalance, isPosEnabled);
        } else {
            addBank(bankName, numBalance || 0, isPosEnabled);
        }
        setIsEditModalOpen(false);
    };

    const handleTransferFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(transferAmount);
        if(fromBankId && toBankId && fromBankId !== toBankId && amount > 0) {
            transferBetweenBanks(fromBankId, toBankId, amount);
            setIsTransferModalOpen(false);
            setFromBankId('');
            setToBankId('');
            setTransferAmount('');
        }
    };

    const handleAdjustFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(adjustAmount);
        if (adjustBankId && amount > 0 && adjustNote) {
            adjustBankBalance(adjustBankId, amount, adjustType, adjustNote);
            setIsAdjustModalOpen(false);
            setAdjustBankId('');
            setAdjustAmount('');
            setAdjustNote('');
        }
    };

    const handleExchangeFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(cashExchangeAmount);
        if (!(amount > 0)) {
            alert('يرجى إدخال مبلغ صحيح.');
            return;
        }

        if (exchangeDirection === 'bankToCash') {
            const bank = banks.find(b => b.id === cashExchangeBankId);
            if (!bank) { alert('يرجى اختيار مصرف.'); return; }
            if (bank.balance < amount) {
                alert('رصيد المصرف غير كافٍ لإتمام العملية.');
                return;
            }
            exchangeFromBankToCash(cashExchangeBankId, amount, cashExchangeAssetId);
        } else { // cashToBank
            exchangeFromCashToBank(cashExchangeAssetId, amount, cashExchangeBankId);
        }
        
        setIsCashExchangeModalOpen(false);
        setCashExchangeBankId('');
        setCashExchangeAmount('');
    };

    const openAdjustModal = (type: 'deposit' | 'withdrawal') => {
        setAdjustType(type);
        if (banks.length > 0) setAdjustBankId(banks[0].id);
        setIsAdjustModalOpen(true);
    };

    const openCashExchangeModal = () => {
        if (banks.length > 0) {
            setCashExchangeBankId(banks[0].id);
        }
        setCashExchangeAmount('');
        setExchangeDirection('bankToCash');
        setIsCashExchangeModalOpen(true);
    };
    
    const openDeleteConfirm = (bank: Bank) => {
        setConfirmationState({ isOpen: true, bank });
    };

    const onConfirmDelete = () => {
        if (confirmationState.bank) {
            deleteBank(confirmationState.bank.id);
        }
        setConfirmationState({ isOpen: false, bank: null });
    };

    const inputClasses = "mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";

    const renderDateFilterButtons = (setter: React.Dispatch<React.SetStateAction<DateFilter>>, current: DateFilter) => (
        <div className="flex-shrink-0 flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-bg p-1">
            {(['daily', 'weekly', 'monthly'] as DateFilter[]).map(period => (
                <button key={period} onClick={() => setter(period)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${current === period ? 'bg-white dark:bg-dark-card shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-card/50'}`}>
                    {period === 'daily' ? 'يومي' : period === 'weekly' ? 'أسبوعي' : 'شهري'}
                </button>
            ))}
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">قائمة المصارف</h3>
                    <div className="flex flex-wrap gap-2">
                         <button onClick={() => setIsSettingsModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                            <Settings size={18} />
                         </button>
                         {hasPermission('banks', 'deposit') && buttonConfig.deposit && <button onClick={() => openAdjustModal('deposit')} className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                            <ArrowUpCircle size={18} /><span>إيداع</span>
                        </button>}
                         {hasPermission('banks', 'withdraw') && buttonConfig.withdraw && <button onClick={() => openAdjustModal('withdrawal')} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                            <ArrowDownCircle size={18} /><span>سحب</span>
                        </button>}
                        {hasPermission('banks', 'transfer') && buttonConfig.transfer && <button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                            <ArrowRightLeft size={18} /><span>بدل</span>
                        </button>}
                        {hasPermission('banks', 'exchange') && buttonConfig.exchange && <button onClick={openCashExchangeModal} className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                            <Shuffle size={18} /><span>سحب نقدي</span>
                        </button>}
                        {hasPermission('banks', 'add') && <button onClick={openModalForNew} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-opacity">
                            <Plus size={18} /><span>مصرف جديد</span>
                        </button>}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                            <tr>
                                <th scope="col" className="px-6 py-3">اسم المصرف</th>
                                <th scope="col" className="px-6 py-3">الرصيد الحالي</th>
                                <th scope="col" className="px-6 py-3">خاصية P.O.S</th>
                                <th scope="col" className="px-6 py-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {banks.map(bank => (
                                <tr key={bank.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">{bank.name}</td>
                                    <td className="px-6 py-4 font-mono">{formatCurrency(bank.balance, Currency.LYD)}</td>
                                    <td className="px-6 py-4">
                                        {bank.isPosEnabled ? (
                                            <span className="inline-flex items-center gap-2 px-2 py-1 bg-green-100 dark:bg-gold/10 text-green-800 dark:text-gold text-xs font-medium rounded-full">
                                                <CreditCard size={14} /> مفعلة
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full">
                                                غير مفعلة
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button onClick={() => openHistoryModal(bank)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" title="السجل"><History size={18} /></button>
                                        {hasPermission('banks', 'edit') && <button onClick={() => openModalForEdit(bank)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" title="تعديل"><Edit size={18} /></button>}
                                        {hasPermission('banks', 'delete') && <button onClick={() => openDeleteConfirm(bank)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" title="حذف"><Trash2 size={18} /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">آخر المعاملات (العادية)</h3>
                        {renderDateFilterButtons(setMainListDateFilter, mainListDateFilter)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        عرض جميع المعاملات التي تمت على المصارف غير المخصصة لنقاط البيع (P.O.S).
                    </p>
                    <ul className="space-y-4 max-h-[15rem] overflow-y-auto pr-2">
                        {nonPosBankTransactions.length > 0 ? nonPosBankTransactions.map(tx => (
                            <li key={tx.id} className="flex justify-between items-start border-b pb-2 border-gray-200 dark:border-dark-border">
                                <div>
                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{tx.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(tx.date)}</p>
                                </div>
                                <span className={`font-bold shrink-0 ms-2 font-mono ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{formatCurrency(tx.amount, tx.currency)}</span>
                            </li>
                        )) : <p className="text-gray-500 dark:text-gray-500">لا توجد معاملات مصرفية عادية لعرضها.</p>}
                    </ul>
                 </div>
                 <div className="border-t border-gray-200 dark:border-dark-border pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">آخر المعاملات (P.O.S)</h3>
                        {/* The same filter state controls both lists */}
                    </div>
                    <ul className="space-y-4 max-h-[15rem] overflow-y-auto pr-2">
                        {posBankTransactions.length > 0 ? posBankTransactions.map(tx => (
                            <li key={tx.id} className="flex justify-between items-start border-b pb-2 border-gray-200 dark:border-dark-border">
                                <div>
                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{tx.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">{formatDate(tx.date)}</p>
                                </div>
                                <span className={`font-bold shrink-0 ms-2 font-mono ${tx.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{formatCurrency(tx.amount, tx.currency)}</span>
                            </li>
                        )) : <p className="text-gray-500 dark:text-gray-500">لا توجد معاملات مصرفية P.O.S لعرضها.</p>}
                    </ul>
                 </div>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={editingBank ? 'تعديل مصرف' : 'إضافة مصرف جديد'}>
                <form onSubmit={handleEditFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المصرف</label>
                        <input type="text" id="bankName" value={bankName} onChange={e => setBankName(e.target.value)} required className={inputClasses}/>
                    </div>
                    <div>
                        <label htmlFor="bankBalance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{editingBank ? 'الرصيد الحالي (LYD)' : 'الرصيد الافتتاحي (LYD)'}</label>
                        <FormattedInput inputMode="decimal" id="bankBalance" value={bankBalance} onChange={e => setBankBalance(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses}/>
                    </div>
                    <div className="relative flex items-start">
                        <div className="flex items-center h-5">
                            <input id="isPosEnabled" type="checkbox" checked={isPosEnabled} onChange={e => setIsPosEnabled(e.target.checked)} className="focus:ring-primary dark:focus:ring-gold h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded" />
                        </div>
                        <div className="ms-3 text-sm">
                            <label htmlFor="isPosEnabled" className="font-medium text-gray-700 dark:text-gray-300">تفعيل ماكينة P.O.S</label>
                        </div>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">{editingBank ? 'حفظ التعديلات' : 'إضافة'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="بدل بين المصارف">
                <form onSubmit={handleTransferFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="fromBank" className="block text-sm font-medium text-gray-700 dark:text-gray-300">من مصرف</label>
                        <select id="fromBank" value={fromBankId} onChange={e => setFromBankId(e.target.value)} required className={inputClasses}>
                            <option value="" disabled>-- اختر --</option>
                            {banks.map(b => <option key={b.id} value={b.id}>{b.name} ({formatCurrency(b.balance, Currency.LYD)})</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="toBank" className="block text-sm font-medium text-gray-700 dark:text-gray-300">إلى مصرف</label>
                        <select id="toBank" value={toBankId} onChange={e => setToBankId(e.target.value)} required className={inputClasses}>
                            <option value="" disabled>-- اختر --</option>
                            {banks.filter(b => b.id !== fromBankId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ (LYD)</label>
                        <FormattedInput inputMode="decimal" id="transferAmount" value={transferAmount} onChange={e => setTransferAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses}/>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">تنفيذ البدل</button>
                    </div>
                </form>
            </Modal>
             <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title={`إجراء ${adjustType === 'deposit' ? 'إيداع' : 'سحب'} بنكي`}>
                <form onSubmit={handleAdjustFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="adjustBank" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المصرف</label>
                        <select id="adjustBank" value={adjustBankId} onChange={e => setAdjustBankId(e.target.value)} required className={inputClasses}>
                            <option value="" disabled>-- اختر مصرف --</option>
                            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="adjustAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ (LYD)</label>
                        <FormattedInput inputMode="decimal" id="adjustAmount" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses}/>
                    </div>
                     <div>
                        <label htmlFor="adjustNote" className="block text-sm font-medium text-gray-700 dark:text-gray-300">السبب / ملاحظة</label>
                        <input type="text" id="adjustNote" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} required className={inputClasses}/>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">تنفيذ</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isCashExchangeModalOpen} onClose={() => setIsCashExchangeModalOpen(false)} title="سحب نقدي من مصرف لخزنة">
                <form onSubmit={handleExchangeFormSubmit} className="space-y-4">
                     <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">من</label>
                            {exchangeDirection === 'bankToCash' ? (
                                <select value={cashExchangeBankId} onChange={e => setCashExchangeBankId(e.target.value)} required className={inputClasses}>
                                    <option value="" disabled>-- اختر مصرف --</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name} ({formatCurrency(b.balance, Currency.LYD)})</option>)}
                                </select>
                            ) : (
                                <select value={cashExchangeAssetId} onChange={e => setCashExchangeAssetId(e.target.value as AssetId)} required className={inputClasses}>
                                    {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                </select>
                            )}
                        </div>
                         <button type="button" onClick={() => setExchangeDirection(p => p === 'bankToCash' ? 'cashToBank' : 'bankToCash')} className="mt-6 p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                             <ArrowRightLeft className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                         </button>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إلى</label>
                            {exchangeDirection === 'bankToCash' ? (
                                <select value={cashExchangeAssetId} onChange={e => setCashExchangeAssetId(e.target.value as AssetId)} required className={inputClasses}>
                                    {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                </select>
                            ) : (
                                 <select value={cashExchangeBankId} onChange={e => setCashExchangeBankId(e.target.value)} required className={inputClasses}>
                                    <option value="" disabled>-- اختر مصرف --</option>
                                    {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="exchangeAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ (LYD)</label>
                        <FormattedInput inputMode="decimal" id="exchangeAmount" value={cashExchangeAmount} onChange={e => setCashExchangeAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={inputClasses}/>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsCashExchangeModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">تنفيذ السحب النقدي</button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={() => setConfirmationState({ isOpen: false, bank: null })}
                onConfirm={onConfirmDelete}
                title="تأكيد الحذف"
                message={`هل أنت متأكد من حذف مصرف "${confirmationState.bank?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                confirmText="نعم، حذف"
                confirmButtonVariant="danger"
            />
            
            <BankHistoryModal 
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                bank={historyBank}
                transactions={transactions}
            />
            
            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="إعدادات عرض الأزرار">
                <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        اختر الأزرار التي تظهر في صفحة المصارف.
                    </p>
                    {Object.entries(buttonLabels).map(([key, label]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-dark-bg rounded-lg">
                            <label htmlFor={`toggle-${key}`} className="font-medium text-gray-700 dark:text-gray-300">{label}</label>
                            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                <input
                                    id={`toggle-${key}`}
                                    type="checkbox"
                                    checked={buttonConfig[key as keyof typeof buttonConfig]}
                                    onChange={() => {
                                        setButtonConfig(prev => ({ ...prev, [key]: !prev[key as keyof typeof buttonConfig] }))
                                    }}
                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer start-0"
                                />
                                <label htmlFor={`toggle-${key}`} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"></label>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
};

export default Banks;