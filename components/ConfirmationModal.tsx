import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonVariant?: 'danger' | 'primary';
    children?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    confirmButtonVariant = 'danger',
    children
}) => {
    if (!isOpen) return null;

    const confirmButtonClasses = {
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        primary: 'bg-primary hover:bg-primary-dark focus:ring-primary',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">{title}</h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
            {children}
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                    type="button"
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-card sm:col-start-2 sm:text-sm ${confirmButtonClasses[confirmButtonVariant]}`}
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                >
                    {confirmText}
                </button>
                <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-dark-border shadow-sm px-4 py-2 bg-white dark:bg-dark-card text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-gold sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={onClose}
                >
                    {cancelText}
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;