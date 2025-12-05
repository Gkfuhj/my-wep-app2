import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { DatabaseZap, AlertTriangle } from 'lucide-react';

const DATA_KEYS = [
    'assets', 'banks', 'transactions', 'customers', 'receivables',
    'posTransactions', 'dollarCardPurchases', 'operatingCosts',
    'expenseTypes', 'users', 'dailyOpeningBalancesHistory', 'telegramSettings'
];

const KEY_LABELS: Record<string, string> = {
    assets: 'بيانات الأصول (assets)',
    banks: 'بيانات المصارف (banks)',
    transactions: 'بيانات المعاملات (transactions)',
    customers: 'بيانات الزبائن والديون (customers)',
    receivables: 'بيانات المستحقات (receivables)',
    posTransactions: 'بيانات معاملات POS (posTransactions)',
    dollarCardPurchases: 'بيانات بطاقات الدولار (dollarCardPurchases)',
    operatingCosts: 'بيانات التكاليف التشغيلية (operatingCosts)',
    expenseTypes: 'أنواع التكاليف التشغيلية (expenseTypes)',
    users: 'بيانات المستخدمين (users)',
    dailyOpeningBalancesHistory: 'سجل الإغلاق اليومي (dailyOpeningBalancesHistory)',
    telegramSettings: 'إعدادات تليجرام (telegramSettings)'
};

const DataMigrationPage: React.FC = () => {
    const { migrateData } = useAppContext();
    const [data, setData] = useState<Record<string, string>>({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const handleInputChange = (key: string, value: string) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = () => {
        const nonEmptyData: Record<string, string> = {};
        for (const key in data) {
            if (data[key].trim() !== '') {
                nonEmptyData[key] = data[key];
            }
        }

        if (Object.keys(nonEmptyData).length === 0) {
            alert('يرجى لصق بيانات واحدة على الأقل.');
            return;
        }
        
        try {
            migrateData(nonEmptyData);
            alert('تم ترحيل البيانات بنجاح! سيتم إعادة تحميل الصفحة.');
            window.location.reload();
        } catch (error: any) {
            alert(`فشل الترحيل: ${error.message}`);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-4">
                    <DatabaseZap className="w-8 h-8 text-primary dark:text-gold" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">ترحيل البيانات من إصدار قديم</h2>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-500/30 rounded-lg text-sm text-red-800 dark:text-red-300 flex items-start gap-3">
                    <AlertTriangle className="w-10 h-10 flex-shrink-0 text-red-500" />
                    <div>
                        <h4 className="font-bold">تحذير خطير!</h4>
                        <p>استخدام هذه الصفحة سيؤدي إلى الكتابة فوق البيانات الحالية بالبيانات التي تلصقها. هذه العملية لا يمكن التراجع عنها. استخدمها فقط إذا كنت متأكداً تماماً من أنك تريد استبدال بياناتك الحالية بالكامل. يُنصح بأخذ نسخة احتياطية من بياناتك الحالية قبل المتابعة.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {DATA_KEYS.map(key => (
                        <div key={key}>
                            <label htmlFor={key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {KEY_LABELS[key] || key}
                            </label>
                            <textarea
                                id={key}
                                value={data[key] || ''}
                                onChange={e => handleInputChange(key, e.target.value)}
                                rows={6}
                                placeholder={`الصق محتوى المفتاح '${key}' هنا...`}
                                className="w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-200 focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold font-mono text-xs"
                            />
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
                    <button
                        onClick={() => setIsConfirmModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                    >
                        <DatabaseZap size={18} />
                        بدء عملية الترحيل (لا يمكن التراجع عنها)
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleSubmit}
                title="تأكيد عملية الترحيل"
                message="هل أنت متأكد تماماً من أنك تريد استبدال البيانات الحالية؟ هذا الإجراء نهائي ولا يمكن التراجع عنه."
                confirmText="نعم، أنا متأكد"
                confirmButtonVariant="danger"
            />
        </>
    );
};

export default DataMigrationPage;