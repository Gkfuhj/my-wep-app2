import { Currency } from "../types";

export const getLocalISOString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
};

// New function to handle number formatting consistently for PDF generation
export const formatNumber = (amount: number): string => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    // Using en-US locale for standard comma separation and decimal point.
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
    }).format(absAmount);
    return `${isNegative ? '-' : ''}${formatted}`;
};

export const formatCurrency = (amount: number, currency: Currency): string => {
    // This format is more reliable for jsPDF's LTR rendering with halign: 'right'
    return `${formatNumber(amount)} ${currency}`;
};

export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Removed non-breaking spaces for better PDF rendering consistency
    return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        numberingSystem: 'latn'
    } as any).format(date);
};