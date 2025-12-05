

import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Landmark, Users, HandCoins, ListCollapse, LogOut, CreditCard, Contact2, History, Receipt, ArrowLeftRight, FileLock2, Users2, Bot, Wrench, Database, ClipboardList, Settings, ChevronDown, ChevronUp, WalletCards, Scale, SlidersHorizontal, Menu, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Sidebar: React.FC = () => {
    const { logout, showDailyClosingReport, hasPermission, sidebarConfig, isSidebarCollapsed, toggleSidebar } = useAppContext();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const mainNavItemsData = useMemo(() => ({
        'dashboard': { icon: LayoutDashboard, label: 'لوحة التحكم', path: '/dashboard', permission: 'dashboard' },
        'banks': { icon: Landmark, label: 'المصارف', path: '/banks', permission: 'banks' },
        'pos': { icon: CreditCard, label: 'ماكينة P.O.S', path: '/pos', permission: 'pos' },
        'debts': { icon: Users, label: 'الديون', path: '/debts', permission: 'debts' },
        'receivables': { icon: HandCoins, label: 'المستحقات', path: '/receivables', permission: 'receivables' },
        'dollar-cards': { icon: Contact2, label: 'شراء بطاقات الدولار', path: '/dollar-cards', permission: 'dollarCards' },
        'dollar-card-history': { icon: History, label: 'سجل بطاقات الدولار', path: '/dollar-card-history', permission: 'dollarCardHistory' },
        'operating-costs': { icon: Receipt, label: 'التكاليف التشغيلية', path: '/operating-costs', permission: 'operatingCosts' },
        'transactions': { icon: ListCollapse, label: 'كل المعاملات', path: '/transactions', permission: 'transactions' },
        'cash-flow': { icon: ArrowLeftRight, label: 'دخول و خروج', path: '/cash-flow', permission: 'cashFlow' },
        'incomplete-trades': { icon: ClipboardList, label: 'بيع وشراء غير مكتمل', path: '/incomplete-trades', permission: 'incompleteTrades' },
        'external-values': { icon: WalletCards, label: 'خارج الخزنة', path: '/external-values', permission: 'externalValues' },
        'closing': { icon: Scale, label: 'الإغلاق', path: '/closing', permission: 'closing' },
        'transaction-management': { icon: Wrench, label: 'إدارة المعاملات', path: '/transaction-management', permission: 'transactionManagement'},
    }), []);

     const settingsNavItems = [
        { icon: Users2, label: 'المستخدمين', path: '/users', permission: 'users' },
        { icon: Bot, label: 'إعدادات تليجرام', path: '/telegram', permission: 'telegram' },
        { icon: SlidersHorizontal, label: 'إعدادات لوحة التحكم والقائمة', path: '/dashboard-settings', permission: 'dashboardSettings' },
        { icon: Database, label: 'إدارة البيانات', path: '/data-management', permission: 'dataManagement' },
    ];
    
    const canViewSettings = settingsNavItems.some(item => hasPermission(item.permission as any, 'view'));

    return (
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-dark-card border-e border-gray-200 dark:border-dark-border flex flex-col transition-all duration-300`}>
            <div className="h-20 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-border">
                {!isSidebarCollapsed && <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark dark:from-gold-light dark:to-gold truncate">شركة الخزينة</h1>}
                <button onClick={toggleSidebar} className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors ${isSidebarCollapsed ? 'mx-auto' : ''}`}>
                    {isSidebarCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>
            <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
                {sidebarConfig.map((itemConfig) => {
                    if (!itemConfig.isVisible) return null;
                    const item = mainNavItemsData[itemConfig.id as keyof typeof mainNavItemsData];
                    if (!item) return null;
                    
                    if (hasPermission(item.permission as any, 'view')) {
                         return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={isSidebarCollapsed ? item.label : ''}
                                draggable={false}
                                onDragStart={(e) => e.preventDefault()}
                                className={({ isActive }) =>
                                    `flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group ${
                                        isActive
                                            ? 'bg-primary/10 text-primary-dark dark:bg-gradient-to-r from-gold/5 to-gold/20 dark:text-gold-light border-s-4 border-primary dark:border-gold'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    } ${isSidebarCollapsed ? 'justify-center' : ''}`
                                }
                            >
                                <item.icon className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'me-3'} text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-gold transition-colors duration-200`} />
                                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                            </NavLink>
                        );
                    }
                    return null;
                })}
                
                 {canViewSettings && (
                    <div>
                        <button 
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                            title={isSidebarCollapsed ? 'الإعدادات' : ''}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group`}
                        >
                            <div className="flex items-center">
                                <Settings className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'me-3'} text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-gold transition-colors duration-200`} />
                                {!isSidebarCollapsed && <span className="truncate">الاعدادات</span>}
                            </div>
                            {!isSidebarCollapsed && (isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
                        </button>
                        {((!isSidebarCollapsed && isSettingsOpen) || (isSidebarCollapsed && isSettingsOpen)) && (
                            <div className={`${isSidebarCollapsed ? 'ps-0' : 'ps-4'} mt-1 space-y-1 animate-fade-in`}>
                                {settingsNavItems.map((item) => (
                                    hasPermission(item.permission as any, 'view') && (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            title={isSidebarCollapsed ? item.label : ''}
                                            draggable={false}
                                            onDragStart={(e) => e.preventDefault()}
                                            className={({ isActive }) =>
                                                `flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 group ${
                                                    isActive
                                                        ? 'bg-primary/10 text-primary-dark dark:bg-gradient-to-r from-gold/5 to-gold/20 dark:text-gold-light'
                                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                                } ${isSidebarCollapsed ? 'justify-center' : ''}`
                                            }
                                        >
                                            <item.icon className={`w-4 h-4 ${isSidebarCollapsed ? '' : 'me-3'} text-gray-400 dark:text-gray-500 group-hover:text-primary dark:group-hover:text-gold transition-colors duration-200`} />
                                            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                                        </NavLink>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                 )}
            </nav>
            <div className="px-3 py-4 border-t border-gray-200 dark:border-dark-border">
                {hasPermission('dailyClosing', 'view') && (
                    <button
                        onClick={showDailyClosingReport}
                        title={isSidebarCollapsed ? 'إغلاق يومي' : ''}
                        className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-3 py-3 rounded-lg text-sm font-medium text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors mb-2`}
                    >
                        <FileLock2 className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'me-3'}`} />
                        {!isSidebarCollapsed && <span className="truncate">إغلاق يومي</span>}
                    </button>
                )}
                <button
                    onClick={handleLogout}
                    title={isSidebarCollapsed ? 'تسجيل الخروج' : ''}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-3 py-3 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors`}
                >
                    <LogOut className={`w-5 h-5 ${isSidebarCollapsed ? '' : 'me-3'}`} />
                    {!isSidebarCollapsed && <span className="truncate">تسجيل الخروج</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;