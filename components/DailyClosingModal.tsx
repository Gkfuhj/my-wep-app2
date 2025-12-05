

import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Currency, CapitalHistoryEntry } from '../types';
import Modal from './Modal';
import { formatCurrency, formatDate } from '../lib/utils';
import { FileText } from 'lucide-react';

const DailyClosingModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { capitalHistory } = useAppContext();

    const lastClosing = useMemo(() => {
        if (!capitalHistory || capitalHistory.length === 0) {
            return null;
        }
        return [...capitalHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [capitalHistory]);


    const renderRateDetails = (rateInfo: number | { amount: number; rate: number }[], currency: Currency) => {
        if (typeof rateInfo === 'number') {
            return <span className="font-mono text-yellow-300">{rateInfo || 'N/A'}</span>;
        }
        if (Array.isArray(rateInfo) && rateInfo.length > 0) {
            return (
                <div className="pl-4 mt-1 space-y-1">
                    {rateInfo.map((part, index) => (
                        <div key={index} className="font-mono text-yellow-300 flex justify-between items-center text-xs">
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


    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تقرير الإغلاق اليومي" size="3xl">
            {lastClosing ? (
                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-gray-400">آخر إغلاق تم حسابه بتاريخ:</p>
                        <p className="text-lg font-semibold text-gold-light">{formatDate(lastClosing.date)}</p>
                    </div>
                    <div className="p-6 bg-dark-bg rounded-lg text-center">
                        <p className="text-sm text-gray-400">رأس المال النهائي بالدينار</p>
                         <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold font-mono">
                            {formatCurrency(lastClosing.finalLydCapital, Currency.LYD)}
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Detailed Breakdown Section */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold mb-2 text-gray-200">تفاصيل رأس المال (LYD)</h4>
                                <div className="p-3 bg-dark-bg rounded-lg max-h-60 overflow-y-auto pr-2 space-y-1 text-xs">
                                    {lastClosing.detailedBreakdown?.lyd ? (
                                        lastClosing.detailedBreakdown.lyd.map((item, index) => (
                                            <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                <span>{item.sign} {item.label}:</span> 
                                                <span className="font-mono">{formatCurrency(item.value, Currency.LYD)}</span>
                                            </p>
                                        ))
                                    ) : ( <p className="text-gray-500">لا توجد تفاصيل.</p> )}
                                    <hr className="border-dark-border my-1"/>
                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                        <span>= الإجمالي:</span> 
                                        <span className="font-mono">{formatCurrency(lastClosing.capitalBreakdown.LYD, Currency.LYD)}</span>
                                    </p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold mb-2 text-gray-200">تفاصيل رأس المال (USD)</h4>
                                 <div className="p-3 bg-dark-bg rounded-lg max-h-60 overflow-y-auto pr-2 space-y-1 text-xs">
                                    {lastClosing.detailedBreakdown?.usd ? (
                                        lastClosing.detailedBreakdown.usd.map((item, index) => (
                                            <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                <span>{item.sign} {item.label}:</span> 
                                                <span className="font-mono">{formatCurrency(item.value, Currency.USD)}</span>
                                            </p>
                                        ))
                                    ) : ( <p className="text-gray-500">لا توجد تفاصيل.</p> )}
                                    <hr className="border-dark-border my-1"/>
                                    <p className="flex justify-between font-bold text-gray-100 pt-1">
                                        <span>= الإجمالي:</span> 
                                        <span className="font-mono">{formatCurrency(lastClosing.capitalBreakdown.USD, Currency.USD)}</span>
                                    </p>
                                </div>
                            </div>
                            {lastClosing.detailedBreakdown?.eur && lastClosing.capitalBreakdown.EUR !== 0 && (
                                <div>
                                    <h4 className="font-bold mb-2 text-gray-200">تفاصيل رأس المال (EUR)</h4>
                                    <div className="p-3 bg-dark-bg rounded-lg max-h-60 overflow-y-auto pr-2 space-y-1 text-xs">
                                        {lastClosing.detailedBreakdown.eur.map((item, index) => (
                                            <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                <span>{item.sign} {item.label}:</span> 
                                                <span className="font-mono">{formatCurrency(item.value, Currency.EUR)}</span>
                                            </p>
                                        ))}
                                        <hr className="border-dark-border my-1"/>
                                        <p className="flex justify-between font-bold text-gray-100 pt-1">
                                            <span>= الإجمالي:</span> 
                                            <span className="font-mono">{formatCurrency(lastClosing.capitalBreakdown.EUR, Currency.EUR)}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                            {lastClosing.detailedBreakdown?.tnd && lastClosing.capitalBreakdown.TND !== 0 && (
                                <div>
                                    <h4 className="font-bold mb-2 text-gray-200">تفاصيل رأس المال (TND)</h4>
                                    <div className="p-3 bg-dark-bg rounded-lg max-h-60 overflow-y-auto pr-2 space-y-1 text-xs">
                                        {lastClosing.detailedBreakdown.tnd.map((item, index) => (
                                            <p key={index} className={`flex justify-between items-center ${item.sign === '-' ? 'text-red-400' : 'text-gray-300'}`}>
                                                <span>{item.sign} {item.label}:</span> 
                                                <span className="font-mono">{formatCurrency(item.value, Currency.TND)}</span>
                                            </p>
                                        ))}
                                        <hr className="border-dark-border my-1"/>
                                        <p className="flex justify-between font-bold text-gray-100 pt-1">
                                            <span>= الإجمالي:</span> 
                                            <span className="font-mono">{formatCurrency(lastClosing.capitalBreakdown.TND, Currency.TND)}</span>
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Rates & Other Currencies Section */}
                         <div className="space-y-4 p-4 bg-dark-bg rounded-lg">
                            <h4 className="font-semibold text-gray-300 mb-2">أسعار الصرف المستخدمة:</h4>
                            <div className="ps-4 space-y-2 text-sm">
                                <p className="flex justify-between"><span>USD:</span> {renderRateDetails(lastClosing.rates.USD, Currency.USD)}</p>
                                <p className="flex justify-between"><span>EUR:</span> {renderRateDetails(lastClosing.rates.EUR, Currency.EUR)}</p>
                                <p className="flex justify-between"><span>TND:</span> {renderRateDetails(lastClosing.rates.TND, Currency.TND)}</p>
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="text-center p-8 flex flex-col items-center gap-4">
                    <FileText size={48} className="text-gray-600"/>
                    <p className="text-gray-500">لم يتم حساب أي إغلاق بعد.</p>
                    <p className="text-sm text-gray-600">اذهب إلى صفحة <b className="text-gold-light">الإغلاق</b> لحساب رأس المال لأول مرة.</p>
                </div>
            )}
        </Modal>
    );
};

export default DailyClosingModal;
