import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DollarCardPurchase, Currency, ASSET_NAMES } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { Search, ChevronDown, ChevronUp, Edit, Send, Info, User, Shield, Phone, FileText, Contact, Landmark } from 'lucide-react';
import Modal from '../components/Modal';

const DollarCardHistoryPage: React.FC = () => {
    const { dollarCardPurchases, updateDollarCardCustomerInfo, hasPermission, sendDollarCardReportToTelegram } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<DollarCardPurchase | null>(null);
    const [telegramStatus, setTelegramStatus] = useState<Record<string, 'sending' | 'success' | 'error' | null>>({});

    // Form state for editing
    const [customerName, setCustomerName] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [phone, setPhone] = useState('');
    const [passportNumber, setPassportNumber] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [iban, setIban] = useState('');

    const allPurchases = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return dollarCardPurchases
            .filter(p => {
                if (!searchTerm) return true;
                return (
                    p.customerName.toLowerCase().includes(lowerCaseSearchTerm) ||
                    (p.nationalId || '').includes(searchTerm) ||
                    (p.phone || '').includes(searchTerm) ||
                    (p.passportNumber || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                    (p.contactInfo || '').toLowerCase().includes(lowerCaseSearchTerm) ||
                    (p.accountNumber || '').includes(searchTerm) ||
                    (p.iban || '').toLowerCase().includes(lowerCaseSearchTerm)
                );
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [dollarCardPurchases, searchTerm]);
    
    const toggleRowExpansion = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
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
        setIsCustomerModalOpen(true);
    };

    const handleCustomerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPurchase) return;
        
        const customerInfo = { customerName, nationalId, phone, passportNumber, contactInfo, accountNumber, iban };
        if (!customerName) { alert("اسم الزبون مطلوب."); return; }
        if (nationalId && !/^\d{12}$/.test(nationalId)) { alert("الرقم الوطني يجب أن يتكون من 12 رقمًا بالضبط."); return; }
       
        updateDollarCardCustomerInfo(editingPurchase.id, customerInfo);
        setIsCustomerModalOpen(false);
    };

    const handleSendTelegramReport = async (purchaseId: string) => {
        setTelegramStatus(prev => ({...prev, [purchaseId]: 'sending' }));
        const success = await sendDollarCardReportToTelegram(purchaseId);
        setTelegramStatus(prev => ({...prev, [purchaseId]: success ? 'success' : 'error' }));
        setTimeout(() => setTelegramStatus(prev => ({...prev, [purchaseId]: null })), 3000);
    };

    const modalInputClasses = "mt-1 w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">سجل بطاقات الدولار</h2>
                <div className="relative w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="ابحث بالاسم، رقم وطني، هاتف، ايبان..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-dark-card p-2 ps-10 rounded-lg border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold"
                    />
                    <Search className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3 text-gray-500 dark:text-gray-400" />
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-dark-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                            <tr>
                                <th className="p-4 w-12"></th>
                                <th className="p-4">تاريخ الإنشاء</th>
                                <th className="p-4">الزبون</th>
                                <th className="p-4">الحالة</th>
                                <th className="p-4">المبلغ المستلم (USD)</th>
                                <th className="p-4">إجمالي المدفوع (LYD)</th>
                                <th className="p-4">الكلفة النهائية للدولار</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allPurchases.length > 0 ? allPurchases.map(purchase => {
                                const totalPayments = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
                                const isCompleted = purchase.status === 'completed';
                                return (
                                <React.Fragment key={purchase.id}>
                                    <tr className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" onClick={() => toggleRowExpansion(purchase.id)}>
                                        <td className="p-4">
                                            <button className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-gold">
                                                {expandedRows[purchase.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">{formatDate(purchase.createdAt)}</td>
                                        <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{purchase.customerName}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${isCompleted ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'}`}>
                                                {isCompleted ? 'مكتملة' : 'نشطة'}
                                            </span>
                                        </td>
                                        <td className={`p-4 font-semibold font-mono ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                                            {isCompleted ? formatCurrency(purchase.completionDetails!.receivedUsdAmount, Currency.USD) : '-'}
                                        </td>
                                        <td className={`p-4 font-semibold font-mono ${isCompleted ? 'text-red-500 dark:text-red-400' : 'text-gray-500'}`}>
                                            {isCompleted ? formatCurrency(purchase.completionDetails!.totalLydPaid, Currency.LYD) : formatCurrency(totalPayments, Currency.LYD)}
                                        </td>
                                        <td className={`p-4 font-bold font-mono ${isCompleted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                                            {isCompleted ? purchase.completionDetails!.finalCostPerDollar.toFixed(3) : '-'}
                                        </td>
                                    </tr>
                                    {expandedRows[purchase.id] && (
                                        <tr className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                                            <td colSpan={7} className="p-4 animate-fade-in">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h4 className="font-bold mb-2 text-primary-dark dark:text-gold-light">بيانات الزبون</h4>
                                                        <div className="text-xs space-y-1">
                                                            <p><User size={12} className="inline me-1"/><b>الاسم:</b> <span className="font-mono">{purchase.customerName}</span></p>
                                                            <p><Info size={12} className="inline me-1"/><b>الرقم الوطني:</b> <span className="font-mono">{purchase.nationalId || 'N/A'}</span></p>
                                                            <p><Phone size={12} className="inline me-1"/><b>الهاتف:</b> <span className="font-mono">{purchase.phone || 'N/A'}</span></p>
                                                            <p><FileText size={12} className="inline me-1"/><b>جواز السفر:</b> <span className="font-mono">{purchase.passportNumber || 'N/A'}</span></p>
                                                            <p><Contact size={12} className="inline me-1"/><b>تواصل:</b> <span className="font-mono">{purchase.contactInfo || 'N/A'}</span></p>
                                                            <p><Landmark size={12} className="inline me-1"/><b>رقم الحساب:</b> <span className="font-mono">{purchase.accountNumber || 'N/A'}</span></p>
                                                            <p><Shield size={12} className="inline me-1"/><b>ايبان:</b> <span className="font-mono">{purchase.iban || 'N/A'}</span></p>
                                                             {isCompleted && <p><b>مكان إيداع الدولار:</b> <span className="font-mono">{ASSET_NAMES[purchase.completionDetails!.usdDestinationAsset]}</span></p>}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-dark-border">
                                                             {hasPermission('dollarCardHistory', 'reportToTelegram') && 
                                                                <button onClick={() => handleSendTelegramReport(purchase.id)} className={`p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 hover:text-cyan-500 dark:hover:text-cyan-400 disabled:opacity-50 ${telegramStatus[purchase.id] === 'success' && 'text-green-500'} ${telegramStatus[purchase.id] === 'error' && 'text-red-500'}`} title="إرسال تقرير للتيليجرام" disabled={telegramStatus[purchase.id] === 'sending'}>
                                                                    {telegramStatus[purchase.id] === 'sending' ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div> : <Send size={16} />}
                                                                </button>}
                                                             {hasPermission('dollarCardHistory', 'editCustomer') && 
                                                                <button onClick={() => openEditCustomerModal(purchase)} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-500 dark:hover:text-blue-400" title="تعديل بيانات الزبون"><Edit size={16} /></button>}
                                                        </div>
                                                    </div>
                                                     <div>
                                                         <h4 className="font-bold mb-2 text-primary-dark dark:text-gold-light">تفاصيل الدفعات</h4>
                                                         <div className="text-xs space-y-2 max-h-48 overflow-y-auto pr-2">
                                                             {purchase.payments.map(p => (
                                                                <div key={p.id} className="p-2 border-b border-gray-200 dark:border-dark-border last:border-b-0">
                                                                     <p><b>المبلغ:</b> <span className="font-mono">{formatCurrency(p.amount, Currency.LYD)}</span></p>
                                                                     <p><b>المصدر:</b> <span className="font-mono">{p.sourceName}</span></p>
                                                                     <p><b>ملاحظة:</b> <span className="font-mono">{p.note || 'N/A'}</span></p>
                                                                     <p><b>التاريخ:</b> <span className="font-mono">{formatDate(p.date)}</span></p>
                                                                </div>
                                                             ))}
                                                             {purchase.payments.length === 0 && <p className='text-center py-4'>لا توجد دفعات مسجلة.</p>}
                                                         </div>
                                                     </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )}) : (
                                <tr>
                                     <td colSpan={7}>
                                        <div className="text-center py-16">
                                            <p className="text-gray-500">لا توجد سجلات تطابق بحثك.</p>
                                            {searchTerm && <p className="text-sm text-gray-400 mt-2">جرب تعديل مصطلحات البحث.</p>}
                                        </div>
                                     </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

             {isCustomerModalOpen && <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="تعديل بيانات الزبون">
                <form onSubmit={handleCustomerSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الزبون الكامل</label>
                        <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} required className={modalInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الرقم الوطني</label>
                        <input type="text" value={nationalId} onChange={e => setNationalId(e.target.value)} pattern="\d{12}" title="يجب إدخال 12 رقمًا" maxLength={12} className={modalInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} className={modalInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم جواز السفر</label>
                        <input type="text" value={passportNumber} onChange={e => setPassportNumber(e.target.value)} maxLength={8} className={modalInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">تواصل</label>
                        <input type="text" value={contactInfo} onChange={e => setContactInfo(e.target.value)} maxLength={10} className={modalInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الحساب (اختياري)</label>
                        <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={modalInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ايبان (اختياري)</label>
                        <input type="text" value={iban} onChange={e => setIban(e.target.value)} className={modalInputClasses}/>
                    </div>
                    <button type="submit" className="w-full bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold py-2 rounded-md hover:bg-primary-dark dark:hover:opacity-90">حفظ التعديلات</button>
                </form>
            </Modal>}
        </div>
    );
};

export default DollarCardHistoryPage;