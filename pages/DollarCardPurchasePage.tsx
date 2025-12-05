
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DollarCardPurchase, DollarCardPayment, ASSET_NAMES, Currency, LYD_CASH_ASSET_IDS } from '../types';
import Modal from '../components/Modal';
import { Plus, Edit, Trash2, CheckCircle, DollarSign, Landmark, Info, User, Shield, Phone, FileText, Archive, RefreshCcw, Contact, Search, Send, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';

const DollarCardPurchasePage: React.FC = () => {
    const { dollarCardPurchases, addDollarCardPurchase, updateDollarCardCustomerInfo, addPaymentToDollarCardPurchase, updateDollarCardPayment, deletePaymentFromDollarCardPurchase, completeDollarCardPurchase, deleteDollarCardPurchase, archiveDollarCardPurchase, restoreDollarCardPurchase, banks, hasPermission, sendDollarCardReportToTelegram } = useAppContext();
    const navigate = useNavigate();

    const [view, setView] = useState<'active' | 'trash'>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPurchases, setExpandedPurchases] = useState<Record<string, boolean>>({});
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [isPaymentDeleteModalOpen, setIsPaymentDeleteModalOpen] = useState(false);
    
    const [editingPurchase, setEditingPurchase] = useState<DollarCardPurchase | null>(null);
    const [editingPayment, setEditingPayment] = useState<DollarCardPayment | null>(null);
    const [paymentToDeleteInfo, setPaymentToDeleteInfo] = useState<{ purchaseId: string; paymentId: string } | null>(null);

    const [telegramStatus, setTelegramStatus] = useState<Record<string, 'sending' | 'success' | 'error' | null>>({});
    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        action: 'deletePurchase' | null;
        purchaseId: string | null;
        message: string;
    }>({ isOpen: false, action: null, purchaseId: null, message: '' });


    // Form state
    const [customerName, setCustomerName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [phone, setPhone] = useState('');
    const [passportNumber, setPassportNumber] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [iban, setIban] = useState('');
    const [skipData, setSkipData] = useState(false);

    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentSource, setPaymentSource] = useState<string>(LYD_CASH_ASSET_IDS[0]);
    const [paymentNote, setPaymentNote] = useState('');
    const [newPaymentAmount, setNewPaymentAmount] = useState('');
    const [isExternalPayment, setIsExternalPayment] = useState(false);

    const [receivedUsd, setReceivedUsd] = useState('');
    const [usdDestination, setUsdDestination] = useState<'cashUsdLibya' | 'cashUsdTurkey'>('cashUsdLibya');
    
    const filterPurchases = (purchases: DollarCardPurchase[]) => {
        if (!searchTerm) return purchases;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return purchases.filter(p => 
            p.customerName.toLowerCase().includes(lowerCaseSearchTerm) ||
            (p.nationalId || '').includes(lowerCaseSearchTerm) ||
            (p.accountNumber || '').includes(lowerCaseSearchTerm) ||
            (p.contactInfo || '').includes(lowerCaseSearchTerm)
        );
    };
    
    const activePurchases = useMemo(() => 
        filterPurchases(dollarCardPurchases.filter(p => p.status === 'active' && !p.isArchived))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
        [dollarCardPurchases, searchTerm]
    );
    
    const trashedPurchases = useMemo(() => 
        filterPurchases(dollarCardPurchases.filter(p => p.status === 'active' && p.isArchived))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
        [dollarCardPurchases, searchTerm]
    );

    const purchasesToRender = view === 'active' ? activePurchases : trashedPurchases;

    const lydSources = useMemo(() => {
        const cash = LYD_CASH_ASSET_IDS.map(id => ({ value: id, label: ASSET_NAMES[id] }));
        const allBanks = banks.map(b => ({ value: b.id, label: b.name }));
        return { cash, banks: allBanks };
    }, [banks]);


    const togglePurchaseExpansion = (id: string) => {
        setExpandedPurchases(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openNewCustomerModal = () => {
        setEditingPurchase(null);
        setCustomerName('');
        setNationalId('');
        setPhone('');
        setPassportNumber('');
        setContactInfo('');
        setAccountNumber('');
        setIban('');
        setSkipData(false);
        setIsCustomerModalOpen(true);
    };

    const openEditCustomerModal = (purchase: DollarCardPurchase) => {
        setEditingPurchase(purchase);
        setCustomerName(purchase.customerName);
        setNationalId(purchase.nationalId || '');
        setPhone(purchase.phone || '');
        setPassportNumber(purchase.passportNumber || '');
        setContactInfo(purchase.contactInfo || '');
        setAccountNumber(purchase.accountNumber || '');
        setIban(purchase.iban || '');
        setSkipData(false);
        setIsCustomerModalOpen(true);
    };

    const openPaymentModal = (purchase: DollarCardPurchase) => {
        setEditingPurchase(purchase);
        setPaymentAmount('');
        setPaymentNote('');
        setPaymentSource(LYD_CASH_ASSET_IDS[0]);
        setIsExternalPayment(false);
        setIsPaymentModalOpen(true);
    };

    const openEditPaymentModal = (purchase: DollarCardPurchase, payment: DollarCardPayment) => {
        setEditingPurchase(purchase);
        setEditingPayment(payment);
        setNewPaymentAmount(String(payment.amount));
        setIsEditPaymentModalOpen(true);
    };

    const openCompleteModal = (purchase: DollarCardPurchase) => {
        setEditingPurchase(purchase);
        setReceivedUsd('');
        setUsdDestination('cashUsdLibya');
        setIsCompleteModalOpen(true);
    };
    
    const handleCustomerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const customerInfo = { customerName, nationalId, phone, passportNumber, contactInfo, accountNumber, iban };

        if (!skipData) { // Validate only if not skipping
            if (!customerName) { alert("اسم الزبون مطلوب."); return; }
            if (nationalId && !/^\d{12}$/.test(nationalId)) { alert("الرقم الوطني يجب أن يتكون من 12 رقمًا بالضبط."); return; }
        } else if (!customerName) {
            alert("اسم الزبون مطلوب.");
            return;
        }

        if (editingPurchase) {
            updateDollarCardCustomerInfo(editingPurchase.id, customerInfo);
        } else {
            addDollarCardPurchase(customerInfo);
        }
        setIsCustomerModalOpen(false);
    };

    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPurchase || !paymentAmount) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return;

        addPaymentToDollarCardPurchase(editingPurchase.id, { 
            amount, 
            source: isExternalPayment ? 'external' : paymentSource, 
            note: paymentNote,
            isExternal: isExternalPayment 
        });
        setIsPaymentModalOpen(false);
    };
    
    const handleEditPaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPurchase || !editingPayment || !newPaymentAmount) return;
        const amount = parseFloat(newPaymentAmount);
        if (isNaN(amount) || amount < 0) return;

        updateDollarCardPayment(editingPurchase.id, editingPayment.id, amount);
        setIsEditPaymentModalOpen(false);
    };

    const handleCompleteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPurchase || !receivedUsd) return;
        const amount = parseFloat(receivedUsd);
        if (isNaN(amount) || amount <= 0) return;

        completeDollarCardPurchase(editingPurchase.id, { receivedUsdAmount: amount, usdDestinationAsset: usdDestination });
        setIsCompleteModalOpen(false);
        navigate('/dollar-card-history');
    };
    
    const openDeletePaymentModal = (purchaseId: string, paymentId: string) => {
        setPaymentToDeleteInfo({ purchaseId, paymentId });
        setIsPaymentDeleteModalOpen(true);
    };
    
    const handleDeletePurchasePermanently = (purchaseId: string) => {
         setConfirmationState({
            isOpen: true,
            action: 'deletePurchase',
            purchaseId,
            message: 'هل أنت متأكد من الحذف النهائي لهذه العملية؟ لا يمكن التراجع عن هذا الإجراء وسيتم عكس جميع الحركات المالية.',
        });
    }

    const onConfirmAction = () => {
        if (confirmationState.action === 'deletePurchase' && confirmationState.purchaseId) {
            deleteDollarCardPurchase(confirmationState.purchaseId);
        }
        closeConfirmationModal();
    };
    
    const closeConfirmationModal = () => {
        setConfirmationState({ isOpen: false, action: null, purchaseId: null, message: '' });
    };

    const handleSendTelegramReport = async (purchaseId: string) => {
        setTelegramStatus(prev => ({...prev, [purchaseId]: 'sending' }));
        const success = await sendDollarCardReportToTelegram(purchaseId);
        setTelegramStatus(prev => ({...prev, [purchaseId]: success ? 'success' : 'error' }));
        setTimeout(() => setTelegramStatus(prev => ({...prev, [purchaseId]: null })), 3000);
    };


    const totalPaid = useMemo(() => {
        if (!editingPurchase) return 0;
        return editingPurchase.payments.reduce((sum, p) => sum + p.amount, 0);
    }, [editingPurchase]);

    const finalCostPerDollar = useMemo(() => {
        const usd = parseFloat(receivedUsd);
        if (!usd || usd === 0 || totalPaid === 0) return 0;
        return totalPaid / usd;
    }, [receivedUsd, totalPaid]);
    
    const modalInputClasses = "mt-1 w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                     <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">شراء بطاقات الدولار</h2>
                     <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                        <button 
                            onClick={() => setView('active')} 
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'active' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                            العمليات النشطة
                        </button>
                        <button 
                            onClick={() => setView('trash')} 
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'trash' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                        >
                            المهملات
                        </button>
                    </div>
                </div>
                <div className='flex gap-4 items-center'>
                    <div className="relative">
                        <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-dark-bg p-2 ps-10 rounded-lg border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold"
                        />
                    </div>
                    {hasPermission('dollarCards', 'add') && (
                        <button onClick={openNewCustomerModal} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">
                            <Plus size={18} /> بدء عملية شراء
                        </button>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {purchasesToRender.map(purchase => {
                    const totalPayments = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
                    const currentTelegramStatus = telegramStatus[purchase.id];
                    const isExpanded = expandedPurchases[purchase.id];

                    return (
                    <div key={purchase.id} className={`bg-white dark:bg-dark-card rounded-xl shadow-lg flex flex-col space-y-4 border border-gray-200 dark:border-dark-border transition-all duration-300 ${purchase.isArchived ? 'opacity-60' : ''}`}>
                        <div className="p-5" onClick={() => togglePurchaseExpansion(purchase.id)}>
                            <div className="flex justify-between items-start cursor-pointer">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{purchase.customerName}</h3>
                                    <p className="text-xs text-gray-500">{formatDate(purchase.createdAt)}</p>
                                </div>
                                <div className='flex items-center'>
                                     <p className="text-sm text-blue-800 dark:text-blue-300 me-3">
                                        <span className="font-bold font-mono">{formatCurrency(totalPayments, Currency.LYD)}</span>
                                     </p>
                                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-gold">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {isExpanded && (
                            <div className="px-5 pb-5 space-y-4 border-t border-gray-200 dark:border-dark-border animate-fade-in">
                                <div className="text-sm space-y-1 text-gray-500 dark:text-gray-400 pt-4">
                                   {purchase.nationalId && <p><Info size={14} className="inline me-2"/>الرقم الوطني: <span className="font-mono">{purchase.nationalId}</span></p>}
                                   {purchase.phone && <p><Phone size={14} className="inline me-2"/>الهاتف: <span className="font-mono">{purchase.phone}</span></p>}
                                   {purchase.passportNumber && <p><FileText size={14} className="inline me-2"/>جواز السفر: <span className="font-mono">{purchase.passportNumber}</span></p>}
                                   {purchase.contactInfo && <p><Contact size={14} className="inline me-2"/>تواصل: <span className="font-mono">{purchase.contactInfo}</span></p>}
                                   {purchase.accountNumber && <p><Landmark size={14} className="inline me-2"/>رقم الحساب: <span className="font-mono">{purchase.accountNumber}</span></p>}
                                   {purchase.iban && <p><Shield size={14} className="inline me-2"/>ايبان: <span className="font-mono">{purchase.iban}</span></p>}
                                </div>

                                <div className="flex-grow space-y-2 pt-3 border-t border-gray-200 dark:border-dark-border">
                                     <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">الدفعات:</h4>
                                     <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {purchase.payments.map(payment => (
                                            <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-dark-bg rounded-md">
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200 font-mono">{formatCurrency(payment.amount, Currency.LYD)}</p>
                                                    <p className="text-xs text-gray-500">{payment.sourceName} - {payment.note || 'دفعة'}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {view === 'active' && hasPermission('dollarCards', 'editPayment') && <button onClick={() => openEditPaymentModal(purchase, payment)} title="تعديل الدفعة"><Edit size={14} className="text-blue-500 dark:text-blue-400"/></button>}
                                                    {view === 'active' && hasPermission('dollarCards', 'deletePayment') && <button onClick={() => openDeletePaymentModal(purchase.id, payment.id)} title="حذف الدفعة"><Trash2 size={14} className="text-red-500 dark:text-red-400"/></button>}
                                                </div>
                                            </div>
                                        ))}
                                        {purchase.payments.length === 0 && <p className="text-center text-xs text-gray-500 py-2">لم تسجل أي دفعات</p>}
                                     </div>
                                </div>
                                
                                <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/50 rounded-md border border-blue-200 dark:border-blue-500/20">
                                    <span className="text-sm text-blue-800 dark:text-blue-300">إجمالي المدفوع: </span>
                                    <span className="font-bold text-blue-800 dark:text-blue-300 font-mono">{formatCurrency(totalPayments, Currency.LYD)}</span>
                                </div>
                                
                                {view === 'active' && (
                                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-dark-border">
                                        {hasPermission('dollarCards', 'addPayment') && <button onClick={() => openPaymentModal(purchase)} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-600 dark:bg-gray-700 text-white dark:text-gray-200 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600">
                                            <DollarSign size={16} /> إضافة دفعة
                                        </button>}
                                         {hasPermission('dollarCards', 'complete') && <button onClick={() => openCompleteModal(purchase)} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
                                            <CheckCircle size={16} /> تمت العملية بنجاح
                                        </button>}
                                    </div>
                                )}
                                <div className="flex justify-start items-center gap-2 pt-3 border-t border-gray-200 dark:border-dark-border">
                                    {view === 'active' ? (
                                        <>
                                            {hasPermission('dollarCards', 'reportToTelegram') && 
                                            <button onClick={() => handleSendTelegramReport(purchase.id)} className={`p-1.5 text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 disabled:opacity-50 ${currentTelegramStatus === 'success' && 'text-green-500'} ${currentTelegramStatus === 'error' && 'text-red-500'}`} title="إرسال تقرير للتيليجرام" disabled={currentTelegramStatus === 'sending'}>
                                                {currentTelegramStatus === 'sending' ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div> : <Send size={16} />}
                                            </button>}
                                            {hasPermission('dollarCards', 'edit') && <button onClick={() => openEditCustomerModal(purchase)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400" title="تعديل بيانات الزبون"><Edit size={16} /></button>}
                                            {hasPermission('dollarCards', 'archive') && <button onClick={() => archiveDollarCardPurchase(purchase.id)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400" title="نقل إلى المهملات"><Archive size={16} /></button>}
                                        </>
                                    ) : (
                                         <>
                                            {hasPermission('dollarCards', 'archive') && <button onClick={() => restoreDollarCardPurchase(purchase.id)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400" title="استعادة العملية"><RefreshCcw size={16} /></button>}
                                            {hasPermission('dollarCards', 'delete') && <button onClick={() => handleDeletePurchasePermanently(purchase.id)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title="حذف نهائي"><Trash2 size={16} /></button>}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )})}
                 {purchasesToRender.length === 0 && (
                    <div className="lg:col-span-3 text-center py-16 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-200 dark:border-dark-border">
                        <p className="text-gray-500">{view === 'active' ? 'لا توجد عمليات شراء نشطة حالياً.' : 'قائمة المهملات فارغة.'}</p>
                        {view === 'active' && <p className="text-sm text-gray-400 mt-2">انقر على "بدء عملية شراء" لبدء عملية جديدة.</p>}
                    </div>
                )}
            </div>

            {isCustomerModalOpen && <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title={editingPurchase ? 'تعديل بيانات الزبون' : 'إضافة زبون جديد'} className="w-[75%]">
                <form onSubmit={handleCustomerSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الزبون الكامل</label>
                        <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required className={modalInputClasses}/>
                    </div>
                    {!skipData && <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرقم الوطني</label>
                            <input type="text" inputMode="numeric" value={nationalId} onChange={e => setNationalId(e.target.value)} pattern="\d{12}" title="يجب إدخال 12 رقمًا" maxLength={12} className={modalInputClasses}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                            <input type="text" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} className={modalInputClasses}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم جواز السفر</label>
                            <input type="text" value={passportNumber} onChange={e => setPassportNumber(e.target.value)} maxLength={8} className={modalInputClasses}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تواصل</label>
                            <input type="text" inputMode="tel" value={contactInfo} onChange={e => setContactInfo(e.target.value)} maxLength={10} className={modalInputClasses}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الحساب (اختياري)</label>
                            <input type="text" inputMode="numeric" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={modalInputClasses}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ايبان (اختياري)</label>
                            <input type="text" value={iban} onChange={e => setIban(e.target.value)} className={modalInputClasses}/>
                        </div>
                    </>}
                     {!editingPurchase && <div className="flex items-center">
                        <input id="skip-data" type="checkbox" checked={skipData} onChange={e => setSkipData(e.target.checked)} className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold" />
                        <label htmlFor="skip-data" className="ms-2 block text-sm text-gray-900 dark:text-gray-300">تجاهل البيانات التفصيلية مؤقتاً</label>
                    </div>}

                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">{editingPurchase ? 'حفظ التعديلات' : 'بدء العملية'}</button>
                </form>
            </Modal>}
            
            {editingPurchase && isPaymentModalOpen && <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`إضافة دفعة لـ ${editingPurchase.customerName}`}>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مبلغ الدفعة (LYD)</label>
                        <input type="text" inputMode="decimal" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={modalInputClasses}/>
                    </div>
                    <div className="relative flex items-start">
                        <div className="flex items-center h-5">
                            <input 
                                id="isExternalPayment" 
                                type="checkbox" 
                                checked={isExternalPayment} 
                                onChange={e => setIsExternalPayment(e.target.checked)} 
                                className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold"
                            />
                        </div>
                        <div className="ms-3 text-sm">
                            <label htmlFor="isExternalPayment" className="font-medium text-gray-700 dark:text-gray-300">
                                دفعة خارج الخزنة
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">لن تؤثر هذه الدفعة على أرصدة الخزائن أو المصارف.</p>
                        </div>
                    </div>
                    <div style={{ opacity: isExternalPayment ? 0.5 : 1 }}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">مصدر المبلغ</label>
                        <select value={paymentSource} onChange={e => setPaymentSource(e.target.value)} className={modalInputClasses} disabled={isExternalPayment}>
                            <optgroup label="الخزائن النقدية">
                                {lydSources.cash.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </optgroup>
                            <optgroup label="المصارف">
                                {lydSources.banks.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظة (اختياري)</label>
                        <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className={modalInputClasses}/>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">إضافة الدفعة</button>
                    </div>
                </form>
            </Modal>}

            {editingPurchase && editingPayment && isEditPaymentModalOpen && <Modal isOpen={isEditPaymentModalOpen} onClose={() => setIsEditPaymentModalOpen(false)} title={`تعديل دفعة لـ ${editingPurchase.customerName}`}>
                <form onSubmit={handleEditPaymentSubmit} className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">المبلغ الحالي: <span className="font-bold font-mono">{formatCurrency(editingPayment.amount, Currency.LYD)}</span></p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ الجديد (LYD)</label>
                        <input type="text" inputMode="decimal" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value.replace(/[^0-9.]/g, ''))} required className={modalInputClasses}/>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsEditPaymentModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">حفظ التعديل</button>
                    </div>
                </form>
            </Modal>}
            
            {editingPurchase && isCompleteModalOpen && <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)} title={`إتمام عملية الشراء لـ ${editingPurchase.customerName}`}>
                <form onSubmit={handleCompleteSubmit} className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300">إجمالي المدفوع: <span className="font-bold font-mono">{formatCurrency(totalPaid, Currency.LYD)}</span></p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ المستلم (USD)</label>
                        <input type="text" inputMode="decimal" value={receivedUsd} onChange={e => setReceivedUsd(e.target.value.replace(/[^0-9.]/g, ''))} required className={modalInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">إيداع الدولار في</label>
                        <select value={usdDestination} onChange={e => setUsdDestination(e.target.value as 'cashUsdLibya' | 'cashUsdTurkey')} className={modalInputClasses}>
                            <option value="cashUsdLibya">{ASSET_NAMES.cashUsdLibya}</option>
                            <option value="cashUsdTurkey">{ASSET_NAMES.cashUsdTurkey}</option>
                        </select>
                    </div>
                    <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg border border-yellow-300 dark:border-yellow-500/30">
                        <p className="text-yellow-800 dark:text-yellow-300">الكلفة النهائية للدولار: <span className="font-bold font-mono">{finalCostPerDollar > 0 ? finalCostPerDollar.toFixed(3) : 'N/A'}</span></p>
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">إتمام وحفظ</button>
                    </div>
                </form>
            </Modal>}

            <ConfirmationModal
                isOpen={isPaymentDeleteModalOpen}
                onClose={() => setIsPaymentDeleteModalOpen(false)}
                onConfirm={() => {
                    if (paymentToDeleteInfo) {
                        deletePaymentFromDollarCardPurchase(paymentToDeleteInfo.purchaseId, paymentToDeleteInfo.paymentId, true);
                    }
                    setIsPaymentDeleteModalOpen(false);
                }}
                title="تأكيد حذف الدفعة"
                message="هل أنت متأكد من حذف هذه الدفعة؟ سيتم عكس قيمتها مالياً وحذفها من السجل بشكل صامت (لن يظهر قيد عكسي)."
                confirmText="نعم، حذف"
                confirmButtonVariant="danger"
            />

            <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={onConfirmAction}
                title={"تأكيد الحذف النهائي"}
                message={confirmationState.message}
                confirmText="حذف"
            >
            </ConfirmationModal>
        </div>
    );
};

export default DollarCardPurchasePage;
