import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PlusCircle, Sun, Moon, ArrowRightLeft, Cloud, CloudOff, Wifi, WifiOff } from 'lucide-react';
import DailyTransactionsModal from './DailyTransactionsModal';
// FIX: Corrected import path to the existing component file.
import CurrencyExchangeModal from './DollarExchangeModal';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
    const [isDailyTxModalOpen, setIsDailyTxModalOpen] = useState(false);
    const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const location = useLocation();
    const { hasPermission, currentUser } = useAppContext();
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
        }, 1000);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(timer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);


    const getPageTitle = () => {
        switch (location.pathname) {
            case '/dashboard': return `مرحباً بك، ${currentUser?.displayName || 'مستخدم'}`;
            case '/banks': return 'إدارة المصارف';
            case '/debts': return 'إدارة الديون';
            case '/receivables': return 'إدارة المستحقات';
            case '/transactions': return 'سجل المعاملات';
            case '/users': return 'إدارة المستخدمين';
            case '/pos': return 'ماكينة P.O.S';
            case '/dollar-cards': return 'شراء بطاقات الدولار';
            case '/dollar-card-history': return 'سجل بطاقات الدولار';
            case '/operating-costs': return 'التكاليف التشغيلية';
            case '/cash-flow': return 'حركة الأموال';
            case '/incomplete-trades': return 'بيع وشراء غير مكتمل';
            case '/transaction-management': return 'إدارة المعاملات';
            case '/telegram': return 'إعدادات تليجرام';
            case '/data-management': return 'إدارة البيانات';
            case '/external-values': return 'خارج الخزنة';
            case '/closing': return 'الإغلاق';
            default: return 'شركة الخزينة الحديثه للبرمجة ';
        }
    };
    
    const canPerformAnyDailyTransaction = hasPermission('dailyTransactions', 'buySellUsd') || 
                                           hasPermission('dailyTransactions', 'buySellOther') || 
                                           hasPermission('dailyTransactions', 'adjustBalance');
    const canPerformCurrencyExchange = hasPermission('dailyTransactions', 'dollarExchange');

    return (
        <>
            <header className="h-20 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center justify-between px-6 transition-colors duration-300">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{getPageTitle()}</h2>
                     <input 
                        type="text" 
                        readOnly 
                        value={currentTime} 
                        className="font-mono text-sm bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border border rounded-md px-2 py-1 text-center w-48 text-gray-700 dark:text-gray-300"
                        aria-label="Current local time"
                    />
                </div>
                <div className="flex items-center gap-4">
                     {/* Sync Indicator */}
                     <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${isOnline ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`} title={isOnline ? "متصل بالسيرفر" : "وضع الأوفلاين - سيتم الحفظ محلياً"}>
                        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span className="hidden sm:inline">{isOnline ? 'متصل' : 'غير متصل'}</span>
                     </div>

                     {canPerformCurrencyExchange && (
                         <button 
                            onClick={() => setIsExchangeModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 dark:bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-card shadow-lg shadow-indigo-500/20"
                         >
                            <ArrowRightLeft size={18} />
                            <span>بدل عملات</span>
                        </button>
                     )}
                     {canPerformAnyDailyTransaction && (
                         <button 
                            onClick={() => setIsDailyTxModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary dark:bg-gradient-to-r from-gold-dark via-gold to-gold-light text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-all focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-gold focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-card shadow-lg shadow-primary/20 dark:shadow-gold/20"
                         >
                            <PlusCircle size={18} />
                            <span>معاملة جديدة</span>
                        </button>
                     )}
                     <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                     >
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                </div>
            </header>
            <DailyTransactionsModal isOpen={isDailyTxModalOpen} onClose={() => setIsDailyTxModalOpen(false)} />
            <CurrencyExchangeModal isOpen={isExchangeModalOpen} onClose={() => setIsExchangeModalOpen(false)} />
        </>
    );
};

export default Header;