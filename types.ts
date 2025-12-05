

import React from 'react';
import { PERMISSION_CATEGORIES } from "./lib/permissions";

export enum Currency {
    LYD = 'LYD',
    USD = 'USD',
    TND = 'TND',
    EUR = 'EUR',
    SAR = 'SAR',
    EGP = 'EGP',
}

export enum TransactionType {
    Deposit = 'إيداع',
    Withdrawal = 'سحب',
    BankDeposit = 'إيداع بنكي',
    BankWithdrawal = 'سحب بنكي',
    ManualBankUpdate = 'تعديل رصيد بنكي يدوي',
    NewDebt = 'دين جديد',
    DebtCollection = 'تحصيل دين',
    NewReceivable = 'مستحق جديد',
    ReceivablePayment = 'دفع مستحق',
    Reversal = 'عكس قيد',
    Settlement = 'تسوية',
    DebtConversion = 'تحويل عملة دين',
    BankDeletion = 'حذف مصرف',
}

export type AssetId = 'cashLydMisrata' | 'cashLydTripoli' | 'cashLydZliten' | 'bankLyd' | 'cashUsdLibya' | 'cashUsdTurkey' | 'cashTnd' | 'cashEurLibya' | 'cashEurTurkey' | 'cashSar' | 'cashEgp';

export const ASSET_NAMES: Record<string, string> = {
    cashLydMisrata: 'خزنة الدينار (مصراتة)',
    cashLydTripoli: 'خزنة الدينار (طرابلس)',
    cashLydZliten: 'خزنة الدينار (زليتن)',
    bankLyd: 'المصارف',
    cashUsdLibya: 'خزنة الدولار (ليبيا)',
    cashUsdTurkey: 'خزنة الدولار (تركيا)',
    cashTnd: 'خزنة الدينار التونسي',
    cashEurLibya: 'خزنة اليورو (ليبيا)',
    cashEurTurkey: 'خزنة اليورو (تركيا)',
    cashSar: 'خزنة الريال السعودي',
    cashEgp: 'خزنة الجنيه المصري',
};

export const LYD_CASH_ASSET_IDS: AssetId[] = ['cashLydMisrata', 'cashLydTripoli', 'cashLydZliten'];


export interface Transaction {
    id: string;
    date: string;
    type: TransactionType;
    amount: number;
    currency: Currency;
    description: string;
    relatedParty: string;
    assetId: string;
    user?: string; // User who performed the transaction
    groupId?: string;
    isDeleted?: boolean;
    isTemporarilyHidden?: boolean;
    metadata?: Record<string, any>;
}

export interface Bank {
    id: string;
    name: string;
    balance: number;
    isPosEnabled: boolean;
}

export interface Debt {
    id:string;
    amount: number;
    paid: number;
    date: string;
    isArchived?: boolean;
    metadata?: {
        mergedFrom?: string[];
    };
}

export interface Customer {
    id: string;
    name: string;
    currency: Currency;
    debts: Debt[];
    isArchived: boolean;
    isBankDebt?: boolean;
}

export interface Receivable {
    id: string;
    debtor: string;
    amount: number;
    paid: number;
    currency: Currency;
    date: string;
    isArchived: boolean;
    metadata?: {
        mergedFrom?: string[];
    };
}

export interface PosTransactionDetail {
    id: string;
    date: string;
    totalAmount: number;
    bankCommissionRate: number;
    bankDepositAmount: number;
    cashGivenToCustomer: number;
    lydCashAssetId: AssetId;
    bankId: string;
    transactionCount: number;
    note?: string;
    netProfit: number;
    bankName: string;
    isArchived: boolean;
}

export interface DollarCardPayment {
    id: string;
    date: string;
    amount: number;
    source: string; // source can be a bank id or a specific cashLyd assetId
    sourceName: string;
    note?: string;
}

export interface DollarCardPurchase {
    id: string;
    customerName: string;
    nationalId?: string;
    phone?: string;
    passportNumber?: string;
    contactInfo?: string; // New: تواصل
    accountNumber?: string; // New: رقم الحساب
    iban?: string; // New: ايبان
    payments: DollarCardPayment[];
    status: 'active' | 'completed';
    isArchived: boolean;
    createdAt: string;
    completionDetails?: {
        receivedUsdAmount: number;
        usdDestinationAsset: 'cashUsdLibya' | 'cashUsdTurkey';
        totalLydPaid: number;
        finalCostPerDollar: number;
        completionDate: string;
    };
}

export interface ExpenseType {
    id: string;
    name: string;
}

export interface OperatingCost {
    id: string;
    date: string;
    amount: number;
    source: string; // can be bank id or a specific cashLyd assetId
    sourceName: string;
    expenseTypeId: string;
    expenseTypeName: string;
    note?: string;
}

export interface DailyOpeningBalances {
    date: string; // 'YYYY-MM-DD'
    balances: {
        assets: Record<AssetId, number>;
        banks: Bank[];
    };
}

// Permissions System
type PermissionGroup = {
    [key: string]: boolean;
};

export type Permissions = {
    [K in keyof typeof PERMISSION_CATEGORIES]: PermissionGroup;
};

export interface User {
    id: string;
    username: string;
    password?: string; // Optional on read, required on write
    displayName: string;
    permissions: Permissions;
}

// A new type for refund destination
export interface RefundDestination {
    assetId: string; // This can be a cash asset id or a bank id
}

export interface PendingTrade {
  id: string;
  createdAt: string;
  status: 'pending' | 'deleted';
  description: string;
  tradeData: {
      type: 'buyUsd' | 'sellUsd' | 'buyForeignCurrency' | 'sellForeignCurrency' | 'adjustBalance';
      // Store all the arguments for the original function
      [key: string]: any;
  }
}

export interface ExternalValue {
    id: string;
    name: string;
    amount: number;
    currency: Currency;
    notes?: string;
    createdAt: string;
}

export interface ExternalValueTransaction {
  id: string;
  externalValueId: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'initial';
  amount: number; // Always positive
  notes?: string;
  user: string;
}

export interface CapitalHistoryEntry {
    date: string; // ISO string
    finalLydCapital: number;
    rates: {
        USD: number | { amount: number; rate: number }[];
        EUR: number | { amount: number; rate: number }[];
        TND: number | { amount: number; rate: number }[];
        SAR: number | { amount: number; rate: number }[];
        EGP: number | { amount: number; rate: number }[];
    };
    // Fix: Using explicit string keys instead of computed enum keys to avoid potential type inference issues.
    capitalBreakdown: {
        LYD: number;
        USD: number;
        EUR: number;
        TND: number;
        SAR: number;
        EGP: number;
    };
    detailedBreakdown?: {
        lyd: { label: string; value: number; sign: string; }[];
        usd: { label: string; value: number; sign: string; }[];
        eur?: { label: string; value: number; sign: string; }[];
        tnd?: { label: string; value: number; sign: string; }[];
        sar?: { label: string; value: number; sign: string; }[];
        egp?: { label: string; value: number; sign: string; }[];
    };
}

export interface DashboardCardConfig {
  id: string;
  label: string;
  isVisible: boolean;
  isFullWidth?: boolean;
}

export interface SidebarItemConfig {
    id: string;
    isVisible: boolean;
}

// FIX: Moved DEFAULT_DASHBOARD_CARDS here to resolve circular dependency and import issues.
export const DEFAULT_DASHBOARD_CARDS: DashboardCardConfig[] = [
    { id: 'pos_banks', label: 'مصرف ماكينة P.O.S', isVisible: true },
    { id: 'active_cards', label: 'معاملات البطاقات $', isVisible: true },
    { id: 'lyd_cash', label: 'خزنة الدينار الليبي (الإجمالي)', isVisible: true },
    { id: 'non_pos_banks', label: 'المصارف (غير شاملة P.O.S)', isVisible: true },
    { id: 'usd_libya', label: ASSET_NAMES.cashUsdLibya, isVisible: true },
    { id: 'usd_turkey', label: ASSET_NAMES.cashUsdTurkey, isVisible: true },
    { id: 'tnd_cash', label: ASSET_NAMES.cashTnd, isVisible: true },
    { id: 'eur_libya', label: ASSET_NAMES.cashEurLibya, isVisible: true },
    { id: 'eur_turkey', label: ASSET_NAMES.cashEurTurkey, isVisible: true },
    { id: 'sar_cash', label: ASSET_NAMES.cashSar, isVisible: true },
    { id: 'egp_cash', label: ASSET_NAMES.cashEgp, isVisible: true },
    { id: 'total_debts', label: 'مجموع الديون', isVisible: true },
    { id: 'total_receivables', label: 'الديون اللتي علينا (المستحقات)', isVisible: true },
    { id: 'daily_movement', label: 'الحركة اليومية للخزنات الرئيسية', isVisible: true, isFullWidth: true },
];

export const DEFAULT_SIDEBAR_CONFIG: SidebarItemConfig[] = [
    { id: 'dashboard', isVisible: true },
    { id: 'banks', isVisible: true },
    { id: 'pos', isVisible: true },
    { id: 'debts', isVisible: true },
    { id: 'receivables', isVisible: true },
    { id: 'dollar-cards', isVisible: true },
    { id: 'dollar-card-history', isVisible: true },
    { id: 'operating-costs', isVisible: true },
    { id: 'transactions', isVisible: true },
    { id: 'cash-flow', isVisible: true },
    { id: 'incomplete-trades', isVisible: true },
    { id: 'external-values', isVisible: true },
    { id: 'closing', isVisible: true },
    { id: 'transaction-management', isVisible: true },
];

export interface AppContextType {
    currentUser: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasPermission: (category: keyof Permissions, permission: string) => boolean;
    
    // User Management
    users: User[];
    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (userId: string, updates: Partial<User>) => void;
    deleteUser: (userId: string) => void;

    // App Data
    assets: Record<AssetId, number>;
    banks: Bank[];
    customers: Customer[];
    receivables: Receivable[];
    transactions: Transaction[];
    posTransactions: PosTransactionDetail[];
    dollarCardPurchases: DollarCardPurchase[];
    operatingCosts: OperatingCost[];
    expenseTypes: ExpenseType[];
    telegramSettings: { token: string; chatId: string; };
    isClosingModalOpen: boolean;
    dailyOpeningBalancesHistory: DailyOpeningBalances[];
    pendingTrades: PendingTrade[];
    externalValues: ExternalValue[];
    externalValueTransactions: ExternalValueTransaction[];
    capitalHistory: CapitalHistoryEntry[];
    dashboardCardConfig: DashboardCardConfig[];
    sidebarConfig: SidebarItemConfig[];
    isSidebarCollapsed: boolean;
    isNumberFormattingEnabled: boolean;
    showCapitalEvolution: boolean;
    isDetailedView: boolean;

    setDashboardCardConfig: React.Dispatch<React.SetStateAction<DashboardCardConfig[]>>;
    setSidebarConfig: React.Dispatch<React.SetStateAction<SidebarItemConfig[]>>;
    toggleSidebar: () => void;
    setIsNumberFormattingEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCapitalEvolution: React.Dispatch<React.SetStateAction<boolean>>;
    setIsDetailedView: React.Dispatch<React.SetStateAction<boolean>>;
    
    addCapitalHistoryEntry: (entry: CapitalHistoryEntry) => void;
    addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => void;
    addBank: (name: string, initialBalance: number, isPosEnabled: boolean) => void;
    updateBank: (id: string, name: string, balance?: number, isPosEnabled?: boolean) => void;
    deleteBank: (id: string) => void;
    addCustomer: (name: string, currency: Currency, isBankDebt?: boolean) => string;
    addDebt: (customerId: string, amount: number, options?: { usdSourceAsset?: 'cashUsdLibya' | 'cashUsdTurkey', lydCashAssetId?: AssetId, bankId?: string, isExternal?: boolean, reason?: string, groupId?: string }) => string;
    payDebt: (customerId: string, debtId: string, amount: number, destination: { 
        type: 'cashLyd' | 'bank' | 'cashUsd' | 'settlement' | 'external_settlement'; 
        assetId: string; 
        bankId?: string; 
        receivableId?: string;
        surplusDestination?: { 
            assetId: string; 
            type: 'cashLyd' | 'bank' | 'cashUsd';
        };
    }, options?: { 
        isProfit?: boolean;
        surplusHandling?: {
            type: 'deposit' | 'profit' | 'receivable';
            receivableCustomerId?: string;
            newReceivableCustomerName?: string;
        };
    }) => void;
    addReceivable: (debtor: string, amount: number, currency: Currency, destination?: { type: 'cashLyd' | 'bank' | 'cashUsd'; assetId: string; bankId?: string; }, options?: { groupId?: string }) => string;
    payReceivable: (id: string, amount: number, source: { type: 'cashLyd' | 'bank' | 'cashUsd' | 'external'; assetId: string; bankId?: string; }) => void;
    archiveReceivable: (id: string) => void;
    restoreReceivable: (id: string) => void;
    archiveDebtor: (debtorName: string, currency: Currency) => void;
    restoreDebtor: (debtorName: string, currency: Currency) => void;
    mergeDebtorReceivables: (debtorName: string, currency: Currency) => void;
    deleteArchivedReceivable: (receivableId: string) => void;
    getTotalDebts: (currency: Currency) => number;
    getTotalReceivables: (currency: Currency) => number;
    buyUsd: (usdAmount: number, rate: number, lydSource: 'cashLyd' | 'bank', usdDestination: 'cashUsdLibya' | 'cashUsdTurkey', options: { bankId?: string; isDebt?: boolean; customerId?: string; isReceivable?: boolean; receivablePartyOption?: { value: string; label: string; __isNew__?: boolean } | null; lydCashAssetId?: AssetId; note?: string; originalRate?: number; totalLydAmount?: number; isDebtSettlement?: boolean; settlementDebtCustomerId?: string; newSettlementDebtCustomerName?: string; }) => void;
    sellUsd: (usdAmount: number, rate: number, usdSource: 'cashUsdLibya' | 'cashUsdTurkey', lydDestination: 'cashLyd' | 'bank', options: { bankId?: string; isDebt?: boolean; customerId?: string; newCustomerName?: string; isReceivableSettlement?: boolean; receivableId?: string; lydCashAssetId?: AssetId; note?: string; originalRate?: number; totalLydAmount?: number; excessHandling?: { type: 'deposit' | 'debt'; customerId?: string; newCustomerName?: string; }; }) => void;
    buyForeignCurrency: (foreignAmount: number, rate: number, foreignCurrency: Currency, foreignAssetId: AssetId, lydSource: { type: 'cashLyd' | 'bank', bankId?: string, lydCashAssetId?: AssetId }, options: { isReceivable?: boolean; receivablePartyOption?: { value: string; label: string; __isNew__?: boolean } | null; note?: string; originalRate?: number; totalLydAmount?: number; isDebtSettlement?: boolean; settlementDebtCustomerId?: string; newSettlementDebtCustomerName?: string; }) => void;
    sellForeignCurrency: (foreignAmount: number, rate: number, foreignCurrency: Currency, foreignAssetId: AssetId, lydDestination: { type: 'cashLyd' | 'bank', bankId?: string, lydCashAssetId?: AssetId }, options: { isDebt?: boolean; customerId?: string; newCustomerName?: string; isReceivableSettlement?: boolean; receivableId?: string; note?: string; originalRate?: number; totalLydAmount?: number; excessHandling?: { type: 'deposit' | 'debt'; customerId?: string; newCustomerName?: string; }; }) => void;
    adjustAssetBalance: (assetId: AssetId, amount: number, type: 'deposit' | 'withdrawal', note: string, options?: { isProfit?: boolean; isLoss?: boolean }) => void;
    exchangeBetweenUsdAssets: (details: {
        amount: number;
        toAmount: number;
        fromAsset: 'cashUsdLibya' | 'cashUsdTurkey';
        fee: {
            type: 'add' | 'deduct';
            amount: number;
            handling: 'cash' | 'debt' | 'receivable';
            lydAssetId?: AssetId;
            customerOption?: { value: string; label: string; __isNew__?: boolean };
            receivableOption?: { value: string; label: string; __isNew__?: boolean };
        };
        note?: string;
    }) => void;
    exchangeBetweenEurAssets: (details: {
        amount: number;
        toAmount: number;
        fromAsset: 'cashEurLibya' | 'cashEurTurkey';
        fee: {
            type: 'add' | 'deduct';
            amount: number;
            handling: 'cash' | 'debt' | 'receivable';
            lydAssetId?: AssetId;
            customerOption?: { value: string; label: string; __isNew__?: boolean };
            receivableOption?: { value: string; label: string; __isNew__?: boolean };
        };
        note?: string;
    }) => void;
    transferBetweenBanks: (fromBankId: string, toBankId: string, amount: number) => void;
    exchangeFromBankToCash: (bankId: string, amount: number, lydCashAssetId: AssetId) => void;
    exchangeFromCashToBank: (lydCashAssetId: AssetId, amount: number, bankId: string) => void;
    archiveCustomer: (customerId: string) => void;
    restoreCustomer: (customerId: string) => void;
    mergeCustomerDebts: (customerId: string) => void;
    convertSingleUsdDebtToLyd: (details: { 
        customerId: string; 
        debtId: string; 
        usdAmountToConvert: number;
        conversion: { rate?: number; totalLydAmount?: number; };
        destination: { type: 'existing_customer' | 'new_customer'; customerId?: string; newCustomerName?: string; }
    }) => void;
    adjustBankBalance: (bankId: string, amount: number, type: 'deposit' | 'withdrawal', note: string) => void;
    addPosTransaction: (details: { totalAmount: number; bankCommissionRate: number; bankDepositAmount: number; cashGivenToCustomer: number; bankId: string; transactionCount: number; lydCashAssetId: AssetId; note?: string; }) => void;
    archivePosTransaction: (id: string) => void;
    restorePosTransaction: (id: string) => void;
    deletePosTransaction: (id: string, silent?: boolean) => void;
    getPosTotalDeposits: (period: 'daily' | 'weekly' | 'monthly') => number;
    getActiveDollarCardSpend: () => { totalSpend: number; fromCash: number; fromBanks: number; fromExternal: number; };
    addDollarCardPurchase: (customerInfo: Pick<DollarCardPurchase, 'customerName' | 'nationalId' | 'phone' | 'passportNumber' | 'contactInfo' | 'accountNumber' | 'iban'>) => void;
    updateDollarCardCustomerInfo: (purchaseId: string, newInfo: Pick<DollarCardPurchase, 'customerName' | 'nationalId' | 'phone' | 'passportNumber' | 'contactInfo' | 'accountNumber' | 'iban'>) => void;
    addPaymentToDollarCardPurchase: (purchaseId: string, paymentDetails: { amount: number; source: string; note?: string; isExternal?: boolean; }) => void;
    updateDollarCardPayment: (purchaseId: string, paymentId: string, newAmount: number) => void;
    deletePaymentFromDollarCardPurchase: (purchaseId: string, paymentId: string, silent?: boolean) => void;
    completeDollarCardPurchase: (purchaseId: string, completionDetails: { receivedUsdAmount: number; usdDestinationAsset: 'cashUsdLibya' | 'cashUsdTurkey' }) => void;
    deleteDollarCardPurchase: (purchaseId: string) => void;
    archiveDollarCardPurchase: (purchaseId: string) => void;
    restoreDollarCardPurchase: (purchaseId: string) => void;
    addExpenseType: (name: string) => void;
    deleteExpenseType: (id: string) => void;
    addOperatingCost: (cost: { amount: number; source: string; expenseTypeId: string; note?: string; date: string; }) => void;
    updateOperatingCost: (costId: string, updates: { amount: number; source: string; expenseTypeId: string; note?: string; date: string; }) => void;
    deleteOperatingCost: (costId: string, silent?: boolean) => void;
    showDailyClosingReport: () => void;
    hideDailyClosingReport: () => void;
    getComparisonReportData: (period: 'day' | 'week' | 'month' | 'year') => { openingBalances: DailyOpeningBalances['balances']; closingBalances: DailyOpeningBalances['balances']; title: string; } | null;
    forceCloseAndRollover: (dateStr: string) => void;
    deleteTransactionGroup: (groupId: string) => void;
    restoreTransactionGroup: (groupId: string) => void;
    updateTransactionDate: (transactionIds: string[], direction: 'forward' | 'backward') => void;
    toggleTransactionVisibility: (transactionIds: string[], hide: boolean) => void;
    updateTelegramSettings: (token: string, chatId: string) => void;
    sendTestTelegramMessage: () => Promise<boolean>;
    sendDollarCardReportToTelegram: (purchaseId: string) => Promise<boolean>;
    exportData: (overrides?: { capitalHistory?: CapitalHistoryEntry[] }) => string;
    importData: (jsonData: Record<string, any>) => void;
    migrateData: (jsonData: Record<string, string>) => void;
    // Pending Trades
    addPendingTrade: (description: string, tradeData: PendingTrade['tradeData']) => void;
    updatePendingTrade: (tradeId: string, newDescription: string, newTradeData: PendingTrade['tradeData']) => void;
    confirmPendingTrade: (tradeId: string) => void;
    deletePendingTrade: (tradeId: string) => void;
    restorePendingTrade: (tradeId: string) => void;
    // External Values
    addExternalValue: (value: Omit<ExternalValue, 'id' | 'createdAt'>) => void;
    adjustExternalValue: (id: string, amount: number, type: 'deposit' | 'withdrawal', notes?: string) => void;
    deleteExternalValue: (id: string) => void;
    deleteExternalValueTransaction: (transactionId: string) => void;
    uploadAllDataToSupabase?: () => Promise<void>;
    loadDataFromSupabase?: () => Promise<void>;
}
