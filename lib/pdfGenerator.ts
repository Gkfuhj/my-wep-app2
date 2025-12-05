import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';
import { formatDate, formatNumber } from './utils';
import ArabicReshaper from 'arabic-reshaper';

const loadAmiriFont = async (doc: jsPDF) => {
    try {
        const response = await fetch('/fonts/Amiri-Regular.ttf');
        if (!response.ok) {
            throw new Error(`Font file not found at /fonts/Amiri-Regular.ttf (status: ${response.status})`);
        }
        const fontBlob = await response.blob();
        
        const reader = new FileReader();
        const fontBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                // Strip the data URL prefix to get raw base64
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(fontBlob);
        });

        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'bold');
        doc.setFont('Amiri', 'normal');
    } catch (error) {
        console.error("Failed to load and register custom font. PDF will use default fonts.", error);
    }
};

const processArabicText = (text: string | undefined | null): string => {
    if (!text) return '';

    // 1. Reshape the Arabic letters (connect them correctly)
    const reshaped = ArabicReshaper.convertArabic(String(text));

    // 2. Reverse the text manually to handle RTL in the LTR PDF environment
    // This replaces complex Bidi libraries for this specific use case
    const reversed = reshaped.split('').reverse().join('');

    // 3. The Magic Fix: Add spaces to prevent clipping of the last character
    return reversed + '  ';
};

export const generatePDF = async (transactions: Transaction[], title: string) => {
    const doc = new jsPDF();
    await loadAmiriFont(doc);

    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(18);
    // Align center, but process text
    doc.text(processArabicText(title), pageWidth / 2, 15, { align: 'center' });

    // Define Columns (Reversed Order for Visual RTL: [Notes ... Date])
    // The visual order we want is: Date | Type | Party | Amount | Currency | Notes
    // In LTR table (column 0 is Left), to appear RTL, we put Notes at Col 0, Date at Col Last.
    const tableColumn = [
        "ملاحظات",
        "العملة",
        "المبلغ",
        "الطرف المعني",
        "النوع",
        "التاريخ"
    ].map(header => processArabicText(header));

    const tableRows = transactions.map(tx => {
        return [
            processArabicText(tx.description),
            processArabicText(tx.currency),
            formatNumber(tx.amount), // Numbers often look better left as is, or can be processed if mixed with text
            processArabicText(tx.relatedParty || '-'),
            processArabicText(tx.type),
            processArabicText(formatDate(tx.date))
        ];
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: {
            font: 'Amiri',
            halign: 'right', // Align text to the right within cells
            overflow: 'linebreak',
            fontSize: 10,
        },
        headStyles: {
            fillColor: [22, 160, 133],
            textColor: [255, 255, 255],
            fontStyle: 'normal',
            halign: 'right',
            font: 'Amiri'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
    });

    doc.save(`${title.replace(/\s/g, '_')}_report.pdf`);
};