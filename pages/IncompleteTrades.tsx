import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PendingTrade } from '../types';
import { formatDate } from '../lib/utils';
import { Check, Edit, Trash2, Package, PackageOpen, RefreshCcw } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import DailyTransactionsModal from '../components/DailyTransactionsModal';

const IncompleteTrades: React.FC = () => {
    const { pendingTrades, confirmPendingTrade, deletePendingTrade, restorePendingTrade, hasPermission } = useAppContext();
    const [view, setView] = useState<'pending' | 'deleted'>('pending');
    const [editingTrade, setEditingTrade] = useState<PendingTrade | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        action: 'confirm' | 'delete' | 'restore' | null;
        tradeId: string | null;
        message: string;
    }>({ isOpen: false, action: null, tradeId: null, message: '' });

    const tradesToDisplay = useMemo(() => {
        return pendingTrades
            .filter(t => t.status === view)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [pendingTrades, view]);
    
    const handleEdit = (trade: PendingTrade) => {
        setEditingTrade(trade);
        setIsEditModalOpen(true);
    };

    const handleConfirm = (tradeId: string) => {
        setConfirmationState({
            isOpen: true,
            action: 'confirm',
            tradeId,
            message: 'هل أنت متأكد من تأكيد هذه المعاملة؟ سيتم تنفيذها مالياً ولا يمكن التراجع عنها من هذه الصفحة.',
        });
    };
    
    const handleDelete = (tradeId: string) => {
        setConfirmationState({
            isOpen: true,
            action: 'delete',
            tradeId,
            message: 'هل أنت متأكد من حذف هذه المعاملة المعلقة؟',
        });
    };
    
    const handleRestore = (tradeId: string) => {
        setConfirmationState({
            isOpen: true,
            action: 'restore',
            tradeId,
            message: 'هل أنت متأكد من استعادة هذه المعاملة؟',
        });
    };

    const onConfirmAction = () => {
        if (!confirmationState.tradeId) return;

        if (confirmationState.action === 'confirm') {
            confirmPendingTrade(confirmationState.tradeId);
        } else if (confirmationState.action === 'delete') {
            deletePendingTrade(confirmationState.tradeId);
        } else if (confirmationState.action === 'restore') {
            restorePendingTrade(confirmationState.tradeId);
        }
        closeConfirmationModal();
    };
    
    const closeConfirmationModal = () => {
        setConfirmationState({ isOpen: false, action: null, tradeId: null, message: '' });
    };

    return (
        <>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap justify-between items-center gap-4">
                     <div className="flex items-center gap-4">
                         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">بيع وشراء غير مكتمل</h2>
                         <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                            <button 
                                onClick={() => setView('pending')} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'pending' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                            >
                               <Package className="w-4 h-4 inline-block me-2"/> المعلقة
                            </button>
                            <button 
                                onClick={() => setView('deleted')} 
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'deleted' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                            >
                              <PackageOpen className="w-4 h-4 inline-block me-2"/> المحذوفات
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                     <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">تاريخ الإنشاء</th>
                                <th className="px-6 py-3">الوصف</th>
                                <th className="px-6 py-3">إجراء</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tradesToDisplay.map(trade => (
                                <tr key={trade.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5">
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(trade.createdAt)}</td>
                                    <td className="px-6 py-4">{trade.description}</td>
                                    <td className="px-6 py-4 flex gap-3">
                                        {view === 'pending' ? (
                                            <>
                                                {hasPermission('incompleteTrades', 'confirm') && <button onClick={() => handleConfirm(trade.id)} className="p-2 text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" title="تأكيد المعاملة"><Check size={18} /></button>}
                                                {hasPermission('incompleteTrades', 'edit') && <button onClick={() => handleEdit(trade)} className="p-2 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" title="تعديل المعاملة"><Edit size={18} /></button>}
                                                {hasPermission('incompleteTrades', 'delete') && <button onClick={() => handleDelete(trade.id)} className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" title="حذف المعاملة"><Trash2 size={18} /></button>}
                                            </>
                                        ) : (
                                            hasPermission('incompleteTrades', 'delete') && <button onClick={() => handleRestore(trade.id)} className="p-2 text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" title="استعادة المعاملة"><RefreshCcw size={18} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {tradesToDisplay.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <p>{view === 'pending' ? 'لا توجد معاملات معلقة حالياً.' : 'قائمة المحذوفات فارغة.'}</p>
                        </div>
                     )}
                </div>
            </div>
            {isEditModalOpen && (
                 <DailyTransactionsModal 
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingTrade(null);
                    }}
                    tradeToEdit={editingTrade}
                />
            )}
            <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={onConfirmAction}
                title={`تأكيد ${confirmationState.action === 'confirm' ? 'التنفيذ' : confirmationState.action === 'delete' ? 'الحذف' : 'الاستعادة'}`}
                message={confirmationState.message}
                confirmButtonVariant={confirmationState.action === 'delete' ? 'danger' : 'primary'}
                confirmText={confirmationState.action === 'confirm' ? 'تأكيد' : confirmationState.action === 'delete' ? 'حذف' : 'استعادة'}
            />
        </>
    );
};

export default IncompleteTrades;