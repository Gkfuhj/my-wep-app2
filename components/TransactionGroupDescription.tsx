import React from 'react';
import { Transaction, Currency, ASSET_NAMES, Bank } from '../types';
import { formatCurrency } from '../lib/utils';
import { ArrowLeft, ArrowRight, MinusCircle, PlusCircle } from 'lucide-react';

interface TransactionGroup {
    groupId: string;
    date: string;
    description: string;
    transactions: Transaction[];
    isDeleted: boolean;
}

interface Props {
    group: TransactionGroup;
    banks: Bank[];
}

const TransactionGroupDescription: React.FC<Props> = ({ group, banks }) => {
    const primaryTx = group.transactions.find(tx => tx.metadata) || group.transactions[0];
    const { metadata } = primaryTx;

    if (!metadata) {
        return <p>{group.description}</p>;
    }
    
    const assetNameMap = { ...ASSET_NAMES, ...Object.fromEntries(banks.map(b => [b.id, b.name])) };
    const getAssetName = (id: string) => assetNameMap[id] || id;

    const { groupType, ...data } = metadata;

    const renderText = (label: string, value: any) => value ? <span className="text-gray-400">{label}: <span className="font-semibold text-gray-300">{value}</span></span> : null;

    switch (groupType) {
        case 'USD_EXCHANGE': {
            const { amount, toAmount, fromAsset, toAsset, fee } = data;
            let feeDesc = '';
            if (fee.amount > 0) {
                if (fee.handling === 'cash') {
                    feeDesc = `${fee.type === 'add' ? 'إضافة' : 'خصم'} ${formatCurrency(fee.amount, Currency.LYD)} من ${getAssetName(fee.lydAssetId)}`;
                } else if (fee.handling === 'debt') {
                    feeDesc = `تسجيل دين بـ ${formatCurrency(fee.amount, Currency.LYD)} على ${fee.customerName}`;
                } else if (fee.handling === 'receivable') {
                    feeDesc = `تسجيل مستحق بـ ${formatCurrency(fee.amount, Currency.LYD)} لـ ${fee.receivableParty}`;
                }
            }
            return (
                <div className="space-y-1 text-xs">
                    <p className="font-bold text-indigo-400">بدل دولار</p>
                    <p className="font-mono">
                        {amount !== toAmount ?
                            `${formatCurrency(amount, Currency.USD)} → ${formatCurrency(toAmount, Currency.USD)}`
                            : formatCurrency(amount, Currency.USD)
                        }
                    </p>
                    <div className="flex items-center gap-2 text-gray-400 pt-1">
                        <span>{getAssetName(fromAsset)}</span>
                        <ArrowRight size={14}/>
                        <span>{getAssetName(toAsset)}</span>
                    </div>
                    {feeDesc && <p className="text-gray-400 pt-1">مع {feeDesc}</p>}
                </div>
            );
        }
        case 'EUR_EXCHANGE': {
            const { amount, toAmount, fromAsset, toAsset, fee } = data;
            let feeDesc = '';
            if (fee.amount > 0) {
                if (fee.handling === 'cash') {
                    feeDesc = `${fee.type === 'add' ? 'إضافة' : 'خصم'} ${formatCurrency(fee.amount, Currency.LYD)} من ${getAssetName(fee.lydAssetId)}`;
                } else if (fee.handling === 'debt') {
                    feeDesc = `تسجيل دين بـ ${formatCurrency(fee.amount, Currency.LYD)} على ${fee.customerName}`;
                } else if (fee.handling === 'receivable') {
                    feeDesc = `تسجيل مستحق بـ ${formatCurrency(fee.amount, Currency.LYD)} لـ ${fee.receivableParty}`;
                }
            }
            return (
                <div className="space-y-1 text-xs">
                    <p className="font-bold text-indigo-400">بدل يورو</p>
                    <p className="font-mono">
                        {amount !== toAmount ?
                            `${formatCurrency(amount, Currency.EUR)} → ${formatCurrency(toAmount, Currency.EUR)}`
                            : formatCurrency(amount, Currency.EUR)
                        }
                    </p>
                    <div className="flex items-center gap-2 text-gray-400 pt-1">
                        <span>{getAssetName(fromAsset)}</span>
                        <ArrowRight size={14}/>
                        <span>{getAssetName(toAsset)}</span>
                    </div>
                    {feeDesc && <p className="text-gray-400 pt-1">مع {feeDesc}</p>}
                </div>
            );
        }
        case 'USD_TO_LYD_DEBT_CONVERSION': {
            const { totalUnpaidUsd, newLydAmount, exchangeRate } = data;
            const customerName = group.transactions[0].relatedParty;
            return (
                <div className="space-y-1 text-xs">
                    <p className="font-bold text-teal-400">تحويل عملة دين</p>
                    <p>{customerName}</p>
                    <div className="flex items-center gap-2 text-gray-400 pt-1">
                        <span className="text-red-400 font-mono">{formatCurrency(totalUnpaidUsd, Currency.USD)}</span>
                        <ArrowRight size={14}/>
                        <span className="text-green-400 font-mono">{formatCurrency(newLydAmount, Currency.LYD)}</span>
                    </div>
                    <p className="text-gray-400">بسعر صرف: <span className="font-mono">{exchangeRate}</span></p>
                </div>
            );
        }
        case 'SINGLE_DEBT_CONVERSION': {
            const { unpaidUsdAmount, lydAmount, effectiveRate, destinationCustomerName } = data;
            const originalCustomerName = primaryTx.relatedParty;
            
            return (
                <div className="space-y-1 text-xs">
                    <p className="font-bold text-teal-400">تحويل دين دولار إلى دينار</p>
                    <div className="flex items-center gap-2 text-gray-400 pt-1 flex-wrap">
                        <span className="text-red-400 font-mono">{formatCurrency(unpaidUsdAmount, Currency.USD)}</span>
                        <span className="text-gray-300">({originalCustomerName})</span>
                        <ArrowRight size={14}/>
                        <span className="text-green-400 font-mono">{formatCurrency(lydAmount, Currency.LYD)}</span>
                        <span className="text-gray-300">({destinationCustomerName})</span>
                    </div>
                    <p className="text-gray-400">بسعر صرف: <span className="font-mono">{effectiveRate.toFixed(3)}</span></p>
                </div>
            );
        }
        case 'BUY_USD':
        case 'SELL_USD':
            const isBuy = groupType === 'BUY_USD';
            // Destructure properties directly from the 'data' object (which is metadata)
            const { usdAmount, rate, lydAmount, usdDestination, usdSource, bankId, lydCashAssetId } = data;

            // Determine the asset IDs involved
            const effectiveLydAssetId = lydCashAssetId || bankId;
            const usdAssetId = isBuy ? usdDestination : usdSource;

            return (
                <div className="space-y-1 text-xs">
                    <p className={`font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}`}>{isBuy ? 'شراء دولار' : 'بيع دولار'}</p>
                    <p className="font-mono">{formatCurrency(usdAmount, Currency.USD)} @ {rate}</p>
                    <p className="font-mono">= {formatCurrency(lydAmount, Currency.LYD)}</p>
                    <div className="flex items-center gap-2 text-gray-400 pt-1">
                        <span>{getAssetName(effectiveLydAssetId)}</span>
                        <ArrowRight size={14}/>
                        <span>{getAssetName(usdAssetId)}</span>
                    </div>
                </div>
            );
        
        case 'DEBT_PAYMENT':
        case 'DEBT_SURPLUS':
        case 'NEW_RECEIVABLE': { // Include NEW_RECEIVABLE here as surplus might be a receivable
            const debtTx = group.transactions.find(tx => tx.metadata?.groupType === 'DEBT_PAYMENT');
            
            // Look for surplus related transaction
            // A surplus could be a direct deposit (DEBT_SURPLUS) or a receivable creation (NEW_RECEIVABLE)
            const surplusTx = group.transactions.find(tx => 
                (tx.metadata?.groupType === 'DEBT_SURPLUS' && tx.metadata?.isSurplus) || 
                (tx.metadata?.groupType === 'NEW_RECEIVABLE' && tx.metadata?.isSurplus)
            );

            if (debtTx && surplusTx) {
                const debtAmount = debtTx.metadata?.amount || 0;
                const surplusAmount = surplusTx.metadata?.amount || 0;
                const relatedParty = debtTx.relatedParty;
                const surplusTypeLabel = surplusTx.metadata?.isReceivable ? 'مستحق' : (surplusTx.metadata?.isProfit ? 'مربح' : 'إيداع');

                return (
                    <div className="space-y-1 text-xs">
                        <p className="font-bold text-green-400">تحصيل دين مع فائض</p>
                        <p>{relatedParty}</p>
                        <p className="font-mono">إجمالي: {formatCurrency(debtAmount + surplusAmount, debtTx.currency)}</p>
                        <p className="text-gray-400">منها دين: <span className="font-mono text-gray-300">{formatCurrency(debtAmount, debtTx.currency)}</span></p>
                        <p className="text-gray-400">منها {surplusTypeLabel}: <span className="font-mono text-yellow-400">{formatCurrency(surplusAmount, debtTx.currency)}</span></p>
                    </div>
                );
            } else if (groupType === 'NEW_RECEIVABLE' && data.isSurplus) {
                 // Fallback if accessed via the receivable tx directly but debt tx is missing or filtered out
                 // Though typically grouped together
                 return (
                    <div className="space-y-1 text-xs">
                        <p className="font-bold text-yellow-400">تسجيل فائض كمستحق</p>
                        <p>{primaryTx.relatedParty}</p>
                        <p className="font-mono">{formatCurrency(Math.abs(data.amount), primaryTx.currency)}</p>
                    </div>
                 );
            } else if (groupType === 'NEW_RECEIVABLE') {
                const receivableAmount = Math.abs(data.amount);
                const destinationTx = group.transactions.find(tx => tx.amount > 0);
                const destinationName = destinationTx ? getAssetName(destinationTx.assetId) : 'خارج الخزنة';
                return (
                    <div className="space-y-1 text-xs">
                        <p className="font-bold text-yellow-400">مستحق جديد</p>
                        <p>{primaryTx.relatedParty}</p>
                        <p className="font-mono">{formatCurrency(receivableAmount, primaryTx.currency)}</p>
                        {renderText('إيداع في', destinationName)}
                    </div>
                );
            } else if (debtTx) {
                // Simple debt payment
                return (
                    <div className="space-y-1 text-xs">
                        <p className="font-bold text-green-400">تحصيل دين</p>
                        <p>{debtTx.relatedParty}</p>
                        <p className="font-mono">{formatCurrency(debtTx.amount, debtTx.currency)}</p>
                        {renderText('إلى', getAssetName(debtTx.assetId))}
                    </div>
                );
            }
            return <p>{group.description}</p>; 
        }
        case 'NEW_DEBT':
            return (
                <div className="space-y-1 text-xs">
                    <p className="font-bold text-red-400">دين جديد</p>
                     <p>{primaryTx.relatedParty}</p>
                     <p className="font-mono">{formatCurrency(Math.abs(primaryTx.amount), primaryTx.currency)}</p>
                     {primaryTx.assetId !== 'trade_debt' && renderText('من', getAssetName(primaryTx.assetId))}
                </div>
            );

        case 'RECEIVABLE_PAYMENT': {
            const paymentAmount = Math.abs(primaryTx.amount);
            const sourceTx = group.transactions.find(t => t.amount < 0);
            let sourceName = sourceTx ? getAssetName(sourceTx.assetId) : 'خارج الخزنة';
            if (sourceTx?.assetId === 'external_payment') {
                sourceName = 'خارج الخزنة';
            }
            return (
                <div className="space-y-1 text-xs">
                    <p className="font-bold text-blue-400">دفع مستحق</p>
                    <p>{primaryTx.relatedParty}</p>
                    <p className="font-mono">{formatCurrency(paymentAmount, primaryTx.currency)}</p>
                    {renderText('من', sourceName)}
                </div>
            );
        }

        case 'BANK_TRANSFER':
             const fromBank = group.transactions.find(t => t.amount < 0);
             const toBank = group.transactions.find(t => t.amount > 0);
             return (
                 <div className="space-y-1 text-xs">
                     <p className="font-bold text-blue-400">تحويل بنكي</p>
                     <p className="font-mono">{formatCurrency(Math.abs(fromBank?.amount || 0), Currency.LYD)}</p>
                     <div className="flex items-center gap-2 text-gray-400 pt-1">
                         <span>{getAssetName(fromBank?.assetId || '')}</span>
                         <ArrowRight size={14}/>
                         <span>{getAssetName(toBank?.assetId || '')}</span>
                     </div>
                 </div>
             );
        
        case 'BANK_CASH_EXCHANGE':
        case 'CASH_BANK_EXCHANGE': {
             const fromTx = group.transactions.find(t => t.amount < 0);
             const toTx = group.transactions.find(t => t.amount > 0);
             const amount = Math.abs(fromTx?.amount || 0);
             const fromName = getAssetName(fromTx?.assetId || '');
             const toName = getAssetName(toTx?.assetId || '');
             return (
                 <div className="space-y-1 text-xs">
                     <p className="font-bold text-orange-400">بدل نقدي</p>
                     <p className="font-mono">{formatCurrency(amount, Currency.LYD)}</p>
                     <div className="flex items-center gap-2 text-gray-400 pt-1">
                         <span>{fromName}</span>
                         <ArrowRight size={14}/>
                         <span>{toName}</span>
                     </div>
                 </div>
             );
        }

        case 'DOLLAR_CARD_PAYMENT':
             return (
                 <div className="space-y-1 text-xs">
                     <p className="font-bold text-purple-400">دفعة بطاقة دولار</p>
                     <p>{primaryTx.relatedParty}</p>
                     <p className="font-mono">{formatCurrency(Math.abs(primaryTx.amount), Currency.LYD)}</p>
                     {renderText('من', getAssetName(primaryTx.assetId))}
                 </div>
             );
        case 'OPERATING_COST':
            return (
                 <div className="space-y-1 text-xs">
                     <p className="font-bold text-yellow-400">مصروف تشغيلي</p>
                     <p>{group.description.split('(من')[0]}</p>
                     <p className="font-mono">{formatCurrency(Math.abs(primaryTx.amount), Currency.LYD)}</p>
                     {renderText('من', getAssetName(primaryTx.assetId))}
                 </div>
            );

        default:
            return <p>{group.description}</p>;
    }
};

export default TransactionGroupDescription;