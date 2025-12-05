import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ExternalValue, Currency } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Plus, Edit, Trash2, WalletCards, TrendingUp, TrendingDown, Info } from 'lucide-react';

const ExternalValues: React.FC = () => {
    const { externalValues, addExternalValue, adjustExternalValue, deleteExternalValue, hasPermission, externalValueTransactions, deleteExternalValueTransaction } = useAppContext();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [editingValue, setEditingValue] = useState<ExternalValue | null>(null);
    const [confirmationState, setConfirmationState] = useState<{ isOpen: boolean; valueId: string | null; transactionId?: string; isTransactionDelete?: boolean }>({ isOpen: false, valueId: null });

    // Add form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>(Currency.LYD);
    const [notes, setNotes] = useState('');
    
    // Adjust form state
    const [adjustment, setAdjustment] = useState('');
    const [adjustNotes, setAdjustNotes] = useState('');
    const [adjustmentType, setAdjustmentType] = useState<'deposit' | 'withdrawal'>('deposit');

    const openAddModal = () => {
        setName('');
        setAmount('');
        setCurrency(Currency.LYD);
        setNotes('');
        setIsAddModalOpen(true);
    };

    const openAdjustModal = (value: ExternalValue, type: 'deposit' | 'withdrawal') => {
        setEditingValue(value);
        setAdjustmentType(type);
        setAdjustment('');
        setAdjustNotes('');
        setIsAdjustModalOpen(true);
    };
    
    const openHistoryModal = (value: ExternalValue) => {
        setEditingValue(value);
        setIsHistoryModalOpen(true);
    };

    const openDeleteConfirm = (valueId: string) => {
        setConfirmationState({ isOpen: true, valueId, isTransactionDelete: false });
    };
    
    const openDeleteTransactionConfirm = (transactionId: string) => {
        setConfirmationState({ isOpen: true, valueId: null, transactionId, isTransactionDelete: true });
    };

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (name && !isNaN(numAmount)) {
            addExternalValue({ name, amount: numAmount, currency, notes });
            setIsAddModalOpen(false);
        }
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAdjustment = parseFloat(adjustment);
        if (editingValue && !isNaN(numAdjustment) && numAdjustment > 0) {
            adjustExternalValue(editingValue.id, numAdjustment, adjustmentType, adjustNotes);
            setIsAdjustModalOpen(false);
        } else {
             alert("الرجاء إدخال مبلغ صحيح أكبر من صفر.");
        }
    };

    const handleDeleteConfirm = () => {
        if (confirmationState.isTransactionDelete && confirmationState.transactionId) {
             deleteExternalValueTransaction(confirmationState.transactionId);
        } else if (confirmationState.valueId) {
            deleteExternalValue(confirmationState.valueId);
        }
        setConfirmationState({ isOpen: false, valueId: null });
    };

    const modalInputClasses = "mt-1 w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";

    const sortedValues = useMemo(() => 
        [...externalValues].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
    [externalValues]);
    
    const valueHistory = useMemo(() => {
        if (!editingValue) return [];
        return externalValueTransactions
            .filter(tx => tx.externalValueId === editingValue.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [editingValue, externalValueTransactions]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">القيم خارج الخزنة</h2>
                    {hasPermission('externalValues', 'add') && (
                        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-opacity">
                            <Plus size={18} /> إضافة قيمة جديدة
                        </button>
                    )}
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-500/30 rounded-lg text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3">
                    <Info className="w-6 h-6 flex-shrink-0 text-blue-500" />
                    <p>هذه الصفحة مخصصة لتسجيل القيم المالية التي لا تؤثر على الأرصدة الرئيسية للخزائن أو المصارف. يمكنك استخدامها لتتبع الأمانات، أو الديون الشخصية، أو أي مبالغ أخرى تريد متابعتها بشكل منفصل.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sortedValues.map(value => (
                        <div key={value.id} className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-5 flex flex-col space-y-4 border border-gray-200 dark:border-dark-border">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{value.name}</h3>
                                    <p className="text-xs text-gray-500">{formatDate(value.createdAt)}</p>
                                </div>
                                <button onClick={() => openHistoryModal(value)} className="p-2 text-gray-400 hover:text-primary dark:hover:text-gold" title="عرض السجل">
                                    <WalletCards size={18} />
                                </button>
                            </div>
                            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold font-mono">
                                {formatCurrency(value.amount, value.currency)}
                            </p>
                            {value.notes && <p className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-dark-border pt-3 mt-auto">{value.notes}</p>}
                            <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-dark-border">
                                {hasPermission('externalValues', 'edit') && (
                                    <>
                                        <button onClick={() => openAdjustModal(value, 'deposit')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                                            <TrendingUp size={16} /> إيداع
                                        </button>
                                        <button onClick={() => openAdjustModal(value, 'withdrawal')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                                            <TrendingDown size={16} /> خصم
                                        </button>
                                    </>
                                )}
                                {hasPermission('externalValues', 'delete') && (
                                    <button onClick={() => openDeleteConfirm(value.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-500 rounded-md">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                 {sortedValues.length === 0 && (
                    <div className="text-center py-16 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-200 dark:border-dark-border">
                        <p className="text-gray-500">لا توجد قيم مسجلة خارج الخزنة.</p>
                    </div>
                 )}
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة قيمة جديدة خارج الخزنة">
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <input type="text" placeholder="اسم القيمة (مثال: أمانة فلان)" value={name} onChange={e => setName(e.target.value)} required className={modalInputClasses} />
                    <input type="text" inputMode="decimal" placeholder="المبلغ المبدئي" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={modalInputClasses} />
                    <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className={modalInputClasses}>
                        <option value={Currency.LYD}>دينار ليبي</option>
                        <option value={Currency.USD}>دولار أمريكي</option>
                        <option value={Currency.EUR}>يورو</option>
                        <option value={Currency.TND}>دينار تونسي</option>
                    </select>
                    <textarea placeholder="ملاحظات (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={modalInputClasses}></textarea>
                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">إضافة</button>
                </form>
            </Modal>

            {editingValue && (
                <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title={`${adjustmentType === 'deposit' ? 'إيداع في' : 'خصم من'}: ${editingValue.name}`}>
                    <form onSubmit={handleAdjustSubmit} className="space-y-4">
                        <p className="text-gray-300">الرصيد الحالي: <span className="font-bold font-mono">{formatCurrency(editingValue.amount, editingValue.currency)}</span></p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ</label>
                            <input type="text" inputMode="decimal" placeholder="أدخل المبلغ..." value={adjustment} onChange={e => setAdjustment(e.target.value.replace(/[^0-9.]/g, ''))} required className={modalInputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                            <textarea placeholder="ملاحظات العملية (اختياري)" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} rows={3} className={modalInputClasses}></textarea>
                        </div>
                        <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">
                            {adjustmentType === 'deposit' ? 'تأكيد الإيداع' : 'تأكيد الخصم'}
                        </button>
                    </form>
                </Modal>
            )}

            {editingValue && (
                <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`سجل: ${editingValue.name}`} size="2xl">
                     <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                        {valueHistory.map(tx => (
                            <div key={tx.id} className="p-3 bg-dark-bg rounded-lg flex justify-between items-start">
                                <div>
                                    <p className={`font-semibold ${tx.type === 'deposit' || tx.type === 'initial' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.type === 'initial' ? 'قيمة ابتدائية' : tx.type === 'deposit' ? 'إيداع' : 'خصم'}
                                        <span className="font-mono ms-2">{formatCurrency(tx.amount, editingValue.currency)}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">{formatDate(tx.date)} بواسطة {tx.user}</p>
                                    {tx.notes && <p className="text-sm text-gray-400 mt-1">{tx.notes}</p>}
                                </div>
                                {tx.type !== 'initial' && hasPermission('externalValues', 'delete') && (
                                    <button onClick={() => openDeleteTransactionConfirm(tx.id)} className="p-1 text-gray-500 hover:text-red-400" title="حذف الحركة">
                                        <Trash2 size={14}/>
                                    </button>
                                )}
                            </div>
                        ))}
                     </div>
                </Modal>
            )}

            <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={() => setConfirmationState({ isOpen: false, valueId: null })}
                onConfirm={handleDeleteConfirm}
                title="تأكيد الحذف"
                message={confirmationState.isTransactionDelete ? "هل أنت متأكد من حذف هذه الحركة؟ سيتم عكس قيمتها من الرصيد." : "هل أنت متأكد من حذف هذه القيمة وكل سجلها؟ لا يمكن التراجع عن هذا الإجراء."}
            />
        </>
    );
};

export default ExternalValues;