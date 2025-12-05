
import React from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    backdropClassName?: string;
    className?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg', backdropClassName, className }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
    };

    // Use custom className if provided, otherwise use size-based class
    const widthClass = className ? className : `w-full ${sizeClasses[size] || sizeClasses.lg}`;

    return (
        <div 
            className={clsx(
                "fixed inset-0 z-50 flex justify-center items-center backdrop-blur-sm animate-fade-in transition-colors duration-300",
                backdropClassName || 'bg-black/60 dark:bg-black/70'
            )}
            onClick={onClose}
        >
            <div 
                className={clsx(
                    "bg-white dark:bg-dark-card rounded-lg shadow-2xl shadow-black/20 dark:shadow-black/50 mx-4 p-6 transform transition-all border border-gray-200 dark:border-dark-border animate-slide-down-fade-in",
                    "flex flex-col max-h-[90vh]", // Handle vertical overflow
                    widthClass
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b pb-3 border-gray-200 dark:border-dark-border flex-shrink-0">
                    <h3 className="text-lg font-semibold text-primary-dark dark:text-gold">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gold-light transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="mt-4 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
