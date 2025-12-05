

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Currency, LYD_CASH_ASSET_IDS, AssetId, TransactionType, DashboardCardConfig, Customer } from '../types';
import DashboardCard from '../components/DashboardCard';
import { Landmark, Coins, PiggyBank, TrendingDown, TrendingUp, BarChart2, CreditCard, ArrowUp, ArrowDown } from 'lucide-react';
import { ASSET_NAMES } from '../types';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface MultiCurrencyDashboardCardProps {
    title: string;
    values: { amount: number; currency: Currency }[];
    icon: React.ReactNode;
    path?: string;
}

const MultiCurrencyDashboardCard: React.FC<MultiCurrencyDashboardCardProps> = ({ title, values, icon, path }) => {
    const navigate = useNavigate();
    const handleClick = () => path && navigate(path);

    return (
        <div 
            onClick={handleClick}
            className={clsx(
                "h-full bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 flex items-center space-x-4 space-x-reverse border border-gray-200 dark:border-dark-border transition-all duration-300",
                path && "cursor-pointer hover:border-primary/30 dark:hover:border-gold/30 hover:shadow-xl hover:-translate-y-1"
            )}
        >
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-gold/20 dark:to-gold/5">
                <div className="text-primary-dark dark:text-gold-light">{icon}</div>
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
                <div className="space-y-1">
                    {values.map(v => (
                         <p key={v.currency} className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold">
                            {formatCurrency(v.amount, v.currency)}
                         </p>
                    ))}
                </div>
            </div>
        </div>
    );
};


const PosBankCard: React.FC<{ path?: string, title: string }> = ({ path, title }) => {
    const { banks } = useAppContext();
    const navigate = useNavigate();
    const handleClick = () => path && navigate(path);
    
    const posBanks = banks.filter(b => b.isPosEnabled);
    const totalPosBankBalance = posBanks.reduce((sum, bank) => sum + bank.balance, 0);

    return (
        <div 
            onClick={handleClick}
            className={clsx(
                "h-full bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-200 dark:border-dark-border transition-all duration-300",
                path && "cursor-pointer hover:border-primary/30 dark:hover:border-gold/30 hover:shadow-xl hover:-translate-y-1"
            )}
        >
            <div className="p-6">
                <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-gold/20 dark:to-gold/5">
                        <BarChart2 className="w-6 h-6 text-primary-dark dark:text-gold-light" />
                    </div>
                    <div className="flex-grow">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold">
                            {formatCurrency(totalPosBankBalance, Currency.LYD)}
                        </p>
                    </div>
                </div>
                <div className="border-t border-gray-200 dark:border-dark-border p-4 mt-4 text-xs space-y-2">
                    <p className="font-semibold text-gray-600 dark:text-gray-300">المصارف المفعلة:</p>
                    {posBanks.length > 0 ? (
                        <ul className="list-disc list-inside ps-2">
                            {posBanks.map(b => (
                                <li key={b.id} className="text-gray-500 dark:text-gray-400 flex justify-between">
                                   <span>{b.name}</span>
                                   <span className="font-mono text-blue-500 dark:text-blue-400">{formatCurrency(b.balance, Currency.LYD)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">لا توجد مصارف P.O.S مفعلة.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActiveCardSpendCard: React.FC<{ path?: string, title: string }> = ({ path, title }) => {
    const { getActiveDollarCardSpend } = useAppContext();
    const navigate = useNavigate();
    const handleClick = () => path && navigate(path);
    const { totalSpend, fromCash, fromBanks, fromExternal } = getActiveDollarCardSpend();

    return (
        <div 
            onClick={handleClick}
            className={clsx(
                "h-full bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 flex flex-col justify-between border border-gray-200 dark:border-dark-border transition-all duration-300",
                path && "cursor-pointer hover:border-primary/30 dark:hover:border-gold/30 hover:shadow-xl hover:-translate-y-1"
            )}
        >
            <div>
                <div className="flex items-center space-x-4 space-x-reverse mb-4">
                     <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-gold/20 dark:to-gold/5">
                        <CreditCard className="w-6 h-6 text-primary-dark dark:text-gold-light" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold">
                            {formatCurrency(totalSpend, Currency.LYD)}
                        </p>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-200 dark:border-dark-border pt-3 mt-2 text-xs space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">مصروف من الخزنة:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(fromCash, Currency.LYD)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">مصروف من المصارف:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(fromBanks, Currency.LYD)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">مصروف من خارج الخزنة:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(fromExternal, Currency.LYD)}</span>
                </div>
            </div>
        </div>
    );
};

const DailyMovementCard: React.FC<{ title: string }> = ({ title }) => {
    const { transactions } = useAppContext();

    const dailyMovements = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            const isToday = txDate >= todayStart;
            // This logic matches CashFlow.tsx to ensure consistency
            const isValidForCashFlow = !tx.isDeleted && 
                                     tx.type !== TransactionType.Settlement &&
                                     tx.assetId !== 'trade_debt' &&
                                     tx.assetId !== 'external_settlement';
            return isToday && isValidForCashFlow;
        });


        const assetsToTrack: AssetId[] = ['cashLydMisrata', 'cashUsdLibya', 'cashUsdTurkey'];

        return assetsToTrack.map(assetId => {
            const assetTransactions = todayTransactions.filter(tx => tx.assetId === assetId);
            const totalIn = assetTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
            const totalOut = assetTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
            const currency = assetId.includes('Usd') ? Currency.USD : Currency.LYD;
            return { name: ASSET_NAMES[assetId], totalIn, totalOut, currency };
        });
    }, [transactions]);

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border hover:border-primary/30 dark:hover:border-gold/30 transition-all duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">{title}</h3>
            <div className="space-y-4">
                {dailyMovements.map(asset => (
                    <div key={asset.name} className="p-3 bg-gray-50 dark:bg-dark-bg rounded-lg">
                        <p className="font-semibold text-primary-dark dark:text-gold-light mb-2">{asset.name}</p>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                <ArrowUp size={16} />
                                <span>دخول:</span>
                                <span className="font-mono">{formatCurrency(asset.totalIn, asset.currency)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                                <ArrowDown size={16} />
                                <span>خروج:</span>
                                <span className="font-mono">{formatCurrency(asset.totalOut, asset.currency)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { assets, getTotalDebts, getTotalReceivables, banks, getActiveDollarCardSpend, transactions, dashboardCardConfig, customers } = useAppContext();
    const navigate = useNavigate();
    
    const nonPosBanks = banks.filter(b => !b.isPosEnabled);
    const totalUsdDebts = getTotalDebts(Currency.USD);
    const totalLydReceivables = getTotalReceivables(Currency.LYD);
    const totalUsdReceivables = getTotalReceivables(Currency.USD);
    const totalLydCash = LYD_CASH_ASSET_IDS.reduce((sum, assetId) => sum + assets[assetId], 0);

    const totalLydCashDebts = customers
        .filter(c => c.currency === Currency.LYD && !c.isBankDebt && !c.isArchived)
        .reduce((total, customer) => {
            const customerUnpaidDebt = customer.debts
                .filter(d => !d.isArchived && d.amount - d.paid > 0)
                .reduce((sum, debt) => sum + (debt.amount - debt.paid), 0);
            return total + customerUnpaidDebt;
        }, 0);

    const totalLydBankDebts = customers
        .filter(c => c.currency === Currency.LYD && c.isBankDebt && !c.isArchived)
        .reduce((total, customer) => {
            const customerUnpaidDebt = customer.debts
                .filter(d => !d.isArchived && d.amount - d.paid > 0)
                .reduce((sum, debt) => sum + (debt.amount - debt.paid), 0);
            return total + customerUnpaidDebt;
        }, 0);
    
    const getCardComponent = (cardConfig: DashboardCardConfig) => {
        switch(cardConfig.id) {
            case 'pos_banks':
                return <PosBankCard path="/pos" title={cardConfig.label} />;
            case 'active_cards':
                return <ActiveCardSpendCard path="/dollar-cards" title={cardConfig.label} />;
            case 'lyd_cash':
                return (
                    <div onClick={() => navigate('/cash-flow')} className="h-full bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border cursor-pointer hover:border-primary/30 dark:hover:border-gold/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center space-x-4 space-x-reverse">
                            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-gold/20 dark:to-gold/5">
                                <Coins className="w-6 h-6 text-primary-dark dark:text-gold-light" />
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{cardConfig.label}</p>
                                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold">
                                    {formatCurrency(totalLydCash, Currency.LYD)}
                                </p>
                            </div>
                        </div>
                         <div className="border-t border-gray-200 dark:border-dark-border pt-4 mt-4">
                            <ul className="space-y-2 text-sm">
                                {LYD_CASH_ASSET_IDS.map(assetId => (
                                    <li key={assetId} className="flex justify-between items-center border-b border-gray-200 dark:border-dark-border/50 pb-2 last:border-b-0">
                                        <span className="text-gray-600 dark:text-gray-300">{ASSET_NAMES[assetId]}</span>
                                        <span className="font-semibold text-green-600 dark:text-green-400 font-mono">{formatCurrency(assets[assetId], Currency.LYD)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                );
            case 'non_pos_banks':
                return (
                     <div onClick={() => navigate('/banks')} className="h-full bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border cursor-pointer hover:border-primary/30 dark:hover:border-gold/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center space-x-4 space-x-reverse">
                             <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-gold/20 dark:to-gold/5">
                                <Landmark className="w-6 h-6 text-primary-dark dark:text-gold-light" />
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{cardConfig.label}</p>
                                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold">
                                    {formatCurrency(assets.bankLyd, Currency.LYD)}
                                </p>
                            </div>
                        </div>
                         <div className="border-t border-gray-200 dark:border-dark-border pt-4 mt-4">
                            <ul className="space-y-2 text-sm">
                                {nonPosBanks.map(bank => (
                                    <li key={bank.id} className="flex justify-between items-center border-b border-gray-200 dark:border-dark-border/50 pb-2 last:border-b-0">
                                        <span className="text-gray-600 dark:text-gray-300">{bank.name}</span>
                                        <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">{formatCurrency(bank.balance, Currency.LYD)}</span>
                                    </li>
                                ))}
                                 {nonPosBanks.length === 0 && <p className="text-xs text-center text-gray-500">لا توجد مصارف عادية</p>}
                            </ul>
                        </div>
                    </div>
                );
            case 'usd_libya':
                return <DashboardCard title={cardConfig.label} amount={assets.cashUsdLibya} currency={Currency.USD} icon={<PiggyBank className="w-6 h-6" />} path="/cash-flow" />;
            case 'usd_turkey':
                 return <DashboardCard title={cardConfig.label} amount={assets.cashUsdTurkey} currency={Currency.USD} icon={<PiggyBank className="w-6 h-6" />} path="/cash-flow" />;
            case 'tnd_cash':
                return <DashboardCard title={cardConfig.label} amount={assets.cashTnd} currency={Currency.TND} icon={<Coins className="w-6 h-6" />} path="/cash-flow" />;
            case 'eur_libya':
                 return <DashboardCard title={cardConfig.label} amount={assets.cashEurLibya} currency={Currency.EUR} icon={<Coins className="w-6 h-6" />} path="/cash-flow" />;
            case 'eur_turkey':
                 return <DashboardCard title={cardConfig.label} amount={assets.cashEurTurkey} currency={Currency.EUR} icon={<Coins className="w-6 h-6" />} path="/cash-flow" />;
            case 'sar_cash':
                 return <DashboardCard title={cardConfig.label} amount={assets.cashSar} currency={Currency.SAR} icon={<Coins className="w-6 h-6" />} path="/cash-flow" />;
            case 'egp_cash':
                 return <DashboardCard title={cardConfig.label} amount={assets.cashEgp} currency={Currency.EGP} icon={<Coins className="w-6 h-6" />} path="/cash-flow" />;
            case 'total_debts':
                return (
                    <div
                        onClick={() => navigate('/debts')}
                        className="h-full bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 flex flex-col justify-between border border-gray-200 dark:border-dark-border cursor-pointer hover:border-primary/30 dark:hover:border-gold/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                        <div>
                            <div className="flex items-center space-x-4 space-x-reverse mb-4">
                                <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-gold/20 dark:to-gold/5">
                                    <TrendingDown className="w-6 h-6 text-primary-dark dark:text-gold-light" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{cardConfig.label}</p>
                                    <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold">
                                        {formatCurrency(totalLydCashDebts + totalLydBankDebts, Currency.LYD)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 dark:border-dark-border pt-3 mt-2 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">ديون كاش (دينار):</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{formatCurrency(totalLydCashDebts, Currency.LYD)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">ديون على المصرف (دينار):</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{formatCurrency(totalLydBankDebts, Currency.LYD)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">ديون دولار:</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">{formatCurrency(totalUsdDebts, Currency.USD)}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'total_receivables':
                return <MultiCurrencyDashboardCard title={cardConfig.label} values={[{ amount: totalLydReceivables, currency: Currency.LYD }, { amount: totalUsdReceivables, currency: Currency.USD }]} icon={<TrendingUp className="w-6 h-6" />} path="/receivables" />;
            case 'daily_movement':
                return <DailyMovementCard title={cardConfig.label} />;
            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardCardConfig.map(cardConfig => {
                if (!cardConfig.isVisible) return null;
                const component = getCardComponent(cardConfig);
                return (
                    <div key={cardConfig.id} className={clsx(cardConfig.isFullWidth && 'md:col-span-2 lg:col-span-3')}>
                        {component}
                    </div>
                );
            })}
        </div>
    );
};

export default Dashboard;