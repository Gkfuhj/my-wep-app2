
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { OperatingCost, ExpenseType, Bank, Currency, ASSET_NAMES, LYD_CASH_ASSET_IDS } from '../types';
import Modal from '../components/Modal';
import { formatCurrency, formatDate, formatNumber } from '../lib/utils';
import { Plus, Edit, Trash2, Settings, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmationModal from '../components/ConfirmationModal';

const loadAmiriFont = async (doc: jsPDF) => {
    try {
        const response = await fetch('/fonts/Amiri-Regular.ttf');
        if (!response.ok) {
            throw new Error(`Font file not found at /fonts/Amiri-Regular.ttf (status: ${response.status})`);
        }
        const fontBlob = await response.blob();
        
        const reader = new FileReader();
        const fontBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(fontBlob);
        });

        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'bold');
        doc.setFont('Amiri', 'normal');
    } catch (error) {
        console.error("Failed to load and register custom font. PDF will use default fonts.", error);
    }
};

// Padding hack function to prevent truncation
const fixArabic = (str: string) => {
    if (!str) return '';
    return `  ${str}  `;
};

// PDF Generation function
const generateOperatingCostsPDF = async (costs: OperatingCost[], title: string) => {
    const doc = new jsPDF();
    await loadAmiriFont(doc);
    
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(18);
    doc.text(fixArabic(title), pageWidth - 15, 15, { align: 'right' });
    
    // Columns in RTL order: Date (Rightmost visually? No, usually Rightmost is first column in RTL table). 
    // In standard autoTable with halign: right, the first column in the array is the leftmost column. 
    // To make it look like RTL (First column on Right), we need to reverse the order of data and headers.
    
    const tableColumn = ["التاريخ", "النوع", "المصدر", "المبلغ", "ملاحظات"];
    const tableRows: (string | number)[][] = [];

    costs.forEach(cost => {
        const costData = [
            fixArabic(formatDate(cost.date)),
            fixArabic(cost.expenseTypeName),
            fixArabic(cost.sourceName),
            formatNumber(cost.amount) + ' LYD',
            fixArabic(cost.note || '-'),
        ];
        tableRows.push(costData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { font: 'Amiri', halign: 'right' },
        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'normal', halign: 'right' },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`${title.replace(/ /g, '_')}_report.pdf`);
};


const OperatingCosts: React.FC = () => {
    const { 
        operatingCosts, 
        addOperatingCost, 
        updateOperatingCost, 
        deleteOperatingCost, 
        expenseTypes, 
        addExpenseType, 
        deleteExpenseType, 
        banks,
        hasPermission
    } = useAppContext();

    // Modals state
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<OperatingCost | null>(null);
    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        action: 'deleteCost' | 'deleteType' | null;
        itemId: string | null;
        message: string;
        isSilentDelete?: boolean;
    }>({ isOpen: false, action: null, itemId: null, message: '' });


    // Form state for OperatingCost
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState<string>(LYD_CASH_ASSET_IDS[0]);
    const [isExternalSource, setIsExternalSource] = useState(false);
    const [expenseTypeId, setExpenseTypeId] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));

    // Form state for ExpenseType
    const [newExpenseTypeName, setNewExpenseTypeName] = useState('');

    // Filters state
    const [filterStartDate, setFilterStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // Default to start of current month
        return d.toLocaleDateString('en-CA');
    });
    const [filterEndDate, setFilterEndDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [filterType, setFilterType] = useState('');
    const [filterSource, setFilterSource] = useState('');
    
    const inputClasses = "w-full bg-white dark:bg-dark-card p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";
    const modalInputClasses = "mt-1 w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";
    const checkboxClasses = "h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded focus:ring-primary dark:focus:ring-gold";


    useEffect(() => {
        if(expenseTypes.length > 0 && !expenseTypeId) {
            setExpenseTypeId(expenseTypes[0].id);
        }
    }, [expenseTypes, expenseTypeId]);
    
    const filteredCosts = useMemo(() => {
        return operatingCosts
            .filter(cost => {
                const costDate = new Date(cost.date);
                costDate.setHours(0, 0, 0, 0);
                
                const start = filterStartDate ? new Date(filterStartDate) : null;
                if (start) start.setHours(0, 0, 0, 0);
                
                const end = filterEndDate ? new Date(filterEndDate) : null;
                if (end) end.setHours(23, 59, 59, 999);

                const dateMatch = (!start || costDate >= start) && (!end || costDate <= end);
                const typeMatch = filterType ? cost.expenseTypeId === filterType : true;
                const sourceMatch = filterSource ? (LYD_CASH_ASSET_IDS.includes(cost.source as any) && LYD_CASH_ASSET_IDS.includes(filterSource as any) ? true : cost.source === filterSource) : true;

                if (filterSource && LYD_CASH_ASSET_IDS.includes(filterSource as any) && !LYD_CASH_ASSET_IDS.includes(cost.source as any)) {
                    return false;
                }
                
                return dateMatch && typeMatch && sourceMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [operatingCosts, filterStartDate, filterEndDate, filterType, filterSource]);

    const resetCostForm = () => {
        setEditingCost(null);
        setAmount('');
        setSource(LYD_CASH_ASSET_IDS[0]);
        setIsExternalSource(false);
        if(expenseTypes.length > 0) setExpenseTypeId(expenseTypes[0].id);
        setNote('');
        setDate(new Date().toLocaleDateString('en-CA'));
    };

    const openNewCostModal = () => {
        resetCostForm();
        setIsCostModalOpen(true);
    };

    const openEditCostModal = (cost: OperatingCost) => {
        setEditingCost(cost);
        setAmount(String(cost.amount));
        if (cost.source === 'external') {
            setIsExternalSource(true);
            setSource(LYD_CASH_ASSET_IDS[0]); // fallback if unchecked
        } else {
            setIsExternalSource(false);
            setSource(cost.source);
        }
        setExpenseTypeId(cost.expenseTypeId);
        setNote(cost.note || '');
        setDate(new Date(cost.date).toLocaleDateString('en-CA'));
        setIsCostModalOpen(true);
    };

    const handleCostSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0 || !expenseTypeId || !date) return;
        
        const finalSource = isExternalSource ? 'external' : source;
        const costData = { amount: numAmount, source: finalSource, expenseTypeId, note, date };

        if (editingCost) {
            updateOperatingCost(editingCost.id, costData);
        } else {
            addOperatingCost(costData);
        }
        
        setIsCostModalOpen(false);
    };
    
    const handleDeleteCost = (costId: string) => {
        const cost = operatingCosts.find(c => c.id === costId);
        if (!cost) return;

        setConfirmationState({
            isOpen: true,
            action: 'deleteCost',
            itemId: costId,
            message: cost.source === 'external' 
                ? 'هل أنت متأكد من حذف هذا المصروف الخارجي؟ (لن يؤثر الحذف على أرصدة الخزنة)' 
                : 'هل أنت متأكد من إلغاء هذا المصروف؟ سيتم إعادة المبلغ إلى الخزنة/المصرف.',
            isSilentDelete: true, // Default to true for all operating costs as requested
        });
    };

    const handleTypeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newExpenseTypeName.trim()) {
            addExpenseType(newExpenseTypeName.trim());
            setNewExpenseTypeName('');
        }
    };
    
    const handleDeleteType = (typeId: string) => {
        const isInUse = operatingCosts.some(cost => cost.expenseTypeId === typeId);
        if (isInUse) {
            alert('لا يمكن حذف هذا النوع لأنه مستخدم في معاملات حالية.');
            return;
        }
        setConfirmationState({
            isOpen: true,
            action: 'deleteType',
            itemId: typeId,
            message: 'هل أنت متأكد من حذف هذا النوع؟',
        });
    };

    const onConfirmAction = () => {
        if (confirmationState.action === 'deleteCost' && confirmationState.itemId) {
            deleteOperatingCost(confirmationState.itemId, confirmationState.isSilentDelete);
        } else if (confirmationState.action === 'deleteType' && confirmationState.itemId) {
            deleteExpenseType(confirmationState.itemId);
        }
        closeConfirmationModal();
    };

    const closeConfirmationModal = () => {
        setConfirmationState({ isOpen: false, action: null, itemId: null, message: '' });
    };

    const totalFilteredCosts = useMemo(() => filteredCosts.reduce((sum, cost) => sum + cost.amount, 0), [filteredCosts]);

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">إدارة التكاليف التشغيلية</h2>
                <div className="flex gap-2">
                    {hasPermission('operatingCosts', 'manageTypes') && (
                        <button onClick={() => setIsTypesModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
                            <Settings size={18} /> <span>إدارة الأنواع</span>
                        </button>
                    )}
                    {hasPermission('operatingCosts', 'add') && (
                        <button onClick={openNewCostModal} className="flex items-center gap-2 px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-opacity">
                            <Plus size={18} /> <span>مصروف جديد</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-lg items-end">
                <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                    <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className={inputClasses}/>
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                    <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={inputClasses}/>
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className={inputClasses}>
                        <option value="">كل الأنواع</option>
                        {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">المصدر</label>
                    <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={inputClasses}>
                        <option value="">كل المصادر</option>
                        <option value="external">خارج الخزنة</option>
                        <optgroup label="الخزائن النقدية">
                            {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                        </optgroup>
                        <optgroup label="المصارف">
                             {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </optgroup>
                    </select>
                </div>
                <div className="md:col-span-1">
                    <button onClick={async () => await generateOperatingCostsPDF(filteredCosts, 'تقرير التكاليف التشغيلية')} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Printer size={18}/> <span>طباعة</span>
                    </button>
                </div>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">المصدر</th>
                            <th className="px-6 py-3">المبلغ</th>
                            <th className="px-6 py-3">ملاحظات</th>
                            <th className="px-6 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCosts.map(cost => (
                            <tr key={cost.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="px-6 py-4">{formatDate(cost.date)}</td>
                                <td className="px-6 py-4">{cost.expenseTypeName}</td>
                                <td className="px-6 py-4 text-primary-dark dark:text-gold-light">{cost.sourceName}</td>
                                <td className="px-6 py-4 font-semibold text-red-500 dark:text-red-400 font-mono">{formatCurrency(cost.amount, Currency.LYD)}</td>
                                <td className="px-6 py-4">{cost.note || '-'}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    {hasPermission('operatingCosts', 'edit') && <button onClick={() => openEditCostModal(cost)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"><Edit size={18} /></button>}
                                    {hasPermission('operatingCosts', 'delete') && <button onClick={() => handleDeleteCost(cost.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"><Trash2 size={18} /></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold bg-gray-50 dark:bg-black/20 text-gray-800 dark:text-gray-200">
                            <td colSpan={3} className="px-6 py-3 text-left">الإجمالي</td>
                            <td className="px-6 py-3 text-red-600 dark:text-red-400 font-mono">{formatCurrency(totalFilteredCosts, Currency.LYD)}</td>
                            <td colSpan={2}></td>
                        </tr>
                    </tfoot>
                </table>
                {filteredCosts.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد تكاليف مسجلة تطابق الفلتر.</p>}
            </div>

            {/* Cost Modal */}
            <Modal isOpen={isCostModalOpen} onClose={() => setIsCostModalOpen(false)} title={editingCost ? 'تعديل مصروف' : 'إضافة مصروف جديد'}>
                <form onSubmit={handleCostSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ (LYD)</label>
                        <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={modalInputClasses}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المصدر</label>
                            <div className="mt-2 flex items-center mb-2">
                                <input 
                                    id="isExternalSource" 
                                    type="checkbox" 
                                    checked={isExternalSource} 
                                    onChange={e => setIsExternalSource(e.target.checked)} 
                                    className={checkboxClasses}
                                />
                                <label htmlFor="isExternalSource" className="ms-2 text-sm text-gray-700 dark:text-gray-300">مصرف خارجي (خارج الخزنة)</label>
                            </div>
                            
                            {!isExternalSource && (
                                <select value={source} onChange={e => setSource(e.target.value)} className={modalInputClasses}>
                                    <optgroup label="الخزائن النقدية">
                                        {LYD_CASH_ASSET_IDS.map(id => <option key={id} value={id}>{ASSET_NAMES[id]}</option>)}
                                    </optgroup>
                                    <optgroup label="المصارف">
                                        {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </optgroup>
                                </select>
                            )}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع المصروف</label>
                            <select value={expenseTypeId} onChange={e => setExpenseTypeId(e.target.value)} required className={modalInputClasses}>
                                <option value="" disabled>-- اختر نوع --</option>
                                {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={modalInputClasses}/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظة (اختياري)</label>
                        <input type="text" value={note} onChange={e => setNote(e.target.value)} className={modalInputClasses}/>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsCostModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">{editingCost ? 'حفظ التعديلات' : 'إضافة المصروف'}</button>
                    </div>
                </form>
            </Modal>
            
            {/* Types Modal */}
             <Modal isOpen={isTypesModalOpen} onClose={() => setIsTypesModalOpen(false)} title="إدارة أنواع المصاريف">
                 <form onSubmit={handleTypeSubmit} className="flex gap-2 mb-4">
                    <input type="text" value={newExpenseTypeName} onChange={e => setNewExpenseTypeName(e.target.value)} placeholder="إضافة نوع جديد..." required className="flex-grow bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold"/>
                    <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-md hover:bg-primary-dark dark:hover:opacity-90">إضافة</button>
                 </form>
                 <div className="max-h-60 overflow-y-auto space-y-2">
                     {expenseTypes.map(type => (
                         <div key={type.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-dark-bg rounded-md">
                             <span className="text-gray-700 dark:text-gray-300">{type.name}</span>
                             <button onClick={() => handleDeleteType(type.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"><Trash2 size={16}/></button>
                         </div>
                     ))}
                 </div>
             </Modal>

             <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={onConfirmAction}
                title="تأكيد الحذف"
                message={confirmationState.message}
                confirmText="حذف"
                confirmButtonVariant="danger"
            >
                {confirmationState.action === 'deleteCost' && (
                    <div className="relative flex items-start mt-4">
                        <div className="flex items-center h-5">
                            <input
                                id="silentDelete"
                                type="checkbox"
                                checked={confirmationState.isSilentDelete}
                                onChange={e => setConfirmationState(prev => ({ ...prev, isSilentDelete: e.target.checked }))}
                                className="focus:ring-primary dark:focus:ring-gold h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded"
                            />
                        </div>
                        <div className="ms-3 text-sm text-left">
                            <label htmlFor="silentDelete" className="font-medium text-gray-700 dark:text-gray-300">
                                حذف صامت
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                لن يتم إنشاء قيد عكسي ظاهر في سجل الحركات.
                            </p>
                        </div>
                    </div>
                )}
            </ConfirmationModal>
        </div>
    );
}

export default OperatingCosts;
