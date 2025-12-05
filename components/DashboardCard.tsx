import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';
import { Currency } from '../types';
import clsx from 'clsx';

interface DashboardCardProps {
    title: string;
    amount: number;
    currency: Currency;
    icon: React.ReactNode;
    path?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, amount, currency, icon, path }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (path) {
            navigate(path);
        }
    };

    return (
        <div 
            className={clsx(
                "h-full bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 flex items-center space-x-4 space-x-reverse border border-gray-200 dark:border-dark-border transition-all duration-300",
                path && "cursor-pointer hover:border-primary/30 dark:hover:border-gold/30 hover:shadow-xl hover:-translate-y-1"
            )}
            onClick={handleClick}
        >
            <div className="p-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-gold/20 dark:to-gold/5">
                <div className="text-primary-dark dark:text-gold-light">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-dark to-primary-light dark:from-gold-light dark:to-gold">
                    {formatCurrency(amount, currency)}
                </p>
            </div>
        </div>
    );
};

export default DashboardCard;