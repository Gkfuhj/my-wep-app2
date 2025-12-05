
import { formatCurrency, formatDate } from './utils';
import { Currency, AssetId, Bank, ASSET_NAMES, DollarCardPurchase } from '../types';

interface ReportData {
    openingBalances: {
        assets: Record<AssetId, number>;
        banks: Bank[];
    };
    closingBalances: {
        assets: Record<AssetId, number>;
        banks: Bank[];
    };
    title: string;
}

// Function to escape special characters for Telegram's MarkdownV2
const escapeMarkdownV2 = (text: string | undefined | null): string => {
    if (!text) return '';
    // Characters to escape are: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
};

const formatBalanceRow = (name: string, opening: number, closing: number, currency: Currency): string => {
    const difference = closing - opening;
    const diffSign = difference > 0 ? '+' : '';
    const diffEmoji = difference === 0 ? '⚪' : difference > 0 ? '🟢' : '🔴';

    let row = `*${escapeMarkdownV2(name)}*\n`;
    row += `  بداية: \`${formatCurrency(opening, currency)}\`\n`;
    row += `  حالي: \`${formatCurrency(closing, currency)}\`\n`;
    row += `  الفرق: \`${diffSign}${formatCurrency(difference, currency)}\` ${diffEmoji}\n`;
    return row;
};

export const formatReportForTelegram = (reportData: ReportData, period: 'day' | 'week' | 'month'): string => {
    if (!reportData) return "لا توجد بيانات لإنشاء التقرير\\.";

    const periodTitles: Record<string, string> = { day: "اليومي", week: "الأسبوعي", month: "الشهري" };
    const title = `*📊 تقرير الإغلاق ${periodTitles[period]}*`;
    const date = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const { openingBalances, closingBalances } = reportData;
    
    const allAssetIds = new Set([...Object.keys(openingBalances.assets), ...Object.keys(closingBalances.assets)]) as Set<AssetId>;
    const allBankIds = new Set([...(openingBalances.banks || []).map(b => b.id), ...(closingBalances.banks || []).map(b => b.id)]);

    let cashSection = "*الأصول النقدية* 💰\n\n";
    let bankSection = "*الأصول المصرفية* 🏦\n\n";
    let hasCashAssets = false;
    let hasBankAssets = false;

    // Process Cash Assets
    Array.from(allAssetIds)
        .filter(key => key !== 'bankLyd' && ASSET_NAMES[key])
        .forEach(assetId => {
            hasCashAssets = true;
            const currency = assetId.toLowerCase().includes('usd') ? Currency.USD :
                             assetId.toLowerCase().includes('tnd') ? Currency.TND :
                             assetId.toLowerCase().includes('eur') ? Currency.EUR : Currency.LYD;
            cashSection += formatBalanceRow(
                ASSET_NAMES[assetId],
                openingBalances.assets?.[assetId] || 0,
                closingBalances.assets?.[assetId] || 0,
                currency
            );
        });
    
    if (!hasCashAssets) cashSection += "_لا توجد حركة على الأصول النقدية_\n";
    
    // Process Bank Assets
    Array.from(allBankIds).forEach(bankId => {
        const openingBank = (openingBalances.banks || []).find(b => b.id === bankId);
        const closingBank = (closingBalances.banks || []).find(b => b.id === bankId);
        // Only include banks that have a balance or are POS enabled, to avoid clutter
        if (!closingBank?.isPosEnabled) {
            hasBankAssets = true;
            bankSection += formatBalanceRow(
                escapeMarkdownV2(closingBank?.name || openingBank?.name || 'مصرف محذوف'),
                openingBank?.balance || 0,
                closingBank?.balance || 0,
                Currency.LYD
            );
        }
    });

    if (!hasBankAssets) bankSection += "_لا توجد حركة على الأصول المصرفية_\n";

    const footer = `\n---\n*${escapeMarkdownV2("تم إنشاؤه بواسطة نظام كيان الدولي")}*\n${escapeMarkdownV2(date)}`;
    
    return `${title}\n\n${cashSection}\n${bankSection}${footer}`;
};

export const formatDollarCardCustomerForTelegram = (purchase: DollarCardPurchase): string => {
    // Using plain text is more reliable than Markdown for user-provided data.
    const name = purchase.customerName || 'غير متوفر';
    const nationalId = purchase.nationalId || 'غير متوفر';
    const accountNumber = purchase.accountNumber || 'غير متوفر';

    let message = "📄 تقرير بيانات زبون بطاقة دولار\n\n";
    message += `الاسم: ${name}\n`;
    message += `الرقم الوطني: ${nationalId}\n`;
    message += `رقم الحساب: ${accountNumber}\n\n`;
    message += `---\n`;
    message += `تم إنشاؤه بواسطة نظام كيان الدولي`;

    return message;
};
