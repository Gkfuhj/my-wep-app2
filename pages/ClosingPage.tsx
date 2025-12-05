

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Currency, LYD_CASH_ASSET_IDS, ASSET_NAMES, CapitalHistoryEntry, Transaction } from '../types';
import { formatCurrency, formatDate, getLocalISOString } from '../lib/utils';
import Modal from '../components/Modal';
import { RefreshCw, ChevronDown, History, Plus, Trash2, TrendingUp, TrendingDown, Scale, Sigma, BarChart, FileText, Download, AlertTriangle, Printer } from 'lucide-react';
import clsx from 'clsx';
import { generateClosingReportPDF, ReportData, ReportCapitalState, ProfitData } from '../lib/closingPdfGenerator';


interface TradingProfitDetail {
    id: string;
    date: string;
    description: string;
    saleRate: number;
    costRate: number;
    profit: number;
    currency: Currency;
}

const CapitalHistoryChart: React.FC<{ data: CapitalHistoryEntry[] }> = ({ data }) => {
    // 1. Filter and sort data for the last 30 days
    const last30Days = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        return data
            .filter(entry => new Date(entry.date) >= thirtyDaysAgo)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    if (last30Days.length < 2) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <FileText className="w-8 h-8 me-2" />
                <span>لا توجد بيانات كافية لعرض الرسم البياني (مطلوب يومين على الأقل في آخر 30 يوم).</span>
            </div>
        );
    }
    
    // 2. Define dimensions and margins
    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 3. Find min/max values for scales
    const allCapitals = last30Days.map(d => d.finalLydCapital);
    const minCapital = Math.min(...allCapitals);
    const maxCapital = Math.max(...allCapitals);
    const capitalRange = maxCapital - minCapital;

    // Add some padding to the Y axis
    const yMin = minCapital - capitalRange * 0.1;
    const yMax = maxCapital + capitalRange * 0.1;

    const startDate = new Date(last30Days[0].date).getTime();
    const endDate = new Date(last30Days[last30Days.length - 1].date).getTime();
    const dateRange = endDate - startDate;

    // 4. Create scaling functions
    const scaleX = (time: number) => {
        if (dateRange === 0) return 0; // Avoid division by zero
        return ((time - startDate) / dateRange) * innerWidth;
    };
    
    const scaleY = (capital: number) => {
        if (yMax === yMin) return innerHeight / 2;
        // Invert Y-axis for SVG coordinates
        return innerHeight - ((capital - yMin) / (yMax - yMin)) * innerHeight;
    };

    // 5. Generate path for the line
    const linePath = last30Days
        .map((d, i) => {
            const x = scaleX(new Date(d.date).getTime());
            const y = scaleY(d.finalLydCapital);
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');

    // 6. Generate axis labels/ticks
    const yAxisTicks = 5;
    const yTicks = Array.from({ length: yAxisTicks }, (_, i) => {
        const value = yMin + (i / (yAxisTicks - 1)) * (yMax - yMin);
        return { value, y: scaleY(value) };
    });

    const xAxisTicks = Math.min(last30Days.length, 6);
    const xTicks = Array.from({ length: xAxisTicks }, (_, i) => {
        const index = Math.floor(i * (last30Days.length - 1) / (xAxisTicks - 1));
        const dataPoint = last30Days[index];
        const date = new Date(dataPoint.date);
        return {
            label: `${date.getDate()}/${date.getMonth() + 1}`,
            x: scaleX(date.getTime())
        };
    });

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-gray-700 dark:text-gray-300">
            <g transform={`translate(${margin.left}, ${margin.top})`}>
                {/* Grid lines */}
                {yTicks.map(({ y }, i) => (
                    <line
                        key={i}
                        x1={0}
                        x2={innerWidth}
                        y1={y}
                        y2={y}
                        className="stroke-current text-gray-200 dark:text-dark-border"
                        strokeDasharray="2,2"
                    />
                ))}

                {/* Y-axis labels */}
                {yTicks.map(({ value, y }, i) => (
                    <text
                        key={i}
                        x={-10}
                        y={y}
                        textAnchor="end"
                        alignmentBaseline="middle"
                        className="text-xs fill-current"
                    >
                        {formatCurrency(value, Currency.LYD).replace('LYD', '')}
                    </text>
                ))}
                
                 {/* X-axis labels */}
                {xTicks.map(({ label, x }, i) => (
                    <text
                        key={i}
                        x={x}
                        y={innerHeight + 20}
                        textAnchor="middle"
                        className="text-xs fill-current"
                    >
                        {label}
                    </text>
                ))}


                {/* Line */}
                <path
                    d={linePath}
                    fill="none"
                    className="stroke-[var(--rs-primary)]"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Data points */}
                {last30Days.map((d, i) => {
                    const x = scaleX(new Date(d.date).getTime());
                    const y = scaleY(d.finalLydCapital);
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4"
                            className="fill-[var(--rs-primary)] stroke-[var(--rs-bg)] dark:stroke-dark-card"
                            strokeWidth="2"
                        >
                            <title>{`${formatDate(d.date)}: ${formatCurrency(d.finalLydCapital, Currency.LYD)}`}</title>
                        </circle>
                    );
                })}
            </g>
        </svg>
    );
};

// ... (Rest of components: TradingProfitManager, ChartCard, DonutChart, ProfitsView) ...
// Component for managing trading profit display and manual inputs
const TradingProfitManager: React.FC<{
    label: string;
    amount: number;
    cogs: {
        cash: { USD: number; EUR: number; TND: number; SAR: number; EGP: number };
        bank: { USD: number; EUR: number; TND: number; SAR: number; EGP: number };
    };
    manualCogs: {
        cash: { USD: string; EUR: string; TND: string; SAR: string; EGP: string };
        bank: { USD: string; EUR: string; TND: string; SAR: string; EGP: string };
    };
    onManualCogsChange: (type: 'cash' | 'bank', currency: 'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP', value: string) => void;
    onDetailsClick: () => void;
}> = ({ label, amount, cogs, manualCogs, onManualCogsChange, onDetailsClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="p-2 bg-white dark:bg-dark-card rounded-md">
            <button onClick={onDetailsClick} className="w-full flex justify-between text-sm text-right">
                <span className="text-gray-600 dark:text-gray-300">{label}</span>
                <span className={`font-semibold font-mono ${amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(amount, Currency.LYD)}</span>
            </button>
            <div className="text-right mt-2">
                <button onClick={() => setIsExpanded(!isExpanded)} className="px-3 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900">
                    {isExpanded ? 'إخفاء الإدخال اليدوي' : 'إدخال يدوي للتكلفة'}
                </button>
            </div>
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border space-y-3 animate-fade-in">
                    <p className="text-xs text-gray-400">أدخل سعر تكلفة لحساب الربح يدوياً. اترك الحقل فارغاً لاستخدام المتوسط المحسوب.</p>
                    {(['USD', 'EUR', 'TND', 'SAR', 'EGP'] as const).map(curr => (
                        <div key={curr} className="space-y-2">
                            <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">{curr}</span>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400">تكلفة الكاش</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={`المتوسط: ${cogs.cash[curr] > 0 ? cogs.cash[curr].toFixed(4) : 'N/A'}`}
                                        value={manualCogs.cash[curr]}
                                        onChange={(e) => onManualCogsChange('cash', curr, e.target.value.replace(/[^0-9.]/g, ''))}
                                        className="w-full text-xs p-1 rounded bg-gray-100 dark:bg-dark-bg border border-gray-300 dark:border-dark-border mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400">تكلفة المصارف</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder={`المتوسط: ${cogs.bank[curr] > 0 ? cogs.bank[curr].toFixed(4) : 'N/A'}`}
                                        value={manualCogs.bank[curr]}
                                        onChange={(e) => onManualCogsChange('bank', curr, e.target.value.replace(/[^0-9.]/g, ''))}
                                        className="w-full text-xs p-1 rounded bg-gray-100 dark:bg-dark-bg border border-gray-300 dark:border-dark-border mt-1"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white dark:bg-dark-card rounded-xl shadow p-6 border border-gray-200 dark:border-dark-border">
    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">{title}</h4>
    <div className="h-64">{children}</div>
  </div>
);

interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    if (total === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">لا توجد بيانات للعرض</div>;
    }

    let accumulatedPercentage = 0;
    const segments = data.map(item => {
        const percentage = (item.value / total) * 100;
        const start = accumulatedPercentage;
        accumulatedPercentage += percentage;
        return { ...item, percentage, start };
    });

    const gradient = segments.map(s => `${s.color} ${s.start}% ${s.start + s.percentage}%`).join(', ');

    return (
        <div className="flex flex-col md:flex-row items-center justify-center h-full gap-8">
            <div className="relative w-40 h-40">
                <div 
                    className="w-full h-full rounded-full" 
                    style={{ background: `conic-gradient(${gradient})` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-white dark:bg-dark-card rounded-full"></div>
                </div>
            </div>
            <ul className="space-y-2 text-sm">
                {segments.map(item => (
                    <li key={item.label} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                        <span className="font-mono text-gray-500 dark:text-gray-400">({item.percentage.toFixed(1)}%)</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};


// New Profits View Component
const ProfitsView: React.FC = () => {
    const { transactions, posTransactions, operatingCosts, dollarCardPurchases, banks, capitalHistory, showCapitalEvolution, setShowCapitalEvolution } = useAppContext();
    type PeriodOption = 'daily' | 'weekly' | 'monthly' | 'custom';
    const [period, setPeriod] = useState<PeriodOption>('daily');
    const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [endDate, setEndDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isTradingProfitModalOpen, setIsTradingProfitModalOpen] = useState(false);
    const [tradingProfitDetails, setTradingProfitDetails] = useState<TradingProfitDetail[]>([]);
     const [manualCogs, setManualCogs] = useState({
        cash: { USD: '', EUR: '', TND: '', SAR: '', EGP: '' },
        bank: { USD: '', EUR: '', TND: '', SAR: '', EGP: '' },
    });

    const { profitData, otherCurrencyProfitsAndLosses, capitalEvolution } = useMemo(() => {
        // 1. Define date range
        const now = new Date();
        let endRange = new Date();
        let startRange = new Date();

        switch(period) {
            case 'daily':
                startRange.setHours(0, 0, 0, 0);
                endRange.setHours(23, 59, 59, 999);
                break;
            case 'weekly':
                startRange.setDate(now.getDate() - 6);
                startRange.setHours(0, 0, 0, 0);
                endRange.setHours(23, 59, 59, 999);
                break;
            case 'monthly':
                startRange.setDate(now.getDate() - 29);
                startRange.setHours(0, 0, 0, 0);
                endRange.setHours(23, 59, 59, 999);
                break;
            case 'custom':
                startRange = startDate ? new Date(startDate) : new Date();
                if (startDate) startRange.setHours(0, 0, 0, 0);

                endRange = endDate ? new Date(endDate) : new Date();
                if (endDate) endRange.setHours(23, 59, 59, 999);
                break;
        }

        let evolution = null;
        if (showCapitalEvolution && ['weekly', 'monthly', 'custom'].includes(period)) {
            if (capitalHistory && capitalHistory.length > 1) {
                const sortedHistory = [...capitalHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
                const startEntry = sortedHistory.filter(entry => new Date(entry.date) < startRange).pop();
                
                const endEntry = sortedHistory.filter(entry => new Date(entry.date) <= endRange).pop();
    
                if (startEntry && endEntry && startEntry.date !== endEntry.date) {
                    const startCapital = startEntry.finalLydCapital;
                    const endCapital = endEntry.finalLydCapital;
                    const change = endCapital - startCapital;
                    const percentage = startCapital !== 0 ? (change / Math.abs(startCapital)) * 100 : 0;
                    
                    evolution = {
                        startCapital,
                        endCapital,
                        change,
                        percentage,
                        startDate: startEntry.date,
                        endDate: endEntry.date,
                    };
                }
            }
        }

        const periodTransactions = transactions.filter(tx => new Date(tx.date) >= startRange && new Date(tx.date) <= endRange && !tx.isDeleted);
        
        // Other currencies P&L
        const adjustments = periodTransactions.filter(
            tx => (tx.metadata?.isProfit || tx.metadata?.isLoss) && tx.currency !== Currency.LYD
        );
        
        const otherCurrenciesResult: Record<'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP', { profit: number; loss: number }> = {
            USD: { profit: 0, loss: 0 },
            EUR: { profit: 0, loss: 0 },
            TND: { profit: 0, loss: 0 },
            SAR: { profit: 0, loss: 0 },
            EGP: { profit: 0, loss: 0 },
        };

        adjustments.forEach(tx => {
            const currency = tx.currency;
            if (currency === Currency.USD || currency === Currency.EUR || currency === Currency.TND || currency === Currency.SAR || currency === Currency.EGP) {
                if (tx.metadata?.isProfit) {
                    otherCurrenciesResult[currency].profit += tx.amount;
                }
                if (tx.metadata?.isLoss) {
                    otherCurrenciesResult[currency].loss += Math.abs(tx.amount);
                }
            }
        });


        // LYD Profits
        const calculateCogs = () => {
             // Cash accumulators
            let totalLydForUsd_cash = 0, totalUsdBought_cash = 0;
            let totalLydForEur_cash = 0, totalEurBought_cash = 0;
            let totalLydForTnd_cash = 0, totalTndBought_cash = 0;
            let totalLydForSar_cash = 0, totalSarBought_cash = 0;
            let totalLydForEgp_cash = 0, totalEgpBought_cash = 0;
            // Bank accumulators
            let totalLydForUsd_bank = 0, totalUsdBought_bank = 0;
            let totalLydForEur_bank = 0, totalEurBought_bank = 0;
            let totalLydForTnd_bank = 0, totalTndBought_bank = 0;
            let totalLydForSar_bank = 0, totalSarBought_bank = 0;
            let totalLydForEgp_bank = 0, totalEgpBought_bank = 0;

            const bankIds = new Set(banks.map(b => b.id));
            
            transactions.forEach(tx => {
                if (tx.isDeleted || !tx.metadata) return;

                if (tx.metadata.groupType === 'BUY_USD') {
                    const isBankPurchase = tx.metadata.lydSource === 'bank';
                    if (isBankPurchase) {
                        totalLydForUsd_bank += tx.metadata.lydAmount || 0;
                        totalUsdBought_bank += tx.metadata.usdAmount || 0;
                    } else {
                        totalLydForUsd_cash += tx.metadata.lydAmount || 0;
                        totalUsdBought_cash += tx.metadata.usdAmount || 0;
                    }
                } else if (tx.metadata.groupType === 'BUY_OTHER') {
                    const isBankPurchase = tx.metadata.lydSource?.type === 'bank';
                    const amount = tx.metadata.foreignAmount || 0;
                    const lydAmount = tx.metadata.lydAmount || 0;

                    if (tx.metadata.foreignCurrency === Currency.EUR) {
                        if (isBankPurchase) {
                            totalLydForEur_bank += lydAmount;
                            totalEurBought_bank += amount;
                        } else {
                            totalLydForEur_cash += lydAmount;
                            totalEurBought_cash += amount;
                        }
                    } else if (tx.metadata.foreignCurrency === Currency.TND) {
                         if (isBankPurchase) {
                            totalLydForTnd_bank += lydAmount;
                            totalTndBought_bank += amount;
                        } else {
                            totalLydForTnd_cash += lydAmount;
                            totalTndBought_cash += amount;
                        }
                    } else if (tx.metadata.foreignCurrency === Currency.SAR) {
                        if (isBankPurchase) {
                            totalLydForSar_bank += lydAmount;
                            totalSarBought_bank += amount;
                        } else {
                            totalLydForSar_cash += lydAmount;
                            totalSarBought_cash += amount;
                        }
                    } else if (tx.metadata.foreignCurrency === Currency.EGP) {
                        if (isBankPurchase) {
                            totalLydForEgp_bank += lydAmount;
                            totalEgpBought_bank += amount;
                        } else {
                            totalLydForEgp_cash += lydAmount;
                            totalEgpBought_cash += amount;
                        }
                    }
                }
            });

            // Handle Dollar Card Purchases
            let totalLydFromBankForAllCards = 0;
            let totalLydFromCashForAllCards = 0;
            let totalUsdReceivedForAllCards = 0;

            dollarCardPurchases.forEach(p => {
                if (p.status === 'completed' && p.completionDetails && !p.isArchived) {
                    totalUsdReceivedForAllCards += p.completionDetails.receivedUsdAmount;
                    p.payments.forEach(payment => {
                        if (bankIds.has(payment.source)) {
                            totalLydFromBankForAllCards += payment.amount;
                        } else if (payment.source !== 'external') { // Assuming non-bank is cash
                            totalLydFromCashForAllCards += payment.amount;
                        }
                    });
                }
            });

            const totalLydPaidForAllCards = totalLydFromBankForAllCards + totalLydFromCashForAllCards;
            if (totalLydPaidForAllCards > 0 && totalUsdReceivedForAllCards > 0) {
                const usdFromBankPortion = (totalLydFromBankForAllCards / totalLydPaidForAllCards) * totalUsdReceivedForAllCards;
                const usdFromCashPortion = (totalLydFromCashForAllCards / totalLydPaidForAllCards) * totalUsdReceivedForAllCards;
                
                totalLydForUsd_bank += totalLydFromBankForAllCards;
                totalUsdBought_bank += usdFromBankPortion;
                totalLydForUsd_cash += totalLydFromCashForAllCards;
                totalUsdBought_cash += usdFromCashPortion;
            }

            return {
                cash: {
                    USD: totalUsdBought_cash > 0 ? totalLydForUsd_cash / totalUsdBought_cash : 0,
                    EUR: totalEurBought_cash > 0 ? totalLydForEur_cash / totalEurBought_cash : 0,
                    TND: totalTndBought_cash > 0 ? totalLydForTnd_cash / totalTndBought_cash : 0,
                    SAR: totalSarBought_cash > 0 ? totalLydForSar_cash / totalSarBought_cash : 0,
                    EGP: totalEgpBought_cash > 0 ? totalLydForEgp_cash / totalEgpBought_cash : 0,
                },
                bank: {
                    USD: totalUsdBought_bank > 0 ? totalLydForUsd_bank / totalUsdBought_bank : 0,
                    EUR: totalEurBought_bank > 0 ? totalLydForEur_bank / totalEurBought_bank : 0,
                    TND: totalTndBought_bank > 0 ? totalLydForTnd_bank / totalTndBought_bank : 0,
                    SAR: totalSarBought_bank > 0 ? totalLydForSar_bank / totalSarBought_bank : 0,
                    EGP: totalEgpBought_bank > 0 ? totalLydForEgp_bank / totalEgpBought_bank : 0,
                }
            };
        };
        const cogs = calculateCogs();
        
        const periodPosTransactions = posTransactions.filter(tx => new Date(tx.date) >= startRange && new Date(tx.date) <= endRange && !tx.isArchived);
        
        // Fix: Use constructed Date object for accurate comparison with startRange and endRange
        const periodOperatingCosts = operatingCosts.filter(cost => {
            // Append T00:00:00 to interpret the date string as local time midnight
            const costDate = new Date(cost.date + 'T00:00:00');
            return costDate >= startRange && costDate <= endRange;
        });

        let tradingProfit = 0;
        const profitTransactionsDetails: TradingProfitDetail[] = [];
        const processedGroupIds = new Set<string>();
        
        periodTransactions.forEach(tx => {
            if (!tx.groupId || processedGroupIds.has(tx.groupId)) {
                return;
            }

            if (tx.metadata?.groupType === 'SELL_USD' || tx.metadata?.groupType === 'SELL_OTHER') {
                const saleRate = tx.metadata.rate;
                const amountSold = tx.metadata.usdAmount || tx.metadata.foreignAmount;
                const currency: 'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP' = tx.metadata.foreignCurrency || Currency.USD;
                
                const isBankSale = tx.metadata.lydDestination === 'bank' || tx.metadata.lydDestination?.type === 'bank';
                
                let costRate = 0;
                if(isBankSale) {
                    costRate = parseFloat(manualCogs.bank[currency]) || cogs.bank[currency];
                } else {
                    costRate = parseFloat(manualCogs.cash[currency]) || cogs.cash[currency];
                }

                if (costRate > 0) {
                    const transactionProfit = (saleRate - costRate) * amountSold;
                    tradingProfit += transactionProfit;
                    profitTransactionsDetails.push({
                        id: tx.id, date: tx.date, description: `بيع ${formatCurrency(amountSold, currency as Currency)}`,
                        saleRate: saleRate, costRate: costRate, profit: transactionProfit, currency: Currency.LYD,
                    });
                }
                processedGroupIds.add(tx.groupId);
            }
        });

        const manualAdjustments = periodTransactions.filter(
            tx => (tx.metadata?.isProfit || tx.metadata?.isLoss) && tx.currency === Currency.LYD
        );

        const manualProfits = manualAdjustments
            .filter(tx => tx.metadata?.isProfit === true)
            .reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
        
        const manualLosses = manualAdjustments
            .filter(tx => tx.metadata?.isLoss === true)
            .reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);


        const posProfit = periodPosTransactions.reduce((sum, tx) => sum + tx.netProfit, 0);
        const exchangeFees = periodTransactions
            .filter(tx => tx.metadata?.isProfit && tx.metadata?.groupType === 'USD_EXCHANGE')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const totalProfit = tradingProfit + posProfit + exchangeFees + manualProfits;

        const totalOperatingCosts = periodOperatingCosts.reduce((sum, cost) => sum + cost.amount, 0);
        const totalCosts = totalOperatingCosts + manualLosses;
        const netProfit = totalProfit - totalCosts;

        const profitBreakdown = [
            { label: 'أرباح تداول العملات', value: tradingProfit, color: '#3b82f6' }, // blue-500
            { label: 'أرباح P.O.S (الصافي)', value: posProfit, color: '#8b5cf6' }, // violet-500
            { label: 'أرباح فرق الحوالات', value: exchangeFees, color: '#10b981' }, // emerald-500
            { label: 'أرباح يدوية (دينار)', value: manualProfits, color: '#f59e0b' }, // amber-500
        ].filter(item => Math.abs(item.value) > 0.001);

        const groupedCosts: { [key: string]: number } = {};
        periodOperatingCosts.forEach(cost => {
            // Fix: Append (خارجي) label if source is external to distinguish it
            const label = cost.source === 'external' ? `${cost.expenseTypeName} (خارجي)` : cost.expenseTypeName;
            groupedCosts[label] = (groupedCosts[label] || 0) + cost.amount;
        });

        const costColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']; // red, orange, yellow, lime, green
        const costBreakdownGrouped = Object.entries(groupedCosts).map(([label, amount], index) => ({ label, value: amount, color: costColors[index % costColors.length] }));
        
        const costBreakdown = [
            ...costBreakdownGrouped,
            { label: 'خسائر يدوية (دينار)', value: manualLosses, color: '#6366f1' } // indigo-500
        ].filter(item => Math.abs(item.value) > 0.001);

        return { 
            profitData: { totalProfit, totalCosts, netProfit, profitBreakdown, costBreakdown, profitTransactions: profitTransactionsDetails, cogs: { cash: cogs.cash, bank: cogs.bank } },
            otherCurrencyProfitsAndLosses: otherCurrenciesResult,
            capitalEvolution: evolution,
        };
    }, [period, startDate, endDate, transactions, posTransactions, operatingCosts, dollarCardPurchases, banks, manualCogs, capitalHistory, showCapitalEvolution]);

    const handleManualCogsChange = (type: 'cash' | 'bank', currency: 'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP', value: string) => {
        setManualCogs(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [currency]: value,
            },
        }));
    };

     const handleOpenTradingProfitModal = () => {
        if (profitData.profitTransactions.length > 0) {
            setTradingProfitDetails(profitData.profitTransactions);
            setIsTradingProfitModalOpen(true);
        }
    };
    
    // ... render logic ...
    const inputClasses = "bg-gray-200 dark:bg-dark-card p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold";

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">تحليل الأرباح والخسائر</h3>
                    <p className="text-gray-500 dark:text-gray-400">نظرة عامة على الأداء المالي للشركة.</p>
                </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="flex gap-1 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border">
                        {(['daily', 'weekly', 'monthly', 'custom'] as const).map(p => (
                            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg/50'}`}>
                                {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : p === 'monthly' ? 'شهري' : 'وقت مخصص'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <label htmlFor="capital-evolution-toggle" className="font-medium text-sm text-gray-700 dark:text-gray-300">إظهار تطور رأس المال</label>
                        <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                            <input
                                id="capital-evolution-toggle"
                                type="checkbox"
                                checked={showCapitalEvolution}
                                onChange={() => setShowCapitalEvolution(prev => !prev)}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer start-0"
                            />
                            <label htmlFor="capital-evolution-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"></label>
                        </div>
                    </div>
                </div>
            </div>

            {period === 'custom' && (
                <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-100 dark:bg-dark-bg/50 rounded-lg animate-fade-in">
                    <label htmlFor="startDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">من تاريخ:</label>
                    <input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClasses} />
                    <label htmlFor="endDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">إلى تاريخ:</label>
                    <input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClasses} />
                </div>
            )}
            
            {/* ... Rest of ProfitView JSX (Charts, Cards, etc.) ... */}
            {/* Same content as before */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-500/20 text-center">
                    <TrendingUp className="mx-auto w-8 h-8 text-green-500 mb-2"/>
                    <p className="text-sm text-green-700 dark:text-green-300">إجمالي الأرباح (دينار)</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 font-mono">{formatCurrency(Math.max(0, profitData.totalProfit), Currency.LYD)}</p>
                </div>
                 <div className="p-6 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-500/20 text-center">
                    <TrendingDown className="mx-auto w-8 h-8 text-red-500 mb-2"/>
                    <p className="text-sm text-red-700 dark:text-red-300">إجمالي التكاليف (دينار)</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 font-mono">{formatCurrency(profitData.totalCosts, Currency.LYD)}</p>
                </div>
                 <div className={`p-6 rounded-xl border text-center ${profitData.netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-500/20' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-500/20'}`}>
                    <Sigma className={`mx-auto w-8 h-8 mb-2 ${profitData.netProfit >= 0 ? 'text-blue-500' : 'text-red-500'}`}/>
                    <p className={`text-sm ${profitData.netProfit >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>صافي الربح (دينار)</p>
                    <p className={`text-3xl font-bold font-mono ${profitData.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(profitData.netProfit, Currency.LYD)}</p>
                </div>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="الأرباح مقابل التكاليف">
                    <div className="flex items-end justify-around h-full gap-8">
                        <div className="flex flex-col items-center">
                            <div className="font-bold text-green-500">{formatCurrency(profitData.totalProfit, Currency.LYD)}</div>
                            <div className="w-16 bg-green-500 rounded-t-lg" style={{ height: `${(profitData.totalProfit / (profitData.totalProfit + profitData.totalCosts || 1)) * 100}%` }}></div>
                            <div className="text-xs mt-1">الأرباح</div>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="font-bold text-red-500">{formatCurrency(profitData.totalCosts, Currency.LYD)}</div>
                            <div className="w-16 bg-red-500 rounded-t-lg" style={{ height: `${(profitData.totalCosts / (profitData.totalProfit + profitData.totalCosts || 1)) * 100}%` }}></div>
                            <div className="text-xs mt-1">التكاليف</div>
                        </div>
                    </div>
                </ChartCard>
                 <ChartCard title="مصادر الأرباح (دينار)">
                    <DonutChart data={profitData.profitBreakdown} />
                 </ChartCard>
                 <ChartCard title="تفاصيل التكاليف (دينار)">
                     <DonutChart data={profitData.costBreakdown} />
                 </ChartCard>
            </div>
            {/* ... Lists ... */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><BarChart size={20}/> مصادر الأرباح (دينار)</h4>
                    <ul className="space-y-2">
                        {profitData.profitBreakdown.length > 0 ? profitData.profitBreakdown.map(item => {
                             if (item.label === 'أرباح تداول العملات') {
                                return (
                                    <li key={item.label}>
                                        <TradingProfitManager
                                            label={item.label}
                                            amount={item.value}
                                            cogs={profitData.cogs}
                                            manualCogs={manualCogs}
                                            onManualCogsChange={handleManualCogsChange}
                                            onDetailsClick={handleOpenTradingProfitModal}
                                        />
                                    </li>
                                );
                            }
                             return (
                                <li key={item.label} className="flex justify-between text-sm p-2 bg-white dark:bg-dark-card rounded-md">
                                    <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                                    <span className={`font-semibold font-mono ${item.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(item.value, Currency.LYD)}</span>
                                </li>
                            );
                        }) : <p className="text-sm text-gray-500 text-center p-4">لا توجد أرباح مسجلة لهذه الفترة.</p>}
                    </ul>
                </div>
                <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
                    <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"><BarChart size={20}/> مصادر التكاليف (الخسائر) (دينار)</h4>
                    <ul className="space-y-2">
                        {profitData.costBreakdown.length > 0 ? profitData.costBreakdown.map(item => (
                             <li key={item.label} className="flex justify-between text-sm p-2 bg-white dark:bg-dark-card rounded-md">
                                <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                                <span className="font-semibold text-red-500 font-mono">{formatCurrency(item.value, Currency.LYD)}</span>
                            </li>
                        )) : <p className="text-sm text-gray-500 text-center p-4">لا توجد تكاليف مسجلة لهذه الفترة.</p>}
                    </ul>
                </div>
            </div>
            
            <div className="p-6 bg-gray-50 dark:bg-dark-bg rounded-lg">
                <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <BarChart size={20}/> أرباح وخسائر العملات الأخرى (يدوي)
                </h4>
                <div className="space-y-2">
                    {(['USD', 'EUR', 'TND', 'SAR', 'EGP'] as const).map(curr => {
                        const { profit, loss } = otherCurrencyProfitsAndLosses[curr];
                        if (profit === 0 && loss === 0) return null;

                        return (
                            <div key={curr} className="p-2 bg-white dark:bg-dark-card rounded-md">
                                <div className="flex justify-between items-center text-sm font-semibold">
                                    <span className="text-gray-700 dark:text-gray-300">{`عملة ${curr}`}</span>
                                    <div className="flex gap-4">
                                        {profit > 0 && (
                                            <span className="font-mono text-green-500">
                                                ربح: +{formatCurrency(profit, curr as Currency)}
                                            </span>
                                        )}
                                        {loss > 0 && (
                                            <span className="font-mono text-red-500">
                                                خسارة: -{formatCurrency(loss, curr as Currency)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {/* FIX: Explicitly type 'v' to resolve TypeScript error on Object.values return type */}
                    {Object.values(otherCurrencyProfitsAndLosses).every((v: { profit: number; loss: number; }) => v.profit === 0 && v.loss === 0) && (
                        <p className="text-sm text-gray-500 text-center p-4">لا توجد أرباح أو خسائر مسجلة لهذه الفترة.</p>
                    )}
                </div>
            </div>

            <Modal isOpen={isTradingProfitModalOpen} onClose={() => setIsTradingProfitModalOpen(false)} title="تفاصيل أرباح وخسائر تداول العملات" size="2xl">
                {/* ... Modal content ... */}
                 <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">التاريخ</th>
                                <th className="px-4 py-3">الوصف</th>
                                <th className="px-4 py-3">سعر البيع</th>
                                <th className="px-4 py-3">سعر التكلفة</th>
                                <th className="px-4 py-3">الربح/الخسارة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {tradingProfitDetails.map(detail => (
                                <tr key={detail.id}>
                                    <td className="px-4 py-2 whitespace-nowrap">{formatDate(detail.date)}</td>
                                    <td className="px-4 py-2">{detail.description}</td>
                                    <td className="px-4 py-2 font-mono text-green-500">{detail.saleRate.toFixed(4)}</td>
                                    <td className="px-4 py-2 font-mono text-red-500">{detail.costRate.toFixed(4)}</td>
                                    <td className={`px-4 py-2 font-mono font-semibold ${detail.profit >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>{formatCurrency(detail.profit, detail.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {tradingProfitDetails.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد معاملات رابحة في هذه الفترة.</p>}
                </div>
            </Modal>
        </div>
    );
};


const ClosingPage: React.FC = () => {
    // ... ClosingPage component logic ...
    const { assets, banks, getTotalDebts, getTotalReceivables, hasPermission, getActiveDollarCardSpend, capitalHistory, addCapitalHistoryEntry, exportData, transactions, isDetailedView, setIsDetailedView, posTransactions, operatingCosts, dollarCardPurchases } = useAppContext();
    const [view, setView] = useState<'capital' | 'profits'>('capital');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rates, setRates] = useState({ USD: '', EUR: '', TND: '', SAR: '', EGP: '' });
    const [finalLydCapital, setFinalLydCapital] = useState<number | null>(null);
    const [breakdownVisible, setBreakdownVisible] = useState<Currency | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<CapitalHistoryEntry | null>(null);
    
    // ... Existing state ...
    const [useMultiRate, setUseMultiRate] = useState({ USD: false, EUR: false, TND: false, SAR: false, EGP: false });
    const [multiRates, setMultiRates] = useState({
        USD: [{ amount: '', rate: '' }],
        EUR: [{ amount: '', rate: '' }],
        TND: [{ amount: '', rate: '' }],
        SAR: [{ amount: '', rate: '' }],
        EGP: [{ amount: '', rate: '' }],
    });

    const [shouldExport, setShouldExport] = useState(true);
    const [calculationError, setCalculationError] = useState<string | null>(null);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // ... Existing useEffects and calculations (breakdownDetails, capital, handleCalculate) ...
    // NOTE: Keep existing implementations of breakdownDetails, capital, handleCalculate, etc.
    // Copying them completely to ensure context is valid.

    useEffect(() => {
        if (!isModalOpen) {
            setRates({ USD: '', EUR: '', TND: '', SAR: '', EGP: '' });
            setUseMultiRate({ USD: false, EUR: false, TND: false, SAR: false, EGP: false });
            setMultiRates({
                USD: [{ amount: '', rate: '' }],
                EUR: [{ amount: '', rate: '' }],
                TND: [{ amount: '', rate: '' }],
                SAR: [{ amount: '', rate: '' }],
                EGP: [{ amount: '', rate: '' }],
            });
            setCalculationError(null);
        }
    }, [isModalOpen]);


    const breakdownDetails = useMemo(() => {
        const totalLydDebts = getTotalDebts(Currency.LYD);
        const totalUsdDebts = getTotalDebts(Currency.USD);
        const totalEurDebts = getTotalDebts(Currency.EUR);
        const totalTndDebts = getTotalDebts(Currency.TND);
        const totalSarDebts = getTotalDebts(Currency.SAR);
        const totalEgpDebts = getTotalDebts(Currency.EGP);
        const totalLydReceivables = getTotalReceivables(Currency.LYD);
        const totalUsdReceivables = getTotalReceivables(Currency.USD);
        const totalEurReceivables = getTotalReceivables(Currency.EUR);
        const totalTndReceivables = getTotalReceivables(Currency.TND);
        const totalSarReceivables = getTotalReceivables(Currency.SAR);
        const totalEgpReceivables = getTotalReceivables(Currency.EGP);
        const activeDollarCardSpend = getActiveDollarCardSpend().totalSpend;

        if (isDetailedView) {
            const lydCashItems = LYD_CASH_ASSET_IDS.map(assetId => ({
                label: ASSET_NAMES[assetId],
                value: assets[assetId],
                sign: '+' as const
            }));

            const bankItems = banks.map(bank => ({
                label: bank.name,
                value: bank.balance,
                sign: '+' as const
            }));

            const lydBreakdown = [
                ...lydCashItems,
                ...bankItems,
                { label: 'مجموع الديون', value: totalLydDebts, sign: '+' as const },
                { label: 'معاملات البطاقات $', value: activeDollarCardSpend, sign: '+' as const },
                { label: 'مجموع المستحقات', value: totalLydReceivables, sign: '-' as const }
            ];

            return {
                lyd: lydBreakdown,
                usd: [
                    { label: ASSET_NAMES.cashUsdLibya, value: assets.cashUsdLibya, sign: '+' as const },
                    { label: ASSET_NAMES.cashUsdTurkey, value: assets.cashUsdTurkey, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalUsdDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalUsdReceivables, sign: '-' as const },
                ],
                eur: [
                    { label: ASSET_NAMES.cashEurLibya, value: assets.cashEurLibya, sign: '+' as const },
                    { label: ASSET_NAMES.cashEurTurkey, value: assets.cashEurTurkey, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalEurDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalEurReceivables, sign: '-' as const },
                ],
                tnd: [
                    { label: ASSET_NAMES.cashTnd, value: assets.cashTnd, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalTndDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalTndReceivables, sign: '-' as const },
                ],
                sar: [
                    { label: ASSET_NAMES.cashSar, value: assets.cashSar, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalSarDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalSarReceivables, sign: '-' as const },
                ],
                egp: [
                    { label: ASSET_NAMES.cashEgp, value: assets.cashEgp, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalEgpDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalEgpReceivables, sign: '-' as const },
                ],
            };
        } else {
            const totalLydCash = LYD_CASH_ASSET_IDS.reduce((sum, assetId) => sum + assets[assetId], 0);
            const totalBankBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);
            const totalUsdCash = assets.cashUsdLibya + assets.cashUsdTurkey;
            const totalEurCash = assets.cashEurLibya + assets.cashEurTurkey;

            return {
                lyd: [
                    { label: 'مجموع الخزنات', value: totalLydCash, sign: '+' as const },
                    { label: 'مجموع المصارف', value: totalBankBalance, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalLydDebts, sign: '+' as const },
                    { label: 'معاملات البطاقات $', value: activeDollarCardSpend, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalLydReceivables, sign: '-' as const }
                ],
                usd: [
                    { label: 'مجموع الخزنات', value: totalUsdCash, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalUsdDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalUsdReceivables, sign: '-' as const }
                ],
                eur: [
                    { label: 'مجموع الخزنات', value: totalEurCash, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalEurDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalEurReceivables, sign: '-' as const }
                ],
                tnd: [
                    { label: ASSET_NAMES.cashTnd, value: assets.cashTnd, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalTndDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalTndReceivables, sign: '-' as const }
                ],
                sar: [
                    { label: ASSET_NAMES.cashSar, value: assets.cashSar, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalSarDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalSarReceivables, sign: '-' as const }
                ],
                egp: [
                    { label: ASSET_NAMES.cashEgp, value: assets.cashEgp, sign: '+' as const },
                    { label: 'مجموع الديون', value: totalEgpDebts, sign: '+' as const },
                    { label: 'مجموع المستحقات', value: totalEgpReceivables, sign: '-' as const }
                ]
            };
        }
    }, [assets, banks, getTotalDebts, getTotalReceivables, getActiveDollarCardSpend, isDetailedView]);

    const capital: Record<string, number> = useMemo(() => {
        const lydCapital = breakdownDetails.lyd.reduce((sum, item) => sum + (item.sign === '+' ? item.value : -item.value), 0);
        const usdCapital = breakdownDetails.usd.reduce((sum, item) => sum + (item.sign === '+' ? item.value : -item.value), 0);
        const eurCapital = breakdownDetails.eur.reduce((sum, item) => sum + (item.sign === '+' ? item.value : -item.value), 0);
        const tndCapital = breakdownDetails.tnd.reduce((sum, item) => sum + (item.sign === '+' ? item.value : -item.value), 0);
        const sarCapital = breakdownDetails.sar.reduce((sum, item) => sum + (item.sign === '+' ? item.value : -item.value), 0);
        const egpCapital = breakdownDetails.egp.reduce((sum, item) => sum + (item.sign === '+' ? item.value : -item.value), 0);

        return {
            LYD: lydCapital,
            USD: usdCapital,
            EUR: eurCapital,
            TND: tndCapital,
            SAR: sarCapital,
            EGP: egpCapital,
        };
    }, [breakdownDetails]);

    const handleCalculate = () => {
        setCalculationError(null);
        
        const historyRates: CapitalHistoryEntry['rates'] = { USD: 0, EUR: 0, TND: 0, SAR: 0, EGP: 0 };
        let totalFromForeign = 0;

        for (const curr of ['USD', 'EUR', 'TND', 'SAR', 'EGP'] as const) {
            const capitalValue = capital[curr] as number;
            
            if (useMultiRate[curr]) {
                const parts = multiRates[curr];
                const totalAllocated = parts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                
                if (Math.abs(totalAllocated - capitalValue) > 0.001) {
                    setCalculationError(`مجموع المبالغ الموزعة لـ ${curr} (${totalAllocated.toFixed(2)}) لا يساوي إجمالي رأس المال (${capitalValue.toFixed(2)}).`);
                    return;
                }

                let currencyTotal = 0;
                const historyParts: { amount: number; rate: number }[] = [];
                for (const part of parts) {
                    const amount = parseFloat(part.amount);
                    const rate = parseFloat(part.rate);
                    if ((isNaN(amount) || isNaN(rate) || amount < 0 || rate < 0) && (part.amount !== '' || part.rate !== '')) {
                        setCalculationError(`بيانات غير صالحة في أحد أجزاء ${curr}.`);
                        return;
                    }
                    if (amount > 0) {
                        currencyTotal += amount * rate;
                        historyParts.push({ amount, rate });
                    }
                }
                totalFromForeign += currencyTotal;
                historyRates[curr] = historyParts;

            } else {
                const rate = parseFloat(rates[curr]);
                if (isNaN(rate) && capitalValue !== 0) {
                    setCalculationError(`يرجى إدخال سعر صرف صحيح لـ ${curr}.`);
                    return;
                }
                totalFromForeign += capitalValue * (rate || 0);
                historyRates[curr] = rate || 0;
            }
        }

        const total = (capital[Currency.LYD] as number) + totalFromForeign;
        
        setFinalLydCapital(total);
        
        const newEntry: CapitalHistoryEntry = {
            date: getLocalISOString(),
            finalLydCapital: total,
            rates: historyRates,
            capitalBreakdown: capital as CapitalHistoryEntry['capitalBreakdown'],
            detailedBreakdown: breakdownDetails as CapitalHistoryEntry['detailedBreakdown']
        };
        
        addCapitalHistoryEntry(newEntry);

        if (shouldExport) {
            try {
                const newCapitalHistoryForExport = [newEntry, ...(capitalHistory || [])].slice(0, 100);
                const dataString = exportData({ capitalHistory: newCapitalHistoryForExport });

                const blob = new Blob([dataString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                const now = new Date();
                const datePart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                const timePart = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0') + '-' + String(now.getSeconds()).padStart(2, '0');
                a.download = `kayan_backup_after_closing_${datePart}_${timePart}.json`;

                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error("Failed to auto-export data after closing:", error);
                alert('فشل تصدير النسخة الاحتياطية تلقائياً.');
            }
        }

        setIsModalOpen(false);
    };


    const toggleBreakdown = (currency: Currency) => {
        setBreakdownVisible(prev => prev === currency ? null : currency);
    };
    
    const handleMultiRateChange = (currency: 'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP', index: number, field: 'amount' | 'rate', value: string) => {
        setCalculationError(null);
        const newRates = [...multiRates[currency]];
        newRates[index] = { ...newRates[index], [field]: value.replace(/[^0-9.]/g, '') };
        setMultiRates(prev => ({ ...prev, [currency]: newRates }));
    };

    const addMultiRatePart = (currency: 'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP') => {
        setMultiRates(prev => ({
            ...prev,
            [currency]: [...prev[currency], { amount: '', rate: '' }]
        }));
    };

    const removeMultiRatePart = (currency: 'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP', index: number) => {
        setMultiRates(prev => ({
            ...prev,
            [currency]: prev[currency].filter((_, i) => i !== index)
        }));
    };
    
    const remainingAmount = useMemo(() => {
        const calcRemaining = (currency: Currency.USD | Currency.EUR | Currency.TND | Currency.SAR | Currency.EGP) => {
            const total = capital[currency] as number;
            const allocated = multiRates[currency].reduce((sum, part) => sum + (parseFloat(part.amount) || 0), 0);
            return total - allocated;
        };
        return {
            USD: calcRemaining(Currency.USD),
            EUR: calcRemaining(Currency.EUR),
            TND: calcRemaining(Currency.TND),
            SAR: calcRemaining(Currency.SAR),
            EGP: calcRemaining(Currency.EGP),
        };
    }, [multiRates, capital]);


    const modalInputClasses = "mt-1 w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";

    const renderBreakdown = (currency: Currency.LYD | Currency.USD | Currency.EUR | Currency.TND | Currency.SAR | Currency.EGP) => {
        let details: { label: string; value: number; sign: string; }[] | undefined;
        switch(currency) {
            case Currency.LYD: details = breakdownDetails.lyd; break;
            case Currency.USD: details = breakdownDetails.usd; break;
            case Currency.EUR: details = breakdownDetails.eur; break;
            case Currency.TND: details = breakdownDetails.tnd; break;
            case Currency.SAR: details = breakdownDetails.sar; break;
            case Currency.EGP: details = breakdownDetails.egp; break;
            default: return null;
        }

        if (!details) return null;

        return (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-dark-bg rounded-lg space-y-2 text-sm animate-fade-in">
                <h4 className="font-bold text-gray-700 dark:text-gray-300">تفاصيل رأس المال ({currency})</h4>
                {details.map(item => (
                    <p key={item.label} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        <span>{item.sign} {item.label}:</span> 
                        <span className="font-mono">{formatCurrency(item.value, currency as Currency)}</span>
                    </p>
                ))}
                <hr className="border-gray-300 dark:border-dark-border"/>
                <p className="flex justify-between font-bold text-gray-800 dark:text-gray-100">
                    <span>= الإجمالي:</span> 
                    <span className="font-mono">{formatCurrency(capital[currency] as number, currency as Currency)}</span>
                </p>
            </div>
        );
    };

    const renderRateDetails = (rateInfo: number | { amount: number; rate: number }[], currency: Currency) => {
        if (typeof rateInfo === 'number') {
            return <span className="font-mono text-yellow-300">{rateInfo || 'N/A'}</span>;
        }
        if (Array.isArray(rateInfo) && rateInfo.length > 0) {
            return (
                <div className="pl-4 mt-1 space-y-1">
                    {rateInfo.map((part, index) => (
                        <div key={index} className="font-mono text-yellow-300 flex justify-between items-center">
                           <span className="text-gray-300">{formatCurrency(part.amount, currency)}</span>
                           <span className="text-gray-400 mx-2">@</span>
                           <span>{part.rate}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return <span className="font-mono text-yellow-300">N/A</span>;
    }

    // New: Calculate Profit Data for Printing
    const getProfitDataForPeriod = (startDate: Date, endDate: Date): ProfitData => {
        const periodTransactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= endDate && !tx.isDeleted;
        });

        // 1. Trading Profit
        let tradingProfit = 0;
        const processedGroupIds = new Set<string>();
        
        // Simplified COGS calculation for print report (using average if not available) or just simple logic
        // Replicating the full logic from ProfitsView is complex here.
        // For simplicity, we will calculate based on metadata which ideally should have profit info,
        // BUT our metadata stores cost/sale separately. 
        // We will do a best-effort calculation similar to ProfitsView.
        
        // Helper to get average cost
        const calculateAverageCost = (currency: 'USD' | 'EUR' | 'TND' | 'SAR' | 'EGP') => {
             let totalLyd = 0;
             let totalForeign = 0;
             transactions.forEach(tx => {
                 if (tx.isDeleted || !tx.metadata) return;
                 // Buy logic
                 if (tx.metadata.groupType === 'BUY_USD' && currency === 'USD') {
                     totalLyd += tx.metadata.lydAmount || 0;
                     totalForeign += tx.metadata.usdAmount || 0;
                 } else if (tx.metadata.groupType === 'BUY_OTHER' && tx.metadata.foreignCurrency === currency) {
                     totalLyd += tx.metadata.lydAmount || 0;
                     totalForeign += tx.metadata.foreignAmount || 0;
                 }
             });
             // Add Dollar Cards for USD
             if (currency === 'USD') {
                 dollarCardPurchases.forEach(p => {
                     if (p.status === 'completed' && p.completionDetails && !p.isArchived) {
                         totalForeign += p.completionDetails.receivedUsdAmount;
                         totalLyd += p.payments.reduce((sum, pay) => sum + pay.amount, 0);
                     }
                 });
             }
             return totalForeign > 0 ? totalLyd / totalForeign : 0;
        };

        const avgCostUSD = calculateAverageCost('USD');
        const avgCostEUR = calculateAverageCost('EUR');
        const avgCostTND = calculateAverageCost('TND');
        const avgCostSAR = calculateAverageCost('SAR');
        const avgCostEGP = calculateAverageCost('EGP');

        periodTransactions.forEach(tx => {
            if (!tx.groupId || processedGroupIds.has(tx.groupId)) return;

            if (tx.metadata?.groupType === 'SELL_USD' || tx.metadata?.groupType === 'SELL_OTHER') {
                const saleRate = tx.metadata.rate;
                const amountSold = tx.metadata.usdAmount || tx.metadata.foreignAmount;
                const currency = tx.metadata.foreignCurrency || Currency.USD;
                let costRate = 0;
                if (currency === 'USD') costRate = avgCostUSD;
                else if (currency === 'EUR') costRate = avgCostEUR;
                else if (currency === 'TND') costRate = avgCostTND;
                else if (currency === 'SAR') costRate = avgCostSAR;
                else if (currency === 'EGP') costRate = avgCostEGP;

                if (costRate > 0) {
                    tradingProfit += (saleRate - costRate) * amountSold;
                }
                processedGroupIds.add(tx.groupId);
            }
        });

        // 2. Manual Profits/Losses
        const manualAdjustments = periodTransactions.filter(
            tx => (tx.metadata?.isProfit || tx.metadata?.isLoss) && tx.currency === Currency.LYD
        );
        const manualProfits = manualAdjustments
            .filter(tx => tx.metadata?.isProfit === true)
            .reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
        const manualLosses = manualAdjustments
            .filter(tx => tx.metadata?.isLoss === true)
            .reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);

        // 3. POS Profit
        const periodPos = posTransactions.filter(tx => {
            const d = new Date(tx.date);
            return d >= startDate && d <= endDate && !tx.isArchived;
        });
        const posProfit = periodPos.reduce((sum, tx) => sum + tx.netProfit, 0);

        // 4. Exchange Fees
        const exchangeFees = periodTransactions
            .filter(tx => tx.metadata?.isProfit && tx.metadata?.groupType === 'USD_EXCHANGE')
            .reduce((sum, tx) => sum + tx.amount, 0);

        // 5. Operating Costs
        const periodCosts = operatingCosts.filter(cost => {
            // Fix: Construct local date object to include costs from the same day correctly
            const d = new Date(cost.date + 'T00:00:00');
            return d >= startDate && d <= endDate;
        });
        const totalOperatingCosts = periodCosts.reduce((sum, cost) => sum + cost.amount, 0);

        const totalProfit = tradingProfit + posProfit + exchangeFees + manualProfits;
        const totalCosts = totalOperatingCosts + manualLosses;
        const netProfit = totalProfit - totalCosts;

        const profitBreakdown = [
            { label: 'أرباح تداول العملات', value: tradingProfit, color: '#3b82f6' },
            { label: 'أرباح P.O.S (الصافي)', value: posProfit, color: '#8b5cf6' },
            { label: 'أرباح فرق الحوالات', value: exchangeFees, color: '#10b981' },
            { label: 'أرباح يدوية', value: manualProfits, color: '#f59e0b' },
        ].filter(item => Math.abs(item.value) > 0.001);

        const groupedCosts: { [key: string]: number } = {};
        periodCosts.forEach(cost => {
            // Fix: Distinct label for external costs in print report
            const label = cost.source === 'external' ? `${cost.expenseTypeName} (خارجي)` : cost.expenseTypeName;
            groupedCosts[label] = (groupedCosts[label] || 0) + cost.amount;
        });
        
        const costColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
        const costBreakdown = Object.entries(groupedCosts).map(([label, amount], index) => ({
            label, value: amount, color: costColors[index % costColors.length]
        }));
        if (manualLosses > 0) costBreakdown.push({ label: 'خسائر يدوية', value: manualLosses, color: '#6366f1' });

        return { totalProfit, totalCosts, netProfit, profitBreakdown, costBreakdown };
    };


    return (
        <>
            <div className="flex gap-2 rounded-lg bg-gray-200 dark:bg-dark-card p-1 border border-gray-300 dark:border-dark-border mb-6">
                <button onClick={() => setView('capital')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'capital' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400'}`}>
                    <Scale size={16}/> رأس المال
                </button>
                <button onClick={() => setView('profits')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'profits' ? 'bg-white dark:bg-dark-bg shadow text-primary-dark dark:text-gold' : 'text-gray-600 dark:text-gray-400'}`}>
                   <TrendingUp size={16}/> الأرباح
                </button>
            </div>

            {view === 'capital' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">رأس المال النهائي</h2>
                        <div className="flex items-center gap-2 pt-1">
                            <label htmlFor="detailed-toggle" className="font-medium text-gray-700 dark:text-gray-300">مفصل</label>
                            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                <input
                                    id="detailed-toggle"
                                    type="checkbox"
                                    checked={isDetailedView}
                                    onChange={() => setIsDetailedView(prev => !prev)}
                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer start-0"
                                />
                                <label htmlFor="detailed-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"></label>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 -mt-6">ملخص إجمالي الأصول والديون والمستحقات بالعملات المختلفة.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                        {Object.entries(capital).map(([currency, amount]) => {
                            const canShowBreakdown = currency === Currency.LYD || currency === Currency.USD || currency === Currency.EUR || currency === Currency.TND || currency === Currency.SAR || currency === Currency.EGP;
                            return (
                                <div key={currency} className="bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-200 dark:border-dark-border flex flex-col">
                                    <button
                                        onClick={canShowBreakdown ? () => toggleBreakdown(currency as Currency) : undefined}
                                        className={`p-6 text-right w-full ${canShowBreakdown ? 'cursor-pointer' : 'cursor-default'}`}
                                        disabled={!canShowBreakdown}
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">رأس المال ({currency})</p>
                                            {canShowBreakdown && <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${breakdownVisible === currency ? 'rotate-180' : ''}`} />}
                                        </div>
                                        <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold font-mono">
                                            {formatCurrency(amount, currency as Currency)}
                                        </p>
                                    </button>
                                    {canShowBreakdown && breakdownVisible === currency && (
                                        <div className="px-6 pb-6">
                                            {renderBreakdown(currency as Currency.LYD | Currency.USD | Currency.EUR | Currency.TND | Currency.SAR | Currency.EGP)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">رأس المال الحقيقي بالدينار</h3>
                                <p className="text-gray-500 dark:text-gray-400">القيمة الإجمالية لرأس المال بعد تحويل جميع العملات إلى الدينار الليبي.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setIsPrintModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-lg shadow-green-500/20">
                                    <Printer size={18} />
                                    طباعة تقرير
                                </button>
                                {hasPermission('closing', 'calculate') && (
                                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary dark:bg-gradient-to-r from-gold-dark via-gold to-gold-light text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-all shadow-lg shadow-primary/20 dark:shadow-gold/20">
                                        <RefreshCw size={18} />
                                        تحديث رأس المال
                                    </button>
                                )}
                                 <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-all shadow-lg shadow-gray-500/20">
                                    <History size={18} />
                                    التاريخ
                                </button>
                            </div>
                        </div>
                        {finalLydCapital !== null && (
                            <div className="mt-6 p-8 bg-gray-50 dark:bg-dark-bg rounded-lg text-center animate-fade-in">
                                <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold font-mono">
                                    {formatCurrency(finalLydCapital, Currency.LYD)}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">تطور رأس المال (آخر 30 يوم)</h3>
                        <div className="h-80">
                            <CapitalHistoryChart data={capitalHistory} />
                        </div>
                    </div>
                </div>
            )}
            
            {view === 'profits' && <ProfitsView />}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="تحديث أسعار الصرف" size="2xl">
                {/* ... Modal content ... */}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        الرجاء إدخال قيمة كل عملة مقابل الدينار الليبي (LYD) لحساب رأس المال الحقيقي.
                    </p>
                    {(['USD', 'EUR', 'TND', 'SAR', 'EGP'] as const).map(curr => (
                        <div key={curr} className="p-4 border border-gray-200 dark:border-dark-border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-md font-bold text-gray-700 dark:text-gray-300">سعر صرف {curr}</label>
                                <div className="flex items-center">
                                    <label htmlFor={`multiRateToggle${curr}`} className="text-xs text-gray-400 me-2">حساب متعدد</label>
                                    <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                                        <input type="checkbox" id={`multiRateToggle${curr}`} checked={useMultiRate[curr]} 
                                               onChange={e => {
                                                   const isChecked = e.target.checked;
                                                   setUseMultiRate(prev => ({ ...prev, [curr]: isChecked }));
                                                   if (!isChecked) {
                                                       setMultiRates(prev => ({...prev, [curr]: [{ amount: '', rate: '' }] }));
                                                   }
                                               }}
                                               className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer start-0"/>
                                        <label htmlFor={`multiRateToggle${curr}`} className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"></label>
                                    </div>
                                </div>
                            </div>
                            
                            {useMultiRate[curr] ? (
                                <div className="p-3 mt-2 bg-gray-100 dark:bg-dark-bg/50 rounded-lg space-y-3">
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span>إجمالي رأس المال: <span className="font-mono text-blue-400">{formatCurrency(capital[curr] as number, curr as Currency)}</span></span>
                                        <span className={remainingAmount[curr] < 0 ? 'text-red-400' : 'text-green-400'}>المتبقي: <span className="font-mono">{formatCurrency(remainingAmount[curr], curr as Currency)}</span></span>
                                    </div>
                                    {multiRates[curr].map((part, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input type="text" placeholder="المبلغ" value={part.amount} onChange={e => handleMultiRateChange(curr, index, 'amount', e.target.value)} className={modalInputClasses} />
                                            <span className="text-gray-400">@</span>
                                            <input type="text" placeholder="السعر" value={part.rate} onChange={e => handleMultiRateChange(curr, index, 'rate', e.target.value)} className={modalInputClasses} />
                                            <button type="button" onClick={() => removeMultiRatePart(curr, index)} disabled={multiRates[curr].length === 1} className="p-2 text-red-500 disabled:opacity-50"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => addMultiRatePart(curr)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"><Plus size={16}/> إضافة جزء</button>
                                </div>
                            ) : (
                                <input type="text" inputMode="decimal" value={rates[curr]} onChange={e => {
                                    setRates(prev => ({ ...prev, [curr]: e.target.value.replace(/[^0-9.]/g, '') }));
                                    setCalculationError(null);
                                }} required={capital[curr] !== 0} className={modalInputClasses} placeholder={`مثال: 5.5`}/>
                            )}
                        </div>
                    ))}
                    
                    <div className="pt-4">
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="export-data-checkbox"
                                    name="export-data-checkbox"
                                    type="checkbox"
                                    checked={shouldExport}
                                    onChange={(e) => setShouldExport(e.target.checked)}
                                    className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold"
                                />
                            </div>
                            <div className="ms-3 text-sm">
                                <label htmlFor="export-data-checkbox" className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Download size={16}/>
                                    حفظ نسخة احتياطية من البيانات بعد الإغلاق
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    مفعل دائما. سيتم تنزيل ملف 백업.json تلقائياً.
                                </p>
                            </div>
                        </div>
                    </div>

                    {calculationError && (
                        <div className="p-3 mt-2 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500/50 rounded-md text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            <span>{calculationError}</span>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                         <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                         <button type="button" onClick={handleCalculate} className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">حساب</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="سجل رأس المال المحسوب" size="3xl">
                {/* ... History Modal Content (Same as before) ... */}
                <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-2">
                    {capitalHistory.length > 0 ? capitalHistory.map(historyItem => (
                        <div key={historyItem.date} className="bg-dark-bg rounded-lg border border-dark-border">
                            <button
                                onClick={() => setSelectedHistoryItem(prev => prev?.date === historyItem.date ? null : historyItem)}
                                className="w-full flex justify-between items-center p-4 text-right"
                            >
                                <div className='text-right'>
                                    <span className="font-bold text-lg text-gold-light font-mono">
                                       {formatCurrency(historyItem.finalLydCapital, Currency.LYD)}
                                    </span>
                                    <p className="text-xs text-gray-400">
                                       {formatDate(historyItem.date)}
                                    </p>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${selectedHistoryItem?.date === historyItem.date ? 'rotate-180' : ''}`} />
                            </button>
                            {selectedHistoryItem?.date === historyItem.date && (
                                <div className="p-4 border-t border-dark-border animate-fade-in text-xs">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-300 mb-2">أسعار الصرف المستخدمة:</h4>
                                            <div className="ps-4">
                                                <p>USD: {renderRateDetails(historyItem.rates.USD, Currency.USD)}</p>
                                                <p>EUR: {renderRateDetails(historyItem.rates.EUR, Currency.EUR)}</p>
                                                <p>TND: {renderRateDetails(historyItem.rates.TND, Currency.TND)}</p>
                                                <p>SAR: {renderRateDetails(historyItem.rates.SAR, Currency.SAR)}</p>
                                                <p>EGP: {renderRateDetails(historyItem.rates.EGP, Currency.EGP)}</p>
                                            </div>
                                        </div>
                            
                                        <div className="pt-2 mt-2 border-t border-dark-border">
                                            <h4 className="font-bold mb-1 text-gray-200">تفاصيل رأس المال (LYD)</h4>
                                            {historyItem.detailedBreakdown?.lyd ? (
                                                <div className="ps-4 space-y-1">
                                                    {historyItem.detailedBreakdown.lyd.map((item, index) => (
                                                        <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                            <span>{item.sign} {item.label}</span> 
                                                            <span className="font-mono">{formatCurrency(item.value, Currency.LYD)}</span>
                                                        </p>
                                                    ))}
                                                    <hr className="border-dark-border"/>
                                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                                        <span>= الإجمالي:</span> 
                                                        <span className="font-mono">{formatCurrency(historyItem.capitalBreakdown.LYD, Currency.LYD)}</span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="ps-4 flex justify-between">
                                                   <span>الإجمالي:</span>
                                                   <span className="font-mono text-gray-200">{formatCurrency(historyItem.capitalBreakdown.LYD, Currency.LYD)}</span>
                                                </div>
                                            )}
                                        </div>
                            
                                        <div className="pt-2 mt-2 border-t border-dark-border">
                                            <h4 className="font-bold mb-1 text-gray-200">تفاصيل رأس المال (USD)</h4>
                                            {historyItem.detailedBreakdown?.usd ? (
                                                <div className="ps-4 space-y-1">
                                                    {historyItem.detailedBreakdown.usd.map((item, index) => (
                                                        <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                            <span>{item.sign} {item.label}</span> 
                                                            <span className="font-mono">{formatCurrency(item.value, Currency.USD)}</span>
                                                        </p>
                                                    ))}
                                                    <hr className="border-dark-border"/>
                                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                                        <span>= الإجمالي:</span> 
                                                        <span className="font-mono">{formatCurrency(historyItem.capitalBreakdown.USD, Currency.USD)}</span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="ps-4 flex justify-between">
                                                   <span>الإجمالي:</span>
                                                   <span className="font-mono text-gray-200">{formatCurrency(historyItem.capitalBreakdown.USD, Currency.USD)}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {historyItem.detailedBreakdown?.eur && historyItem.capitalBreakdown.EUR !== 0 && (
                                            <div className="pt-2 mt-2 border-t border-dark-border">
                                                <h4 className="font-bold mb-1 text-gray-200">تفاصيل رأس المال (EUR)</h4>
                                                <div className="ps-4 space-y-1">
                                                    {historyItem.detailedBreakdown.eur.map((item, index) => (
                                                        <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                            <span>{item.sign} {item.label}</span> 
                                                            <span className="font-mono">{formatCurrency(item.value, Currency.EUR)}</span>
                                                        </p>
                                                    ))}
                                                    <hr className="border-dark-border"/>
                                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                                        <span>= الإجمالي:</span> 
                                                        <span className="font-mono">{formatCurrency(historyItem.capitalBreakdown.EUR, Currency.EUR)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                            
                                        {historyItem.detailedBreakdown?.tnd && historyItem.capitalBreakdown.TND !== 0 && (
                                            <div className="pt-2 mt-2 border-t border-dark-border">
                                                <h4 className="font-bold mb-1 text-gray-200">تفاصيل رأس المال (TND)</h4>
                                                <div className="ps-4 space-y-1">
                                                    {historyItem.detailedBreakdown.tnd.map((item, index) => (
                                                        <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                            <span>{item.sign} {item.label}</span> 
                                                            <span className="font-mono">{formatCurrency(item.value, Currency.TND)}</span>
                                                        </p>
                                                    ))}
                                                    <hr className="border-dark-border"/>
                                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                                        <span>= الإجمالي:</span> 
                                                        <span className="font-mono">{formatCurrency(historyItem.capitalBreakdown.TND, Currency.TND)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {historyItem.detailedBreakdown?.sar && historyItem.capitalBreakdown.SAR !== 0 && (
                                            <div className="pt-2 mt-2 border-t border-dark-border">
                                                <h4 className="font-bold mb-1 text-gray-200">تفاصيل رأس المال (SAR)</h4>
                                                <div className="ps-4 space-y-1">
                                                    {historyItem.detailedBreakdown.sar.map((item, index) => (
                                                        <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                            <span>{item.sign} {item.label}</span> 
                                                            <span className="font-mono">{formatCurrency(item.value, Currency.SAR)}</span>
                                                        </p>
                                                    ))}
                                                    <hr className="border-dark-border"/>
                                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                                        <span>= الإجمالي:</span> 
                                                        <span className="font-mono">{formatCurrency(historyItem.capitalBreakdown.SAR, Currency.SAR)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {historyItem.detailedBreakdown?.egp && historyItem.capitalBreakdown.EGP !== 0 && (
                                            <div className="pt-2 mt-2 border-t border-dark-border">
                                                <h4 className="font-bold mb-1 text-gray-200">تفاصيل رأس المال (EGP)</h4>
                                                <div className="ps-4 space-y-1">
                                                    {historyItem.detailedBreakdown.egp.map((item, index) => (
                                                        <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                            <span>{item.sign} {item.label}</span> 
                                                            <span className="font-mono">{formatCurrency(item.value, Currency.EGP)}</span>
                                                        </p>
                                                    ))}
                                                    <hr className="border-dark-border"/>
                                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                                        <span>= الإجمالي:</span> 
                                                        <span className="font-mono">{formatCurrency(historyItem.capitalBreakdown.EGP, Currency.EGP)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                            
                                    </div>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="text-center p-8 flex flex-col items-center gap-4">
                            <FileText size={48} className="text-gray-600"/>
                            <p className="text-gray-500">لم يتم حساب رأس المال من قبل.</p>
                        </div>
                    )}
                </div>
            </Modal>

            <PrintReportModal 
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                getProfitData={getProfitDataForPeriod}
            />
        </>
    );
};

const PrintReportModal: React.FC<{isOpen: boolean, onClose: () => void, getProfitData: (start: Date, end: Date) => ProfitData}> = ({isOpen, onClose, getProfitData}) => {
    const { capitalHistory } = useAppContext();
    const [printStartDate, setPrintStartDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [printEndDate, setPrintEndDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [printIsDetailed, setPrintIsDetailed] = useState(true);
    
    const modalInputClasses = "mt-1 w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold";


    const handlePrint = async () => {
        if (capitalHistory.length === 0) {
            alert("لا يوجد سجل لرأس المال للطباعة.");
            return;
        }

        const sortedHistory = [...capitalHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const endDateObj = new Date(printEndDate);
        endDateObj.setHours(23, 59, 59, 999);
        
        const startDateObj = new Date(printStartDate);
        startDateObj.setHours(0, 0, 0, 0);

        const endStateEntry = sortedHistory.filter(entry => new Date(entry.date) <= endDateObj).pop();
        if (!endStateEntry) {
            alert("لا يوجد إغلاق مسجل في أو قبل تاريخ النهاية المحدد.");
            return;
        }

        const startStateEntry = sortedHistory.filter(entry => new Date(entry.date) < startDateObj).pop();

        const createStateObject = (entry: CapitalHistoryEntry): ReportCapitalState => ({
            finalLydCapital: entry.finalLydCapital,
            capital: entry.capitalBreakdown,
            breakdown: entry.detailedBreakdown,
            date: entry.date,
        });

        // Generate profit data for the selected range
        const profitData = getProfitData(startDateObj, endDateObj);

        const reportData: ReportData = {
            startDate: startStateEntry ? startStateEntry.date : endStateEntry.date,
            endDate: endStateEntry.date,
            isDetailed: printIsDetailed,
            endState: createStateObject(endStateEntry),
            startState: startStateEntry ? createStateObject(startStateEntry) : undefined,
            profitData: profitData
        };
        
        if (printStartDate === printEndDate && !startStateEntry) {
            reportData.startDate = endStateEntry.date;
            reportData.startState = undefined;
        }

        await generateClosingReportPDF(reportData);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="طباعة تقرير رأس المال">
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    حدد الفترة الزمنية للتقرير الذي ترغب في طباعته.
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">من تاريخ:</label>
                        <input type="date" value={printStartDate} onChange={e => setPrintStartDate(e.target.value)} className={modalInputClasses} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">إلى تاريخ:</label>
                        <input type="date" value={printEndDate} onChange={e => setPrintEndDate(e.target.value)} className={modalInputClasses} />
                    </div>
                </div>
                <div className="relative flex items-start pt-2">
                    <div className="flex items-center h-5">
                        <input
                            id="print-detailed"
                            name="print-detailed"
                            type="checkbox"
                            checked={printIsDetailed}
                            onChange={(e) => setPrintIsDetailed(e.target.checked)}
                            className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary dark:bg-dark-bg dark:border-dark-border dark:focus:ring-gold dark:text-gold"
                        />
                    </div>
                    <div className="ms-3 text-sm">
                        <label htmlFor="print-detailed" className="font-medium text-gray-700 dark:text-gray-300">
                            تضمين التفاصيل
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            سيتم عرض تفاصيل الخزنات والمصارف والديون في التقرير.
                        </p>
                    </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                    <button type="button" onClick={handlePrint} className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">
                        طباعة
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default ClosingPage;