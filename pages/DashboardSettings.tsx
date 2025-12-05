

import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DEFAULT_DASHBOARD_CARDS, DEFAULT_SIDEBAR_CONFIG } from '../types';
import { Eye, EyeOff, RotateCcw, ChevronUp, ChevronDown, LayoutPanelLeft, LayoutDashboard, Hash } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const DashboardSettings: React.FC = () => {
    const { dashboardCardConfig, setDashboardCardConfig, sidebarConfig, setSidebarConfig, isNumberFormattingEnabled, setIsNumberFormattingEnabled } = useAppContext();
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'sidebar' | 'general'>('dashboard');

    // --- Dashboard Handlers ---
    const handleDashboardVisibilityToggle = (id: string) => {
        setDashboardCardConfig(prev =>
            prev.map(card =>
                card.id === id ? { ...card, isVisible: !card.isVisible } : card
            )
        );
    };
    
    const handleDashboardMove = (index: number, direction: 'up' | 'down') => {
        setDashboardCardConfig(prev => {
            const newConfig = [...prev];
            const item = newConfig[index];
            const swapIndex = direction === 'up' ? index - 1 : index + 1;
            
            if (swapIndex < 0 || swapIndex >= newConfig.length) {
                return newConfig;
            }
            
            newConfig[index] = newConfig[swapIndex];
            newConfig[swapIndex] = item;
            
            return newConfig;
        });
    };

    // --- Sidebar Handlers ---
    const handleSidebarVisibilityToggle = (id: string) => {
        setSidebarConfig(prev =>
            prev.map(item =>
                item.id === id ? { ...item, isVisible: !item.isVisible } : item
            )
        );
    };

    const handleSidebarMove = (index: number, direction: 'up' | 'down') => {
        setSidebarConfig(prev => {
            const newConfig = [...prev];
            const item = newConfig[index];
            const swapIndex = direction === 'up' ? index - 1 : index + 1;
            
            if (swapIndex < 0 || swapIndex >= newConfig.length) {
                return newConfig;
            }
            
            newConfig[index] = newConfig[swapIndex];
            newConfig[swapIndex] = item;
            
            return newConfig;
        });
    };
    
    const handleReset = () => {
        setDashboardCardConfig(DEFAULT_DASHBOARD_CARDS);
        setSidebarConfig(DEFAULT_SIDEBAR_CONFIG);
        setIsNumberFormattingEnabled(false);
        setIsResetConfirmOpen(false);
    };

    // Helper to map ID to Label for sidebar items (since config only has ID)
    const getSidebarLabel = (id: string) => {
        switch(id) {
            case 'dashboard': return 'لوحة التحكم';
            case 'banks': return 'المصارف';
            case 'pos': return 'ماكينة P.O.S';
            case 'debts': return 'الديون';
            case 'receivables': return 'المستحقات';
            case 'dollar-cards': return 'شراء بطاقات الدولار';
            case 'dollar-card-history': return 'سجل بطاقات الدولار';
            case 'operating-costs': return 'التكاليف التشغيلية';
            case 'transactions': return 'كل المعاملات';
            case 'cash-flow': return 'دخول و خروج';
            case 'incomplete-trades': return 'بيع وشراء غير مكتمل';
            case 'external-values': return 'خارج الخزنة';
            case 'closing': return 'الإغلاق';
            case 'transaction-management': return 'إدارة المعاملات';
            default: return id;
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">إعدادات لوحة التحكم و القائمة الجانبية</h2>
                    <button onClick={() => setIsResetConfirmOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        <RotateCcw size={16} /> استعادة الإعدادات الافتراضية
                    </button>
                </div>

                <div className="flex border-b border-gray-200 dark:border-dark-border">
                    <button
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-primary text-primary dark:text-gold dark:border-gold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <LayoutDashboard size={18}/>
                        بطاقات لوحة التحكم
                    </button>
                    <button
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'sidebar' ? 'border-primary text-primary dark:text-gold dark:border-gold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab('sidebar')}
                    >
                        <LayoutPanelLeft size={18}/>
                        القائمة الجانبية
                    </button>
                    <button
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'general' ? 'border-primary text-primary dark:text-gold dark:border-gold' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        <Hash size={18}/>
                        إعدادات عامة
                    </button>
                </div>
                
                {activeTab === 'dashboard' && (
                    <div className="animate-fade-in">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            استخدم الأسهم لتغيير ترتيب البطاقات، واستخدم الأزرار لإظهارها أو إخفائها في لوحة التحكم.
                        </p>
                        <div className="max-w-2xl mx-auto space-y-3">
                            {dashboardCardConfig.map((card, index) => (
                                <div
                                    key={card.id}
                                    className="flex items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border transition-all"
                                >
                                    <span className="flex-grow mx-4 text-gray-800 dark:text-gray-200">{card.label}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleDashboardMove(index, 'up')}
                                            disabled={index === 0}
                                            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            aria-label="Move up"
                                        >
                                            <ChevronUp size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDashboardMove(index, 'down')}
                                            disabled={index === dashboardCardConfig.length - 1}
                                            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            aria-label="Move down"
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                        <button onClick={() => handleDashboardVisibilityToggle(card.id)} className={`p-2 rounded-full ${card.isVisible ? 'text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`} aria-label={card.isVisible ? 'إخفاء' : 'إظهار'}>
                                            {card.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'sidebar' && (
                    <div className="animate-fade-in">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            تحكم في ترتيب وظهور الصفحات في القائمة الجانبية.
                        </p>
                        <div className="max-w-2xl mx-auto space-y-3">
                            {sidebarConfig.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="flex items-center p-3 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border transition-all"
                                >
                                    <span className="flex-grow mx-4 text-gray-800 dark:text-gray-200">{getSidebarLabel(item.id)}</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleSidebarMove(index, 'up')}
                                            disabled={index === 0}
                                            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            aria-label="Move up"
                                        >
                                            <ChevronUp size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleSidebarMove(index, 'down')}
                                            disabled={index === sidebarConfig.length - 1}
                                            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            aria-label="Move down"
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                        <button onClick={() => handleSidebarVisibilityToggle(item.id)} className={`p-2 rounded-full ${item.isVisible ? 'text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30' : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`} aria-label={item.isVisible ? 'إخفاء' : 'إظهار'}>
                                            {item.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="animate-fade-in">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            إعدادات عامة للتطبيق.
                        </p>
                        <div className="max-w-2xl mx-auto p-4 bg-gray-50 dark:bg-dark-bg rounded-lg border border-gray-200 dark:border-dark-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">تنسيق الأرقام</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">إظهار فواصل الآلاف في حقول الإدخال الرقمية (مثال: 1,000).</p>
                                </div>
                                <div className="relative inline-block w-12 me-2 align-middle select-none transition duration-200 ease-in">
                                    <input
                                        type="checkbox"
                                        name="toggle"
                                        id="numberFormattingToggle"
                                        checked={isNumberFormattingEnabled}
                                        onChange={() => setIsNumberFormattingEnabled(prev => !prev)}
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer start-0"
                                    />
                                    <label htmlFor="numberFormattingToggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"></label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={handleReset}
                title="استعادة الإعدادات الافتراضية"
                message="هل أنت متأكد من رغبتك في استعادة الترتيب الافتراضي وإظهار جميع العناصر في لوحة التحكم والقائمة الجانبية؟"
                confirmButtonVariant="danger"
                confirmText="نعم، استعد"
            />
        </>
    );
};
export default DashboardSettings;