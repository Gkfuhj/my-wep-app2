import pdfMake from "pdfmake/build/pdfmake";
import { Currency, CapitalHistoryEntry } from '../types';
import { formatCurrency, formatDate } from './utils';
import ArabicReshaper from 'arabic-reshaper';

export interface ReportCapitalState {
    finalLydCapital: number;
    capital: CapitalHistoryEntry['capitalBreakdown'];
    breakdown?: CapitalHistoryEntry['detailedBreakdown'];
    date: string;
}

export interface ProfitData {
    totalProfit: number;
    totalCosts: number;
    netProfit: number;
    profitBreakdown: { label: string; value: number; color: string }[];
    costBreakdown: { label: string; value: number; color: string }[];
}

export interface ReportData {
    startDate: string;
    endDate: string;
    isDetailed: boolean;
    startState?: ReportCapitalState;
    endState: ReportCapitalState;
    profitData?: ProfitData;
}

// --- Isolated Helper Functions ---

const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch font from ${url}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Font loading error:", error);
        throw error;
    }
};

/**
 * دالة المعالجة النهائية للنصوص العربية
 * 1. تشكيل الحروف.
 * 2. تقسيم الجملة إلى كلمات.
 * 3. عكس ترتيب الكلمات (لتظهر الجملة من اليمين لليسار).
 * 4. عكس حروف الكلمات العربية فقط.
 */
const processArabic = (text: string | number | undefined | null): string => {
    if (!text) return '';
    const str = String(text);

    // إذا لم يكن هناك عربي، أعد النص كما هو
    if (!/[\u0600-\u06FF]/.test(str)) return str;

    // 1. Reshape
    let reshaped = str;
    try {
        // نستخدم ligatures: true أحياناً لحل مشكلة "لا" و "للفترة" في بعض الخطوط
        // ولكن إذا كانت تسبب مشاكل، نجعلها false. هنا سنجرب false مع التأكد من المدخلات.
        const reshaper = new ArabicReshaper({ ligatures: false });
        reshaped = reshaper.convertArabic(str);
    } catch (e) {
        return str;
    }

    // 2. Split into words (Tokenization) by spaces
    const words = reshaped.split(' ');
    
    // 3. Reverse the WORD order
    // المثال: "كشف حساب" -> المصفوفة تصبح ["حساب", "كشف"]
    // عند الطباعة LTR: "حساب" (يسار) ... "كشف" (يمين). القارئ يقرأ اليمين أولاً -> "كشف حساب".
    const reversedWords = words.reverse();

    // 4. Process each word
    const finalWords = reversedWords.map(word => {
        // Regex يشمل العربية والرموز المشكلة
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

        if (arabicRegex.test(word)) {
            // عكس حروف الكلمة العربية
            return word.split('').reverse().join('');
        }
        // الأرقام والإنجليزية تبقى كما هي
        return word;
    });

    return finalWords.join(' ');
};

export const generateClosingReportPDF = async (data: ReportData) => {
    try {
        const fontBase64 = await getBase64FromUrl('/fonts/Amiri-Regular.ttf');
        
        const vfs = { "Amiri-Regular.ttf": fontBase64 };
        (pdfMake as any).vfs = vfs;
        (pdfMake as any).fonts = {
            Amiri: {
                normal: 'Amiri-Regular.ttf',
                bold: 'Amiri-Regular.ttf',
                italics: 'Amiri-Regular.ttf',
                bolditalics: 'Amiri-Regular.ttf'
            }
        };

        const content: any[] = [];

        // Title
        content.push({
            text: processArabic(' متكامل حساب كشف '),
            fontSize: 22,
            bold: true,
            alignment: 'center',
            margin: [0, 0, 0, 10]
        });

        // Subtitle (Date)
        let dateText = '';
        if (!data.startState || data.startDate === data.endDate) {
            // إضافة مسافات لضمان عدم التصاق الكلام
            dateText = `لتاريخ : ${formatDate(data.endDate).split('،')[0]}`;
        } else {
            // التأكد من النص "للفترة"
            dateText = `للفترة من ${formatDate(data.startDate).split('،')[0]} إلى ${formatDate(data.endDate).split('،')[0]}`;
        }
        
        content.push({
            text: processArabic(dateText),
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 20],
            color: '#555555'
        });

        // --- Helper to create a styled table ---
        const createTable = (headers: string[], bodyData: string[][]) => {
            return {
                table: {
                    headerRows: 1,
                    widths: headers.map(() => '*'),
                    body: [
                        // Headers: نعكس المصفوفة لتظهر الأعمدة بالترتيب الصحيح (العمود الأول يمين)
                        headers.map(h => ({ text: processArabic(h), style: 'tableHeader' })).reverse(),
                        
                        // Body Rows: نعكس محتوى الصفوف أيضاً
                        ...bodyData.map(row => 
                            row.map(cell => ({ text: processArabic(cell), style: 'tableCell' })).reverse()
                        )
                    ]
                },
                layout: {
                    fillColor: function (rowIndex: number) {
                        return (rowIndex % 2 === 0) && rowIndex !== 0 ? '#f9fafb' : null;
                    },
                    hLineWidth: function (i: number, node: any) {
                        return (i === 0 || i === node.table.body.length) ? 1 : 1;
                    },
                    vLineWidth: function () {
                        return 0;
                    },
                    hLineColor: function () {
                        return '#e5e7eb';
                    }
                },
                margin: [0, 5, 0, 15]
            };
        };

        // --- Capital Evolution ---
        if (data.startState && data.startState.date !== data.endState.date) {
            content.push({ text: processArabic(' المال رأس  تطور '), style: 'sectionHeader' });
            
            const change = data.endState.finalLydCapital - data.startState.finalLydCapital;
            const percentage = data.startState.finalLydCapital !== 0 ? (change / Math.abs(data.startState.finalLydCapital)) * 100 : 0;

            const evolutionData = [
                ['الفترة بداية في المال رأس', formatCurrency(data.startState.finalLydCapital, Currency.LYD), formatDate(data.startState.date).split('،')[0]],
                ['الفتره نهاية في المال رأس', formatCurrency(data.endState.finalLydCapital, Currency.LYD), formatDate(data.endState.date).split('،')[0]],
                ['التغير', formatCurrency(change, Currency.LYD), `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`]
            ];
            
            // ترتيب الأعمدة هنا: البيان (يمين)، القيمة (وسط)، ملاحظات (يسار)
            // الدالة createTable ستقوم بعكسها تلقائياً لتظهر بهذا الترتيب
            content.push(createTable(['البيان', 'القيمة', 'ملاحظات'], evolutionData));
        }

        // --- End State Summary ---
        content.push({ text: processArabic(`بتاريخ المال رأس ملحص ${formatDate(data.endState.date).split('،')[0]}`), style: 'sectionHeader' });
        
        const summaryData = Object.entries(data.endState.capital).map(([curr, amount]) => [
            `رأس المال (${curr})`,
            formatCurrency(amount, curr as Currency)
        ]);
        summaryData.push(['= بالدينار الحقيقي المال رأس', formatCurrency(data.endState.finalLydCapital, Currency.LYD)]);
        
        content.push(createTable(['البيان', 'القيمة'], summaryData));

        // --- Detailed Breakdown ---
        if (data.isDetailed && data.endState.breakdown) {
            content.push({ text: processArabic('(الفتره نهاية) المال رأس'), style: 'sectionHeader' });

            if (data.endState.breakdown.lyd && data.endState.breakdown.lyd.length > 0) {
                const lydData = data.endState.breakdown.lyd.map(item => [
                    `${item.sign} ${item.label}`,
                    formatCurrency(item.value, Currency.LYD)
                ]);
                content.push({ text: processArabic('بيان (LYD)'), style: 'subHeader' });
                content.push(createTable(['البيان', 'القيمة'], lydData));
            }

            if (data.endState.breakdown.usd && data.endState.breakdown.usd.length > 0) {
                const usdData = data.endState.breakdown.usd.map(item => [
                    `${item.sign} ${item.label}`,
                    formatCurrency(item.value, Currency.USD)
                ]);
                content.push({ text: processArabic('بيان (USD)'), style: 'subHeader' });
                content.push(createTable(['البيان', 'القيمة'], usdData));
            }
        }

        // --- Profit Analysis ---
        if (data.profitData) {
            content.push({ text: '', pageBreak: 'before' });
            content.push({ text: processArabic('الخسائر و الأرباح ملخص'), style: 'sectionHeader' });

            const { netProfit, totalProfit, totalCosts, profitBreakdown, costBreakdown } = data.profitData;
            
            // Summary Cards (Table)
            const summaryTable = {
                table: {
                    widths: ['*', '*', '*'],
                    body: [
                        [
                            { text: processArabic('الربح صافي'), style: 'summaryHeader', fillColor: netProfit >= 0 ? '#dcfce7' : '#fee2e2', color: netProfit >= 0 ? '#166534' : '#991b1b' },
                            { text: processArabic('التكاليف اجمالي'), style: 'summaryHeader', fillColor: '#fee2e2', color: '#991b1b' },
                            { text: processArabic('الأرباح إجمالي'), style: 'summaryHeader', fillColor: '#dcfce7', color: '#166534' }
                        ].reverse(),
                        [
                            { text: processArabic(formatCurrency(netProfit, Currency.LYD)), style: 'summaryValue' },
                            { text: processArabic(formatCurrency(totalCosts, Currency.LYD)), style: 'summaryValue' },
                            { text: processArabic(formatCurrency(totalProfit, Currency.LYD)), style: 'summaryValue' }
                        ].reverse()
                    ]
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 20]
            };
            content.push(summaryTable);

            // Profit Breakdown
            if (profitBreakdown.length > 0) {
                content.push({ text: processArabic('(الدينار)بي الأربح مصادر '), style: 'subHeader' });
                const profitData = profitBreakdown.map(item => [
                    item.label,
                    formatCurrency(item.value, Currency.LYD)
                ]);
                content.push(createTable(['المصدر', 'القيمة'], profitData));
            }

            // Cost Breakdown
            if (costBreakdown.length > 0) {
                content.push({ text: processArabic(' الدينار بي التكاليف التفاصيل '), style: 'subHeader' });                const costData = costBreakdown.map(item => [
                    item.label,
                    formatCurrency(item.value, Currency.LYD)
                ]);
                content.push(createTable(['المصروف', 'القيمة'], costData));
            }
        }

        // 4. Generate PDF
        const docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            content: content,
            defaultStyle: {
                font: 'Amiri',
                fontSize: 10,
                alignment: 'right' // Default alignment for everything to mimic RTL flow
            },
            styles: {
                sectionHeader: {
                    fontSize: 16,
                    bold: true,
                    color: '#1E40AF',
                    margin: [0, 10, 0, 10],
                    alignment: 'right'
                },
                subHeader: {
                    fontSize: 12,
                    bold: true,
                    color: '#374151',
                    margin: [0, 5, 0, 5],
                    alignment: 'right'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 11,
                    color: '#ffffff',
                    fillColor: '#1E40AF',
                    alignment: 'center'
                },
                tableCell: {
                    alignment: 'center',
                    margin: [0, 2, 0, 2]
                },
                summaryHeader: {
                    bold: true,
                    fontSize: 12,
                    alignment: 'center',
                    margin: [0, 5, 0, 5]
                },
                summaryValue: {
                    bold: true,
                    fontSize: 14,
                    alignment: 'center',
                    margin: [0, 0, 0, 10],
                    font: 'Amiri'
                }
            }
        };

        pdfMake.createPdf(docDefinition as any).download(`closing_report_${data.endDate.split('T')[0]}.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("حدث خطأ أثناء إنشاء ملف PDF. تأكد من تحميل الخطوط.");
    }
};