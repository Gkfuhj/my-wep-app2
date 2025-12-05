import React, { useState, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { Database, AlertTriangle, Download, Upload } from 'lucide-react';

const DataManagementPage: React.FC = () => {
    const { importData, exportData, hasPermission, uploadAllDataToSupabase } = useAppContext();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileContent, setFileContent] = useState<Record<string, any> | null>(null);

    const handleExport = () => {
        if (!hasPermission('dataManagement', 'export')) {
            alert('ليس لديك صلاحية لتصدير البيانات.');
            return;
        }
        try {
            const dataString = exportData();
            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().split('T')[0];
            a.download = `kayan_backup_${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert('فشل تصدير البيانات.');
        }
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result;
                    if (typeof content === 'string') {
                        const parsedData = JSON.parse(content);
                        setFileContent(parsedData);
                        setIsConfirmModalOpen(true);
                    }
                } catch (err) {
                    alert('الملف غير صالح أو ليس بصيغة JSON.');
                    setFileContent(null);
                }
            };
            reader.readAsText(file);
        }
        // Reset file input to allow re-selection of the same file
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleImportConfirm = () => {
        if (fileContent) {
            try {
                importData(fileContent);
                alert('تم استيراد البيانات بنجاح! سيتم إعادة تحميل الصفحة لتطبيق التغييرات.');
                window.location.reload();
            } catch (error: any) {
                alert(`فشل الاستيراد: ${error.message}`);
            }
        }
        setIsConfirmModalOpen(false);
        setFileContent(null);
    };

    const triggerFileSelect = () => {
        if (hasPermission('dataManagement', 'import')) {
            fileInputRef.current?.click();
        } else {
            alert('ليس لديك صلاحية لاستيراد البيانات.');
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
                <div className="flex items-center gap-4">
                    <Database className="w-8 h-8 text-primary dark:text-gold" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">إدارة بيانات التطبيق</h2>
                </div>
                
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-500/30 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                    <p>هذه الصفحة تسمح لك بتصدير نسخة احتياطية من جميع بيانات التطبيق أو استيراد بيانات من نسخة سابقة.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Export Card */}
                    <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <Download size={20}/>
                            تصدير البيانات
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            قم بتنزيل ملف JSON يحتوي على نسخة احتياطية كاملة من بياناتك الحالية. احتفظ بهذا الملف في مكان آمن.
                        </p>
                        <button
                            onClick={handleExport}
                            disabled={!hasPermission('dataManagement', 'export')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            تصدير نسخة احتياطية
                        </button>
                    </div>

                    {/* Import Card */}
                    <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                           <Upload size={20}/>
                            استيراد البيانات
                        </h3>
                        <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-500/30 rounded-lg text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                            <AlertTriangle className="w-8 h-8 flex-shrink-0 text-red-500"/>
                            <span><b>تحذير:</b> سيؤدي استيراد ملف إلى الكتابة فوق جميع بياناتك الحالية. هذا الإجراء لا يمكن التراجع عنه.</span>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                        <button
                            onClick={triggerFileSelect}
                            disabled={!hasPermission('dataManagement', 'import')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            استيراد من ملف
                        </button>
                    </div>

                    {/* Upload to Server Card */}
                    <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <Database size={20}/>
                            رفع البيانات للسيرفر
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            يرفع كل بياناتك الحالية إلى Supabase تحت حسابك.
                        </p>
                        <button
                            onClick={() => uploadAllDataToSupabase && uploadAllDataToSupabase()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                            رفع الآن
                        </button>
                    </div>
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleImportConfirm}
                title="تأكيد عملية الاستيراد"
                message="هل أنت متأكد من أنك تريد المتابعة؟ سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات الموجودة في الملف الذي حددته."
                confirmText="نعم، قم بالاستيراد"
                confirmButtonVariant="danger"
            />
        </>
    );
};

export default DataManagementPage;
