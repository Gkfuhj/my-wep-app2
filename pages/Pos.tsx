import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Currency, PosTransactionDetail, LYD_CASH_ASSET_IDS, ASSET_NAMES, AssetId } from '../types';
import { Banknote, Percent, CheckCircle, Archive, RefreshCcw, Hash, TrendingUp, Trash2, AlertTriangle } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const Pos: React.FC = () => {
    const { banks, addPosTransaction, posTransactions, archivePosTransaction, restorePosTransaction, hasPermission, deletePosTransaction } = useAppContext();

    const [totalAmount, setTotalAmount] = useState('');
    const [bankCommissionRate, setBankCommissionRate] = useState('1.5');
    const [cashGivenToCustomerAmount, setCashGivenToCustomerAmount] = useState('');
    const [bankId, setBankId] = useState('');
    const [lydCashAssetId, setLydCashAssetId] = useState<AssetId>(LYD_CASH_ASSET_IDS[0]);
    const [note, setNote] = useState('');
    const [transactionCount, setTransactionCount] = useState('');
    const [isCashReceiptCancelled, setIsCashReceiptCancelled] = useState(false);

    const [isManualDeposit, setIsManualDeposit] = useState(false);
    const [manualDepositAmount, setManualDepositAmount] = useState('');
    
    const [view, setView] = useState<'active' | 'archived'>('active');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | null>(null);

    const posBanks = useMemo(() => banks.filter(b => b.isPosEnabled), [banks]);

    useEffect(() => {
        if (posBanks.length > 0 && !bankId) {
            setBankId(posBanks[0].id);
        }
    }, [posBanks, bankId]);

    const bankDepositAmount = useMemo(() => {
        if (isManualDeposit) {
            return parseFloat(manualDepositAmount) || 0;
        }
        const total = parseFloat(totalAmount) || 0;
        const rate = parseFloat(bankCommissionRate) || 0;
        return total - (total * (rate / 100));
    }, [totalAmount, bankCommissionRate, isManualDeposit, manualDepositAmount]);

    const cashGivenToCustomer = useMemo(() => {
        return isCashReceiptCancelled ? 0 : (parseFloat(cashGivenToCustomerAmount) || 0);
    }, [isCashReceiptCancelled, cashGivenToCustomerAmount]);

    const netProfit = useMemo(() => {
        return bankDepositAmount - cashGivenToCustomer;
    }, [bankDepositAmount, cashGivenToCustomer]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const txCount = parseInt(transactionCount);
        const total = parseFloat(totalAmount);
        
        if (!bankId || isNaN(txCount) || txCount <= 0 || (isNaN(total) || total <= 0) && !isManualDeposit) {
            alert('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.');
            return;
        }

        const details = {
            totalAmount: total,
            bankCommissionRate: parseFloat(bankCommissionRate),
            bankDepositAmount: bankDepositAmount,
            cashGivenToCustomer: cashGivenToCustomer,
            bankId: bankId,
            transactionCount: txCount,
            lydCashAssetId: lydCashAssetId,
            note,
        };
        addPosTransaction(details);
        // Reset form
        setTotalAmount('');
        setCashGivenToCustomerAmount('');
        setTransactionCount('');
        setNote('');
        setIsManualDeposit(false);
        setManualDepositAmount('');
    };

    const handleDelete = (id: string) => {
        setTransactionToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const transactionsToDisplay = useMemo(() => {
        return posTransactions
            .filter(tx => view === 'active' ? !tx.isArchived : tx.isArchived)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [posTransactions, view]);

    const inputClasses = "mt-1 block w-full bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md shadow-sm py-2 px-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold disabled:bg-gray-200 dark:disabled:bg-gray-700";
    const checkboxClasses = "h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded focus:ring-primary dark:focus:ring-gold";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">إضافة معاملة POS جديدة</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر مصرف P.O.S</label>
                        <select value={bankId} onChange={e => setBankId(e.target.value)} required className={inputClasses}>
                            {posBanks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        {posBanks.length === 0 && <p className="text-xs text-red-500 dark:text-red-400 mt-1">لا توجد مصارف P.O.S مفعلة.</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إجمالي المبلغ</label>
                        <input type="text" inputMode="decimal" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} required className={inputClasses} disabled={isManualDeposit} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نسبة المصرف (%)</label>
                        <input type="text" inputMode="decimal" value={bankCommissionRate} onChange={e => setBankCommissionRate(e.target.value)} required className={inputClasses} disabled={isManualDeposit} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المودع في المصرف</label>
                        <div className="p-2 bg-gray-100 dark:bg-dark-bg rounded-md text-blue-600 dark:text-blue-400 font-bold font-mono">
                            {formatCurrency(bankDepositAmount, Currency.LYD)}
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center">
                            <input id="manualDeposit" type="checkbox" checked={isManualDeposit} onChange={e => setIsManualDeposit(e.target.checked)} className={checkboxClasses} />
                            <label htmlFor="manualDeposit" className="ms-2 block text-sm text-gray-900 dark:text-gray-300">تحديد قيمة الإيداع يدوياً</label>
                        </div>
                        {isManualDeposit && (
                             <input type="text" inputMode="decimal" value={manualDepositAmount} onChange={e => setManualDepositAmount(e.target.value)} placeholder="أدخل قيمة الإيداع" required className={`${inputClasses} mt-2`} />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center">
                            <input id="isCashReceiptCancelled" type="checkbox" checked={isCashReceiptCancelled} onChange={e => setIsCashReceiptCancelled(e.target.checked)} className={checkboxClasses} />
                            <label htmlFor="isCashReceiptCancelled" className="ms-2 block text-sm text-gray-900 dark:text-gray-300">بدون سحب سيولة</label>
                        </div>
                        {!isCashReceiptCancelled && (
                            <>
                                <input type="text" inputMode="decimal" value={cashGivenToCustomerAmount} onChange={e => setCashGivenToCustomerAmount(e.target.value)} placeholder="السيولة المسحوبة" className={`${inputClasses} mt-2`} />
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">خصم السيولة من</label>
                                <select value={lydCashAssetId} onChange={e => setLydCashAssetId(e.target.value as AssetId)} className={inputClasses}>
                                    {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                </select>
                            </>
                        )}
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">عدد المعاملات</label>
                            <input type="text" inputMode="numeric" value={transactionCount} onChange={e => setTransactionCount(e.target.value)} required className={inputClasses} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الربح الصافي</label>
                            <div className="p-2 bg-gray-100 dark:bg-dark-bg rounded-md text-green-600 dark:text-green-400 font-bold font-mono">
                                {formatCurrency(netProfit, Currency.LYD)}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={inputClasses}></textarea>
                    </div>
                     {hasPermission('pos', 'add') && <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">إضافة المعاملة</button>}
                </form>
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">سجل معاملات P.O.S</h3>
                    <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                        <button onClick={() => setView('active')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'active' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400'}`}>النشطة</button>
                        <button onClick={() => setView('archived')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'archived' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400'}`}>الأرشيف</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">المصرف</th>
                                <th className="px-6 py-3">إجمالي المبلغ</th>
                                <th className="px-6 py-3">المودع في المصرف</th>
                                <th className="px-6 py-3">الربح الصافي</th>
                                <th className="px-6 py-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactionsToDisplay.map(tx => (
                                <tr key={tx.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5">
                                    <td className="px-6 py-4">{formatDate(tx.date)}</td>
                                    <td className="px-6 py-4">{tx.bankName}</td>
                                    <td className="px-6 py-4">{formatCurrency(tx.totalAmount, Currency.LYD)}</td>
                                    <td className="px-6 py-4 font-semibold text-blue-500">{formatCurrency(tx.bankDepositAmount, Currency.LYD)}</td>
                                    <td className="px-6 py-4 font-semibold text-green-500">{formatCurrency(tx.netProfit, Currency.LYD)}</td>
                                    <td className="px-6 py-4 flex gap-2">
                                        {view === 'active' ? (
                                            <>
                                                {hasPermission('pos', 'archive') && <button onClick={() => archivePosTransaction(tx.id)} className="text-yellow-500 dark:text-yellow-400" title="أرشفة"><Archive size={18} /></button>}
                                                {hasPermission('pos', 'delete') && <button onClick={() => handleDelete(tx.id)} className="text-red-500 dark:text-red-400" title="حذف"><Trash2 size={18} /></button>}
                                            </>
                                        ) : (
                                            <>
                                                {hasPermission('pos', 'archive') && <button onClick={() => restorePosTransaction(tx.id)} className="text-green-500 dark:text-green-400" title="استعادة"><RefreshCcw size={18} /></button>}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {transactionsToDisplay.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <p>{view === 'active' ? 'لا توجد معاملات نشطة.' : 'الأرشيف فارغ.'}</p>
                        </div>
                     )}
                </div>
            </div>
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => {
                    if (transactionToDeleteId) deletePosTransaction(transactionToDeleteId, true);
                    setIsDeleteModalOpen(false);
                }}
                title="تأكيد الحذف"
                message="هل أنت متأكد من حذف هذه المعاملة؟ سيتم عكس قيمتها مالياً وحذفها من السجل بشكل صامت (لن يظهر قيد عكسي)."
                confirmText="نعم، حذف"
                confirmButtonVariant="danger"
            />
        </div>
    );
};

export default Pos;
