import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Save, Bot, KeyRound, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';

const TelegramSettings: React.FC = () => {
    const { telegramSettings, updateTelegramSettings, sendTestTelegramMessage } = useAppContext();
    const [token, setToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
    const [testStatus, setTestStatus] = useState<'success' | 'error' | null>(null);

    useEffect(() => {
        if (telegramSettings) {
            setToken(telegramSettings.token);
            setChatId(telegramSettings.chatId);
        }
    }, [telegramSettings]);

    const handleSave = () => {
        setIsSaving(true);
        setSaveStatus(null);
        try {
            updateTelegramSettings(token, chatId);
            setSaveStatus('success');
        } catch (e) {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestStatus(null);
        const success = await sendTestTelegramMessage();
        setTestStatus(success ? 'success' : 'error');
        setIsTesting(false);
        setTimeout(() => setTestStatus(null), 4000);
    };

    const inputClasses = "w-full text-left bg-gray-50 dark:bg-dark-bg p-2 ps-10 rounded-md border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-200 focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                    <Bot size={28} />
                    <span>إعدادات تقارير تليجرام</span>
                </h2>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-500/30 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                    <p>هنا يمكنك ربط النظام بحساب تليجرام لاستقبال تقارير الإغلاق بشكل تلقائي عند فتح التطبيق في يوم أو أسبوع أو شهر جديد. تأكد من أن الإعدادات صحيحة لضمان وصول التقارير.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توكن البوت (Bot Token)</label>
                        <div className="relative">
                            <KeyRound className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
                            <input type="password" value={token} onChange={e => setToken(e.target.value)} className={inputClasses} placeholder="أدخل توكن البوت هنا" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">معرّف المحادثة (Chat ID)</label>
                        <div className="relative">
                            <MessageSquare className="w-5 h-5 absolute top-1/2 -translate-y-1/2 start-3 text-gray-400" />
                            <input type="text" value={chatId} onChange={e => setChatId(e.target.value)} className={inputClasses} placeholder="أدخل معرّف المحادثة هنا" />
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 px-6 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 disabled:opacity-50 transition-all">
                        <Save size={18} />
                        <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
                    </button>
                    <button onClick={handleTest} disabled={isTesting || !token || !chatId} className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 transition-all">
                        <Bot size={18} />
                        <span>{isTesting ? 'جارٍ الإرسال...' : 'إرسال رسالة اختبار'}</span>
                    </button>
                </div>
                {saveStatus && (
                    <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${saveStatus === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                        {saveStatus === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        <span>{saveStatus === 'success' ? 'تم حفظ الإعدادات بنجاح.' : 'حدث خطأ أثناء الحفظ.'}</span>
                    </div>
                )}
                 {testStatus && (
                    <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${testStatus === 'success' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'}`}>
                        {testStatus === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                        <span>{testStatus === 'success' ? 'تم إرسال رسالة الاختبار بنجاح! تفقد تليجرام.' : 'فشل إرسال الرسالة. تأكد من صحة التوكن ومعرف المحادثة.'}</span>
                    </div>
                )}
            </div>

            <div className="md:col-span-1 bg-gray-50 dark:bg-dark-bg/50 rounded-xl p-6 space-y-4 border border-gray-200 dark:border-dark-border">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">كيفية الحصول على الإعدادات؟</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <li>
                        <strong>إنشاء بوت جديد:</strong> ابحث عن <code className="font-mono bg-gray-200 dark:bg-gray-900 p-1 rounded">@BotFather</code> في تليجرام، ابدأ محادثة معه وأرسل أمر <code className="font-mono bg-gray-200 dark:bg-gray-900 p-1 rounded">/newbot</code>. اتبع التعليمات وستحصل على **توكن البوت (Bot Token)**.
                    </li>
                    <li>
                        <strong>الحصول على معرّف المحادثة:</strong> ابحث عن <code className="font-mono bg-gray-200 dark:bg-gray-900 p-1 rounded">@userinfobot</code>، ابدأ محادثة معه وسيُرسل لك **معرّف المحادثة (Chat ID)** الخاص بك.
                    </li>
                    <li>
                        <strong>ملاحظة هامة:</strong> يجب عليك أولاً أن تبدأ محادثة مع البوت الذي أنشأته (ابحث عنه وأرسل له أي رسالة) قبل أن يتمكن من إرسال التقارير إليك.
                    </li>
                </ol>
            </div>
        </div>
    );
};

export default TelegramSettings;
