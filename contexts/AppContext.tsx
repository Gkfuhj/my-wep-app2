import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { Transaction, Bank, Customer, Receivable, Currency, TransactionType, AssetId, ASSET_NAMES, PosTransactionDetail, DollarCardPurchase, DollarCardPayment, OperatingCost, ExpenseType, DailyOpeningBalances, User, Permissions, LYD_CASH_ASSET_IDS, Debt, AppContextType, RefundDestination, PendingTrade, ExternalValue, ExternalValueTransaction, CapitalHistoryEntry, DashboardCardConfig, SidebarItemConfig, DEFAULT_SIDEBAR_CONFIG, DEFAULT_DASHBOARD_CARDS } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { generateFullPermissions, PERMISSION_CATEGORIES } from '../lib/permissions';
import { formatReportForTelegram, formatDollarCardCustomerForTelegram } from '../lib/telegram';
import { formatCurrency, getLocalISOString } from '../lib/utils';
import { supabase } from '../lib/supabase';
// import { DataStore } from 'aws-amplify'; // Import this after running 'amplify init'
// import { Bank as BankModel } from '../models'; // Import generated models

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within a AppProvider');
    }
    return context;
};

const defaultAdminUser: User = {
    id: 'admin-user',
    username: 'admin',
    password: 'admin',
    displayName: 'المدير العام',
    permissions: generateFullPermissions(),
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // NOTE: To enable Full AWS Sync:
    // 1. Run 'amplify init' and 'amplify add api' (choose GraphQL -> DataStore).
    // 2. Define models in schema.graphql matching the types in 'types.ts'.
    // 3. Run 'amplify codegen models'.
    // 4. Replace useLocalStorage below with useState and use DataStore.query() in useEffect.
    
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);
    const [users, setUsers] = useLocalStorage<User[]>('users', [defaultAdminUser]);
    const [assets, setAssets] = useLocalStorage<Record<Exclude<AssetId, 'bankLyd'>, number>>('assets', {
        cashLydMisrata: 0,
        cashLydTripoli: 0,
        cashLydZliten: 0,
        cashUsdLibya: 0,
        cashUsdTurkey: 0,
        cashTnd: 0,
        cashEurLibya: 0,
        cashEurTurkey: 0,
        cashSar: 0,
        cashEgp: 0,
    });
    const [banks, setBanks] = useLocalStorage<Bank[]>('banks', []);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);
    const [receivables, setReceivables] = useLocalStorage<Receivable[]>('receivables', []);
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [posTransactions, setPosTransactions] = useLocalStorage<PosTransactionDetail[]>('posTransactions', []);
    const [dollarCardPurchases, setDollarCardPurchases] = useLocalStorage<DollarCardPurchase[]>('dollarCardPurchases', []);
    const [operatingCosts, setOperatingCosts] = useLocalStorage<OperatingCost[]>('operatingCosts', []);
    const [expenseTypes, setExpenseTypes] = useLocalStorage<ExpenseType[]>('expenseTypes', []);
    const [dailyOpeningBalancesHistory, setDailyOpeningBalancesHistory] = useLocalStorage<DailyOpeningBalances[]>('dailyOpeningBalancesHistory', []);
    const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
    const [pendingTrades, setPendingTrades] = useLocalStorage<PendingTrade[]>('pendingTrades', []);
    const [externalValues, setExternalValues] = useLocalStorage<ExternalValue[]>('externalValues', []);
    const [externalValueTransactions, setExternalValueTransactions] = useLocalStorage<ExternalValueTransaction[]>('externalValueTransactions', []);
    const [capitalHistory, setCapitalHistory] = useLocalStorage<CapitalHistoryEntry[]>('capitalHistory', []);
    const [telegramSettings, setTelegramSettings] = useLocalStorage('telegramSettings', { token: '', chatId: '' });
    const [lastReportSent, setLastReportSent] = useLocalStorage('lastReportSent', { daily: '', weekly: '', monthly: '' });
    const [dashboardCardConfig, setDashboardCardConfig] = useLocalStorage<DashboardCardConfig[]>('dashboardCardConfig', DEFAULT_DASHBOARD_CARDS);
    const [sidebarConfig, setSidebarConfig] = useLocalStorage<SidebarItemConfig[]>('sidebarConfig', DEFAULT_SIDEBAR_CONFIG);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('isSidebarCollapsed', false);
    const [isNumberFormattingEnabled, setIsNumberFormattingEnabled] = useLocalStorage('isNumberFormattingEnabled', false);
    const [showCapitalEvolution, setShowCapitalEvolution] = useLocalStorage('showCapitalEvolution', false);
    const [isDetailedView, setIsDetailedView] = useLocalStorage('isDetailedView', true);
    
    const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);
    
    const syncQueueRef = React.useRef<Set<string>>(new Set());
    const syncTimerRef = React.useRef<number | null>(null);

    const enqueueSync = (key: string) => {
        if (!isSupabaseEnabled || !currentUser) return;
        syncQueueRef.current.add(key);
        if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = window.setTimeout(async () => {
            const keys = Array.from(syncQueueRef.current);
            syncQueueRef.current.clear();
            for (const k of keys) {
                const valueMap: Record<string, any> = {
                    users, assets, banks, customers, receivables, transactions,
                    posTransactions, dollarCardPurchases, expenseTypes, operatingCosts,
                    dailyOpeningBalancesHistory, pendingTrades, externalValues,
                    externalValueTransactions, telegramSettings, lastReportSent,
                    capitalHistory, dashboardCardConfig, sidebarConfig,
                    isSidebarCollapsed, isNumberFormattingEnabled, showCapitalEvolution,
                    isDetailedView,
                };
                const payload = valueMap[k];
                if (payload === undefined) continue;
                await supabase!.from('app_data').upsert({ key: k, value: payload });
            }
        }, 500);
    };
    const isSupabaseEnabled = !!supabase;

    useEffect(() => {
        if (!isSupabaseEnabled) return;
        (async () => {
            const { data } = await supabase!.auth.getSession();
            const u = data.session?.user;
            if (u && !currentUser) {
                setCurrentUser({ id: u.id, username: u.email || u.id, displayName: u.email || u.id, permissions: generateFullPermissions() });
                await loadDataFromSupabase();
                startRealtime();
            }
        })();
        const { data: sub } = supabase!.auth.onAuthStateChange((_event, session) => {
            const u = session?.user;
            if (u) {
                setCurrentUser({ id: u.id, username: u.email || u.id, displayName: u.email || u.id, permissions: generateFullPermissions() });
                startRealtime();
            } else {
                setCurrentUser(null);
            }
        });
        return () => { sub.subscription.unsubscribe(); };
    }, []);

    /* 
       AWS Sync Placeholder:
       useEffect(() => {
           const subscription = DataStore.observe(BankModel).subscribe(() => {
               DataStore.query(BankModel).then(setBanks);
           });
           return () => subscription.unsubscribe();
       }, []);
    */

    useEffect(() => {
        setDashboardCardConfig(prevConfig => {
            const defaultConfigMap = new Map(DEFAULT_DASHBOARD_CARDS.map(c => [c.id, c]));
            const prevConfigMap = new Map(prevConfig.map(c => [c.id, c]));
            let needsUpdate = false;
    
            // Start with the user's saved order
            const newConfig: DashboardCardConfig[] = prevConfig
                // Filter out cards that are no longer in the default list
                .filter(savedCard => defaultConfigMap.has(savedCard.id))
                // Update properties from the default config (like label)
                .map(savedCard => {
                    const defaultCard = defaultConfigMap.get(savedCard.id)!;
                    if (savedCard.label !== defaultCard.label || savedCard.isFullWidth !== defaultCard.isFullWidth) {
                        needsUpdate = true;
                    }
                    return {
                        ...savedCard,
                        label: defaultCard.label,
                        isFullWidth: defaultCard.isFullWidth,
                    };
                });
    
            // Add any new cards from the default list that weren't in the saved config
            DEFAULT_DASHBOARD_CARDS.forEach(defaultCard => {
                if (!prevConfigMap.has(defaultCard.id)) {
                    newConfig.push(defaultCard);
                    needsUpdate = true;
                }
            });
            
            if (newConfig.length !== prevConfig.length) {
                needsUpdate = true;
            }
    
            return needsUpdate ? newConfig : prevConfig;
        });
    }, []);

    useEffect(() => {
        setSidebarConfig(prevConfig => {
            const defaultConfigMap = new Map(DEFAULT_SIDEBAR_CONFIG.map(c => [c.id, c]));
            const prevConfigMap = new Map(prevConfig.map(c => [c.id, c]));
            let needsUpdate = false;

            const newConfig: SidebarItemConfig[] = prevConfig
                .filter(savedItem => defaultConfigMap.has(savedItem.id))
                .map(savedItem => savedItem); 

            DEFAULT_SIDEBAR_CONFIG.forEach(defaultItem => {
                if (!prevConfigMap.has(defaultItem.id)) {
                    newConfig.push(defaultItem);
                    needsUpdate = true;
                }
            });

            if (newConfig.length !== prevConfig.length) {
                needsUpdate = true;
            }

            return needsUpdate ? newConfig : prevConfig;
        });
    }, []);

    // Derived state for non-POS bank balance.
    const totalNonPosBankBalance = useMemo(() => {
        return banks
            .filter(bank => !bank.isPosEnabled)
            .reduce((sum, bank) => sum + bank.balance, 0);
    }, [banks]);

    // Create a complete assets object to provide to the context consumers.
    const assetsWithDerived: Record<AssetId, number> = useMemo(() => ({
        ...assets,
        bankLyd: totalNonPosBankBalance,
    }), [assets, totalNonPosBankBalance]);
    
    const findFinalActiveParentDebt = (childId: string, customerDebts: Debt[]): Debt | null => {
        let parent = customerDebts.find(d => d.metadata?.mergedFrom?.includes(childId));
        if (!parent) return null;
    
        while (true) {
            const nextParent = customerDebts.find(d => d.metadata?.mergedFrom?.includes(parent!.id));
            if (nextParent) {
                parent = nextParent;
            } else {
                break;
            }
        }
    
        return !parent.isArchived ? parent : null;
    };

    const addTransaction = (tx: Omit<Transaction, 'id' | 'date'>) => {
        const newTransaction: Transaction = {
            ...tx,
            id: crypto.randomUUID(),
            date: getLocalISOString(),
            user: currentUser?.displayName || 'نظام',
        };
        setTransactions(prev => [newTransaction, ...prev]);
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        if (isSupabaseEnabled) {
            const { data, error } = await supabase!.auth.signInWithPassword({ email: username, password });
            if (error || !data.user) {
                return false;
            }
            const newUser: User = {
                id: data.user.id,
                username,
                displayName: data.user.email || username,
                permissions: generateFullPermissions(),
            };
            setCurrentUser(newUser);
            await loadDataFromSupabase();
            startRealtime();
            return true;
        } else {
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                setCurrentUser(user);
                return true;
            }
            return false;
        }
    };

    const logout = () => {
        if (isSupabaseEnabled) {
            supabase!.auth.signOut();
        }
        setCurrentUser(null);
    };

    const hasPermission = (category: keyof Permissions, permission: string): boolean => {
        if (!currentUser) return false;
        if (currentUser.id === 'admin-user') return true;
        return currentUser.permissions[category]?.[permission] || false;
    };
    
    const addUser = (user: Omit<User, 'id'>) => setUsers(prev => [...prev, { ...user, id: crypto.randomUUID() }]);
    const updateUser = (userId: string, updates: Partial<User>) => setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    const deleteUser = (userId: string) => setUsers(prev => prev.filter(u => u.id !== userId));

    const addBank = (name: string, initialBalance: number, isPosEnabled: boolean) => {
        const newBank: Bank = { id: crypto.randomUUID(), name, balance: initialBalance, isPosEnabled };
        setBanks(prev => [...prev, newBank]);
        // To Sync with AWS: await DataStore.save(new BankModel({ name, balance: initialBalance, ... }));
        if (initialBalance !== 0) {
            addTransaction({ type: TransactionType.BankDeposit, amount: initialBalance, currency: Currency.LYD, description: `رصيد افتتاحي لمصرف ${name}`, relatedParty: 'النظام', assetId: newBank.id });
        }
    };
    const updateBank = (id: string, name: string, balance?: number, isPosEnabled?: boolean) => {
        setBanks(prev => prev.map(b => {
            if (b.id === id) {
                const oldBalance = b.balance;
                const newBalance = balance ?? oldBalance;
                if (balance !== undefined && oldBalance !== newBalance) {
                     addTransaction({
                        type: TransactionType.ManualBankUpdate,
                        amount: newBalance - oldBalance,
                        currency: Currency.LYD,
                        description: `تعديل يدوي لرصيد ${name}`,
                        relatedParty: 'النظام',
                        assetId: id
                    });
                }
                return { ...b, name, balance: newBalance, isPosEnabled: isPosEnabled ?? b.isPosEnabled };
            }
            return b;
        }));
    };
    
    const deleteBank = (id: string) => {
        const bankToDelete = banks.find(b => b.id === id);
        if (!bankToDelete) return;

        addTransaction({
            type: TransactionType.BankDeletion,
            amount: -bankToDelete.balance,
            currency: Currency.LYD,
            description: `حذف مصرف: ${bankToDelete.name} برصيد ${formatCurrency(bankToDelete.balance, Currency.LYD)}`,
            relatedParty: 'النظام',
            assetId: bankToDelete.id,
            metadata: {
                deletedBankName: bankToDelete.name,
                deletedBankBalance: bankToDelete.balance
            }
        });

        setBanks(prev => prev.filter(b => b.id !== id));
    };
    
    // ... (keep previous functions for Customer, Debt, Receivable, etc. unchanged)
    const addCustomer = (name: string, currency: Currency, isBankDebt?: boolean): string => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            throw new Error("Customer name cannot be empty.");
        }
        const existingCustomer = customers.find(c => c.name.trim() === trimmedName && c.currency === currency);
        if (existingCustomer) {
            return existingCustomer.id;
        }
        const newCustomer: Customer = {
            id: crypto.randomUUID(),
            name: trimmedName,
            currency,
            debts: [],
            isArchived: false,
            isBankDebt,
        };
        setCustomers(prev => [...prev, newCustomer]);
        return newCustomer.id;
    };

    const addDebt = (customerId: string, amount: number, options?: { usdSourceAsset?: 'cashUsdLibya' | 'cashUsdTurkey', lydCashAssetId?: AssetId, bankId?: string, isExternal?: boolean, reason?: string, groupId?: string }): string => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return '';

        const newDebt: Debt = { id: crypto.randomUUID(), amount, paid: 0, date: getLocalISOString() };
        let finalDebtId = newDebt.id;

        setCustomers(prev => {
            const customerIndex = prev.findIndex(c => c.id === customerId);
            if (customerIndex === -1) return prev;
    
            const currentCustomer = prev[customerIndex];
            const debtsWithNew = [...currentCustomer.debts, newDebt];
            
            const unpaidDebts = debtsWithNew.filter(d => (d.amount - d.paid) > 0 && !d.isArchived);
            let finalDebts = debtsWithNew;
            if (unpaidDebts.length > 1) {
                const totalUnpaid = unpaidDebts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
                const mergedDebt: Debt = { id: crypto.randomUUID(), amount: totalUnpaid, paid: 0, date: getLocalISOString(), metadata: { mergedFrom: unpaidDebts.map(d => d.id) } };
                const archivedDebts = debtsWithNew.map(d => unpaidDebts.some(ud => ud.id === d.id) ? { ...d, isArchived: true } : d);
                finalDebts = [...archivedDebts, mergedDebt];
                finalDebtId = mergedDebt.id;
            }
            
            const updatedCustomers = [...prev];
            updatedCustomers[customerIndex] = { ...currentCustomer, debts: finalDebts };
            return updatedCustomers;
        });
    
        if (!options?.isExternal) {
            const sourceAssetId = customer.currency === Currency.USD ? options?.usdSourceAsset : options?.lydCashAssetId;
            if (options?.bankId) {
                 setBanks(prev => prev.map(b => b.id === options.bankId ? { ...b, balance: b.balance - amount } : b));
                 addTransaction({
                    type: TransactionType.NewDebt,
                    amount: -amount,
                    currency: customer.currency,
                    description: `دين جديد لـ ${customer.name} (خصم من مصرف ${banks.find(b=>b.id === options.bankId)?.name})`,
                    relatedParty: customer.name,
                    assetId: options.bankId,
                    groupId: options?.groupId,
                    metadata: { groupId: options?.groupId, groupType: 'NEW_DEBT', groupDescription: `دين جديد لـ ${customer.name}`, customerId, debtId: newDebt.id, amount }
                });
            } else if (sourceAssetId) {
                setAssets(prev => ({
                    ...prev,
                    [sourceAssetId]: (Number.isFinite(prev[sourceAssetId]) ? prev[sourceAssetId] : 0) - amount
                }));
                 addTransaction({
                    type: TransactionType.NewDebt,
                    amount: -amount,
                    currency: customer.currency,
                    description: `دين جديد لـ ${customer.name} (خصم من ${ASSET_NAMES[sourceAssetId]})`,
                    relatedParty: customer.name,
                    assetId: sourceAssetId,
                    groupId: options?.groupId,
                    metadata: { groupId: options?.groupId, groupType: 'NEW_DEBT', groupDescription: `دين جديد لـ ${customer.name}`, customerId, debtId: newDebt.id, amount }
                });
            }
        } else {
             addTransaction({
                type: TransactionType.NewDebt,
                amount: amount,
                currency: customer.currency,
                description: `دين خارجي: ${options?.reason || 'بدون سبب'}`,
                relatedParty: customer.name,
                assetId: 'trade_debt', 
                groupId: options?.groupId,
                metadata: { groupId: options?.groupId, groupType: 'NEW_DEBT', groupDescription: `دين خارجي لـ ${customer.name}`, customerId, debtId: newDebt.id, amount }
            });
        }
        return finalDebtId;
    };
    
    // ... (payDebt, addReceivable, payReceivable etc. - Keep unchanged)
    const payDebt = (customerId: string, debtId: string, amount: number, destination: { 
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
    }) => {
        const customer = customers.find(c => c.id === customerId);
        const debt = customer?.debts.find(d => d.id === debtId);

        if (!customer || !debt) {
            console.error("Customer or debt not found for payment.");
            return;
        }

        const remainingDebt = debt.amount - debt.paid;
        const paymentForDebt = Math.min(amount, remainingDebt);
        const surplusAmount = amount - paymentForDebt;

        if (surplusAmount > 0 && options?.surplusHandling) {
            const groupId = crypto.randomUUID();
            const groupDescription = `تحصيل دين من ${customer.name} مع فائض`;

            if (paymentForDebt > 0) {
                setCustomers(prev => prev.map(c => c.id === customerId ? {
                    ...c,
                    debts: c.debts.map(d => d.id === debtId ? { ...d, paid: d.paid + paymentForDebt } : d)
                } : c));
            }
            
            if (destination.type === 'bank' && destination.bankId) {
                setBanks(prev => prev.map(b => b.id === destination.bankId ? { ...b, balance: b.balance + amount } : b));
            } else if (destination.type !== 'settlement' && destination.type !== 'external_settlement') {
                setAssets(prev => ({ ...prev, [destination.assetId as AssetId]: (Number.isFinite(prev[destination.assetId as AssetId]) ? prev[destination.assetId as AssetId] : 0) + amount }));
            }

            if (paymentForDebt > 0) {
                 addTransaction({
                    type: TransactionType.DebtCollection,
                    amount: paymentForDebt,
                    currency: customer.currency,
                    description: `تحصيل جزء من دين من ${customer.name}`,
                    relatedParty: customer.name,
                    assetId: destination.assetId,
                    groupId,
                    metadata: { groupId, groupType: 'DEBT_PAYMENT', groupDescription, customerId, debtId, amount: paymentForDebt }
                });
            }

            const { type, receivableCustomerId, newReceivableCustomerName } = options.surplusHandling;
            const surplusMetadata: Record<string, any> = { groupId, groupType: 'DEBT_SURPLUS', groupDescription, customerId, amount: surplusAmount };

            let destinationName = '';
            if (destination.type === 'bank' && destination.bankId) {
                destinationName = banks.find(b => b.id === destination.bankId)?.name || 'مصرف';
            } else if (destination.type !== 'settlement' && destination.type !== 'external_settlement') {
                destinationName = ASSET_NAMES[destination.assetId as AssetId] || 'خزنة';
            }
            
            switch (type) {
                case 'deposit':
                    addTransaction({
                        type: TransactionType.Deposit,
                        amount: surplusAmount,
                        currency: customer.currency,
                        description: `فائض من دفعة دين ${customer.name} إلى ${destinationName}`,
                        relatedParty: customer.name,
                        assetId: destination.assetId,
                        groupId,
                        metadata: { ...surplusMetadata, isSurplus: true }
                    });
                    break;
                case 'profit':
                    addTransaction({
                        type: TransactionType.Deposit,
                        amount: surplusAmount,
                        currency: customer.currency,
                        description: `ربح (فائض) من دفعة دين ${customer.name} إلى ${destinationName}`,
                        relatedParty: customer.name,
                        assetId: destination.assetId,
                        groupId,
                        metadata: { ...surplusMetadata, isSurplus: true, isProfit: true }
                    });
                    break;
                case 'receivable':
                    let partyName: string | undefined = newReceivableCustomerName;
                    if (!partyName && receivableCustomerId) {
                        partyName = customers.find(c => c.id === receivableCustomerId)?.name;
                    }

                    if (!partyName) {
                        console.error('Customer for surplus receivable not found.');
                        return;
                    }
                    
                    const newReceivableId = addReceivable(partyName, surplusAmount, customer.currency, undefined, { groupId }); 
                    
                    addTransaction({
                        type: TransactionType.Deposit,
                        amount: surplusAmount,
                        currency: customer.currency,
                        description: `فائض من دفعة دين ${customer.name}، سجل كمستحق على ${partyName}`,
                        relatedParty: customer.name,
                        assetId: destination.assetId,
                        groupId,
                        metadata: { 
                            ...surplusMetadata, 
                            groupType: 'NEW_RECEIVABLE',
                            isSurplus: true, 
                            isReceivable: true, 
                            receivableParty: partyName,
                            createdReceivableId: newReceivableId 
                        }
                    });
                    break;
            }
            return;
        }

        let originalCustomer: Customer | undefined;
        let originalDebt: Debt | undefined;

        setCustomers(prev => prev.map(c => {
            if (c.id === customerId) {
                originalCustomer = c;
                return {
                    ...c,
                    debts: c.debts.map(d => {
                        if (d.id === debtId) {
                            originalDebt = d;
                            return { ...d, paid: d.paid + amount };
                        }
                        return d;
                    })
                };
            }
            return c;
        }));

        if (!originalCustomer || !originalDebt) return;

        const groupId = crypto.randomUUID();
        const groupDescription = `تحصيل دين من ${originalCustomer.name}`;
        const metadata: Record<string, any> = { 
            groupId, 
            groupType: 'DEBT_PAYMENT', 
            groupDescription, 
            customerId, 
            debtId, 
            amount,
            isProfit: options?.isProfit
        };

        if (destination.type === 'settlement' && destination.receivableId) {
            const receivable = receivables.find(r => r.id === destination.receivableId);
            if (!receivable) { console.error("Receivable not found for settlement"); return; }

            const remainingReceivable = receivable.amount - receivable.paid;
            const settledAmount = Math.min(amount, remainingReceivable);
            const surplus = amount - settledAmount;

            metadata.isSettlement = true;
            metadata.receivableId = destination.receivableId;
            metadata.settledAmount = settledAmount;

            if (settledAmount > 0) {
                setReceivables(prev => prev.map(r => r.id === destination.receivableId ? { ...r, paid: r.paid + settledAmount } : r));
                addTransaction({ type: TransactionType.Settlement, amount: settledAmount, currency: originalCustomer.currency, description: `تسوية دين مع مستحق لـ ${receivable.debtor}`, relatedParty: originalCustomer.name, assetId: 'settlement', groupId, metadata });
            }
            
            if (surplus > 0) {
                if (!destination.surplusDestination) {
                    console.error("Surplus exists but no destination specified for debt payment settlement.");
                    return;
                }
                const surplusDest = destination.surplusDestination;
                metadata.surplus = surplus;
                metadata.surplusDestination = surplusDest;

                if (surplusDest.type === 'bank') {
                    setBanks(prev => prev.map(b => b.id === surplusDest.assetId ? { ...b, balance: b.balance + surplus } : b));
                    addTransaction({ type: TransactionType.DebtCollection, amount: surplus, currency: originalCustomer.currency, description: `فائض تسوية دين من ${originalCustomer.name} في ${banks.find(b=>b.id === surplusDest.assetId)?.name}`, relatedParty: originalCustomer.name, assetId: surplusDest.assetId, groupId, metadata });
                } else { // cash
                    setAssets(prev => ({ ...prev, [surplusDest.assetId as AssetId]: (Number.isFinite(prev[surplusDest.assetId as AssetId]) ? prev[surplusDest.assetId as AssetId] : 0) + surplus }));
                    addTransaction({ type: TransactionType.DebtCollection, amount: surplus, currency: originalCustomer.currency, description: `فائض تسوية دين من ${originalCustomer.name} في ${ASSET_NAMES[surplusDest.assetId as AssetId]}`, relatedParty: originalCustomer.name, assetId: surplusDest.assetId, groupId, metadata });
                }
            }
        } else if (destination.type === 'external_settlement') {
             addTransaction({ type: TransactionType.Settlement, amount, currency: originalCustomer.currency, description: `تسوية دين خارج الخزنة`, relatedParty: originalCustomer.name, assetId: 'external_settlement', groupId, metadata });
        } else if (destination.type === 'bank' && destination.bankId) {
            setBanks(prev => prev.map(b => b.id === destination.bankId ? { ...b, balance: b.balance + amount } : b));
            addTransaction({ type: TransactionType.DebtCollection, amount, currency: originalCustomer.currency, description: `تحصيل دين من ${originalCustomer.name} في ${banks.find(b=>b.id === destination.bankId)?.name}`, relatedParty: originalCustomer.name, assetId: destination.bankId, groupId, metadata });
        } else { // cash
            setAssets(prev => ({ ...prev, [destination.assetId as AssetId]: (Number.isFinite(prev[destination.assetId as AssetId]) ? prev[destination.assetId as AssetId] : 0) + amount }));
            addTransaction({ type: TransactionType.DebtCollection, amount, currency: originalCustomer.currency, description: `تحصيل دين من ${originalCustomer.name} في ${ASSET_NAMES[destination.assetId as AssetId]}`, relatedParty: originalCustomer.name, assetId: destination.assetId, groupId, metadata });
        }
    };

    const addReceivable = (debtor: string, amount: number, currency: Currency, destination?: { type: 'cashLyd' | 'bank' | 'cashUsd'; assetId: string; bankId?: string; }, options?: { groupId?: string }): string => {
        const newReceivable: Receivable = {
            id: crypto.randomUUID(),
            debtor,
            amount,
            paid: 0,
            currency,
            date: getLocalISOString(),
            isArchived: false,
        };
        
        setReceivables(prev => {
            const receivablesWithNew = [newReceivable, ...prev];
            
            // Inline merge logic for atomicity
            const receivablesForDebtor = receivablesWithNew.filter(r => r.debtor === debtor && r.currency === currency);
            const unpaidReceivables = receivablesForDebtor.filter(r => !r.isArchived && (r.amount - r.paid) > 0);
    
            if (unpaidReceivables.length <= 1) {
                return receivablesWithNew;
            }
    
            const totalUnpaidAmount = unpaidReceivables.reduce((sum, r) => sum + (r.amount - r.paid), 0);
            const unpaidIds = unpaidReceivables.map(r => r.id);
            const mergedReceivable: Receivable = { id: crypto.randomUUID(), debtor, amount: totalUnpaidAmount, paid: 0, currency, date: getLocalISOString(), isArchived: false, metadata: { mergedFrom: unpaidIds } };
            const unpaidIdsSet = new Set(unpaidIds);
            const finalReceivables = receivablesWithNew.map(r => unpaidIdsSet.has(r.id) ? { ...r, isArchived: true } : r);
    
            return [...finalReceivables, mergedReceivable];
        });
        
        const groupId = options?.groupId || crypto.randomUUID();
        const groupDescription = `تسجيل مستحق جديد لـ ${debtor}`;
        const metadata = { groupId, groupType: 'NEW_RECEIVABLE', groupDescription, receivableId: newReceivable.id, amount };

        if (destination) { // Depositing into treasury
            let destinationName = '';
            const description = `استلام مبلغ وتسجيله كمستحق على ${debtor}`;
            if (destination.type === 'bank' && destination.bankId) {
                const bank = banks.find(b => b.id === destination.bankId);
                if (!bank) return newReceivable.id;
                destinationName = bank.name;
                setBanks(prev => prev.map(b => b.id === destination.bankId ? { ...b, balance: b.balance + amount } : b));
                addTransaction({ type: TransactionType.NewReceivable, amount, currency, description: `${description} في ${destinationName}`, relatedParty: debtor, assetId: destination.bankId, groupId, metadata });
            } else { // cash
                destinationName = ASSET_NAMES[destination.assetId as AssetId];
                setAssets(prev => ({ ...prev, [destination.assetId as AssetId]: (Number.isFinite(prev[destination.assetId as AssetId]) ? prev[destination.assetId as AssetId] : 0) + amount }));
                addTransaction({ type: TransactionType.NewReceivable, amount, currency, description: `${description} في ${destinationName}`, relatedParty: debtor, assetId: destination.assetId, groupId, metadata });
            }
        } else { // Outside treasury
            addTransaction({ type: TransactionType.NewReceivable, amount, currency, description: `تسجيل مستحق (خارج الخزنة) لـ ${debtor}`, relatedParty: debtor, assetId: 'external_receivable', groupId, metadata });
        }
        return newReceivable.id;
    };

    const payReceivable = (id: string, amount: number, source: { type: 'cashLyd' | 'bank' | 'cashUsd' | 'external'; assetId: string; bankId?: string; }) => {
        let receivable: Receivable | undefined;
        setReceivables(prev => prev.map(r => {
            if (r.id === id) {
                receivable = r;
                return { ...r, paid: r.paid + amount };
            }
            return r;
        }));

        if (!receivable) return;
        
        const groupId = crypto.randomUUID();
        const groupDescription = `دفع مستحق لـ ${receivable.debtor}`;
        const metadata = { groupId, groupType: 'RECEIVABLE_PAYMENT', groupDescription, receivableId: id, amount };

        if (source.type === 'external') {
            addTransaction({ type: TransactionType.ReceivablePayment, amount: -amount, currency: receivable.currency, description: `دفع مستحق (خارج الخزنة) لـ ${receivable.debtor}`, relatedParty: receivable.debtor, assetId: 'external_payment', groupId, metadata });
        } else if (source.type === 'bank' && source.bankId) {
            setBanks(prev => prev.map(b => b.id === source.bankId ? { ...b, balance: b.balance - amount } : b));
            addTransaction({ type: TransactionType.ReceivablePayment, amount: -amount, currency: receivable.currency, description: `دفع مستحق لـ ${receivable.debtor} من ${banks.find(b => b.id === source.bankId)?.name}`, relatedParty: receivable.debtor, assetId: source.bankId, groupId, metadata });
        } else { // cash
            setAssets(prev => ({ ...prev, [source.assetId as AssetId]: (Number.isFinite(prev[source.assetId as AssetId]) ? prev[source.assetId as AssetId] : 0) - amount }));
            addTransaction({ type: TransactionType.ReceivablePayment, amount: -amount, currency: receivable.currency, description: `دفع مستحق لـ ${receivable.debtor} من ${ASSET_NAMES[source.assetId as AssetId]}`, relatedParty: receivable.debtor, assetId: source.assetId, groupId, metadata });
        }
    };

    const archiveReceivable = (id: string) => setReceivables(prev => prev.map(r => r.id === id ? { ...r, isArchived: true } : r));
    const restoreReceivable = (id: string) => setReceivables(prev => prev.map(r => r.id === id ? { ...r, isArchived: false } : r));
    const deleteArchivedReceivable = (receivableId: string) => setReceivables(prev => prev.filter(r => r.id !== receivableId));
    const archiveDebtor = (debtorName: string, currency: Currency) => setReceivables(prev => prev.map(r => (r.debtor === debtorName && r.currency === currency) ? { ...r, isArchived: true } : r));
    const restoreDebtor = (debtorName: string, currency: Currency) => setReceivables(prev => prev.map(r => (r.debtor === debtorName && r.currency === currency) ? { ...r, isArchived: false } : r));
    
    const getTotalDebts = (currency: Currency): number => {
        return customers
            .filter(c => c.currency === currency && !c.isArchived)
            .reduce((total, customer) => {
                const customerUnpaidDebt = customer.debts
                    .filter(d => !d.isArchived)
                    .reduce((sum, debt) => {
                        const remaining = debt.amount - debt.paid;
                        return sum + (remaining > 0 ? remaining : 0);
                    }, 0);
                return total + customerUnpaidDebt;
            }, 0);
    };

    const getTotalReceivables = (currency: Currency): number => {
        return receivables
            .filter(r => r.currency === currency && !r.isArchived)
            .reduce((total, receivable) => {
                const remaining = receivable.amount - receivable.paid;
                return total + (remaining > 0 ? remaining : 0);
            }, 0);
    };

    // ... (buyUsd, sellUsd, etc. - Keep unchanged)
    const buyUsd = (usdAmount: number, rate: number, lydSource: 'cashLyd' | 'bank', usdDestination: 'cashUsdLibya' | 'cashUsdTurkey', options: { bankId?: string; isDebt?: boolean; customerId?: string; isReceivable?: boolean; receivablePartyOption?: { value: string; label: string; __isNew__?: boolean } | null; lydCashAssetId?: AssetId; note?: string; originalRate?: number; totalLydAmount?: number; isDebtSettlement?: boolean; settlementDebtCustomerId?: string; newSettlementDebtCustomerName?: string; }) => {
        const lydAmount = options.totalLydAmount ?? (usdAmount * rate);
        const groupId = crypto.randomUUID();
        const metadata: Record<string, any> = { groupId, groupType: 'BUY_USD', usdAmount, rate, lydAmount, lydSource, usdDestination, ...options };
        const displayRate = options.originalRate || rate;
        
        setAssets(prev => ({ ...prev, [usdDestination]: (Number.isFinite(prev[usdDestination]) ? prev[usdDestination] : 0) + usdAmount }));
    
        let settlementCustomerIdResolved = options.settlementDebtCustomerId;
        if (options.newSettlementDebtCustomerName) {
            settlementCustomerIdResolved = addCustomer(options.newSettlementDebtCustomerName, Currency.LYD);
            metadata.settlementDebtCustomerId = settlementCustomerIdResolved;
        }

        if (options.isDebtSettlement && settlementCustomerIdResolved) {
            const customer = customers.find(c => c.id === settlementCustomerIdResolved);
            if (!customer) { console.error("Customer for debt settlement not found"); return; }
            
            const totalUnpaidDebt = customer.debts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
            const settledAmount = Math.min(lydAmount, totalUnpaidDebt);
            const remainingLydCost = lydAmount - settledAmount;
            const baseDescription = `شراء ${usdAmount}$ مقابل تسوية دين لـ ${customer.name}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
    
            if (settledAmount > 0) {
                let amountLeftToSettle = settledAmount;
                const updatedDebtsForCustomer = customer.debts.map(debt => {
                    if (amountLeftToSettle <= 0) return debt;
                    const unpaid = debt.amount - debt.paid;
                    if (unpaid > 0) {
                        const paymentForThisDebt = Math.min(amountLeftToSettle, unpaid);
                        amountLeftToSettle -= paymentForThisDebt;
                        return { ...debt, paid: debt.paid + paymentForThisDebt };
                    }
                    return debt;
                });
    
                setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, debts: updatedDebtsForCustomer } : c));
                
                addTransaction({ type: TransactionType.Settlement, amount: settledAmount, currency: Currency.LYD, description: `تسوية دين مقابل شراء دولار - ${options.note || ''}`, relatedParty: customer.name, assetId: 'settlement', groupId, metadata: { ...metadata, groupDescription } });
            }
    
            if (remainingLydCost > 0) {
                if (lydSource === 'bank' && options.bankId) {
                    setBanks(prev => prev.map(b => b.id === options.bankId ? { ...b, balance: b.balance - remainingLydCost } : b));
                    addTransaction({ type: TransactionType.Withdrawal, amount: -remainingLydCost, currency: Currency.LYD, description: `باقي قيمة شراء دولار من ${banks.find(b => b.id === options.bankId)?.name} - ${options.note || ''}`, relatedParty: customer.name, assetId: options.bankId, groupId, metadata: { ...metadata, groupDescription } });
                } else if (options.lydCashAssetId) {
                    setAssets(prev => ({ ...prev, [options.lydCashAssetId!]: (Number.isFinite(prev[options.lydCashAssetId!]) ? prev[options.lydCashAssetId!] : 0) - remainingLydCost }));
                    addTransaction({ type: TransactionType.Withdrawal, amount: -remainingLydCost, currency: Currency.LYD, description: `باقي قيمة شراء دولار من ${ASSET_NAMES[options.lydCashAssetId]} - ${options.note || ''}`, relatedParty: customer.name, assetId: options.lydCashAssetId, groupId, metadata: { ...metadata, groupDescription } });
                }
            }
            
            addTransaction({ type: TransactionType.Deposit, amount: usdAmount, currency: Currency.USD, description: groupDescription, relatedParty: customer.name, assetId: usdDestination, groupId, metadata: { ...metadata, groupDescription } });
        
        } else if (options.isReceivable && options.receivablePartyOption) {
            const receivablePartyName = options.receivablePartyOption.label;
            const newReceivableId = addReceivable(receivablePartyName, lydAmount, Currency.LYD, undefined, { groupId });

            const baseDescription = `شراء ${usdAmount}$ مقابل مستحق لـ ${receivablePartyName}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
            
            metadata.createdReceivableId = newReceivableId;
            metadata.groupDescription = groupDescription;

            addTransaction({ type: TransactionType.Deposit, amount: usdAmount, currency: Currency.USD, description: groupDescription, relatedParty: receivablePartyName, assetId: usdDestination, groupId, metadata });
            addTransaction({ type: TransactionType.NewReceivable, amount: lydAmount, currency: Currency.LYD, description: `تسجيل مستحق لشراء دولار - ${options.note || ''}`, relatedParty: receivablePartyName, assetId: 'trade_liability', groupId, metadata });
            
        } else {
            const baseDescription = `شراء ${usdAmount}$ بسعر ${displayRate}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;

            if (lydSource === 'bank' && options.bankId) {
                setBanks(prev => prev.map(b => b.id === options.bankId ? { ...b, balance: b.balance - lydAmount } : b));
                addTransaction({ type: TransactionType.Withdrawal, amount: -lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: options.bankId, groupId, metadata: { ...metadata, groupDescription } });
            } else if (options.lydCashAssetId) {
                setAssets(prev => ({ ...prev, [options.lydCashAssetId!]: (Number.isFinite(prev[options.lydCashAssetId!]) ? prev[options.lydCashAssetId!] : 0) - lydAmount }));
                addTransaction({ type: TransactionType.Withdrawal, amount: -lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: options.lydCashAssetId, groupId, metadata: { ...metadata, groupDescription } });
            }
            addTransaction({ type: TransactionType.Deposit, amount: usdAmount, currency: Currency.USD, description: groupDescription, relatedParty: 'صراف', assetId: usdDestination, groupId, metadata: { ...metadata, groupDescription } });
        }
    };
    
    const sellUsd = (usdAmount: number, rate: number, usdSource: 'cashUsdLibya' | 'cashUsdTurkey', lydDestination: 'cashLyd' | 'bank', options: { bankId?: string; isDebt?: boolean; customerId?: string; newCustomerName?: string; isReceivableSettlement?: boolean; receivableId?: string; lydCashAssetId?: AssetId; note?: string; originalRate?: number; totalLydAmount?: number; excessHandling?: { type: 'deposit' | 'debt'; customerId?: string; newCustomerName?: string; }; }) => {
        const lydAmount = options.totalLydAmount ?? (usdAmount * rate);
        const groupId = crypto.randomUUID();
        let metadata: Record<string, any> = { groupId, groupType: 'SELL_USD', usdAmount, rate, lydAmount, usdSource, lydDestination, ...options };
        const displayRate = options.originalRate || rate;

        setAssets(prev => ({ ...prev, [usdSource]: (Number.isFinite(prev[usdSource]) ? prev[usdSource] : 0) - usdAmount }));

        if (options.isDebt) {
            const customerNameForTx = options.newCustomerName || customers.find(c => c.id === options.customerId)?.name || '';
            if (!customerNameForTx) { 
                console.error("Customer could not be determined for debt creation."); 
                setAssets(prev => ({ ...prev, [usdSource]: (Number.isFinite(prev[usdSource]) ? prev[usdSource] : 0) + usdAmount }));
                return; 
            }
            
            let targetCustomerId: string | undefined = options.customerId;
            if (options.newCustomerName) {
                targetCustomerId = addCustomer(options.newCustomerName, Currency.LYD);
            }
            if (!targetCustomerId) return;

            const createdDebtId = addDebt(targetCustomerId, lydAmount, { groupId });

            const baseDescription = `بيع ${usdAmount.toLocaleString()}$ كدين على ${customerNameForTx}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
            
            metadata.createdDebtId = createdDebtId;
            metadata.debtCustomerId = targetCustomerId;
            metadata.groupDescription = groupDescription;

            addTransaction({ type: TransactionType.NewDebt, amount: lydAmount, currency: Currency.LYD, description: `دين مقابل بيع دولار - ${options.note || ''}`, relatedParty: customerNameForTx, assetId: 'trade_debt', groupId, metadata });
            addTransaction({ type: TransactionType.Withdrawal, amount: -usdAmount, currency: Currency.USD, description: groupDescription, relatedParty: customerNameForTx, assetId: usdSource, groupId, metadata });

        } else if (options.isReceivableSettlement && options.receivableId) {
            const receivable = receivables.find(r => r.id === options.receivableId);
            if (!receivable) { 
                console.error("Receivable not found"); 
                setAssets(prev => ({ ...prev, [usdSource]: (Number.isFinite(prev[usdSource]) ? prev[usdSource] : 0) + usdAmount }));
                return; 
            }
            
            const remainingReceivable = receivable.amount - receivable.paid;
            const amountToSettle = Math.min(lydAmount, remainingReceivable);
            const excessLyd = lydAmount - amountToSettle;
            const baseDescription = `بيع ${usdAmount.toLocaleString()}$ مقابل تسوية مستحق لـ ${receivable.debtor}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
            
            let excessDebtId: string | undefined;
            let excessDebtCustomerId: string | undefined;

            if (excessLyd > 0 && options.excessHandling?.type === 'debt') {
                let targetCustomerId: string | undefined = options.excessHandling.customerId;
                if (options.excessHandling.newCustomerName) {
                    targetCustomerId = addCustomer(options.excessHandling.newCustomerName, Currency.LYD);
                }
                if (targetCustomerId) {
                    excessDebtId = crypto.randomUUID();
                    excessDebtCustomerId = targetCustomerId;
                    metadata.excessDebtId = excessDebtId;
                    metadata.excessDebtCustomerId = excessDebtCustomerId;
                }
            }
            
            addTransaction({ type: TransactionType.Withdrawal, amount: -usdAmount, currency: Currency.USD, description: groupDescription, relatedParty: receivable.debtor, assetId: usdSource, groupId, metadata: { ...metadata, groupDescription } });

            if (amountToSettle > 0) {
                setReceivables(prev => prev.map(r => r.id === options.receivableId ? { ...r, paid: r.paid + amountToSettle } : r));
                addTransaction({ type: TransactionType.Settlement, amount: amountToSettle, currency: Currency.LYD, description: `تسوية مستحق من بيع دولار - ${options.note || ''}`, relatedParty: receivable.debtor, assetId: 'settlement', groupId, metadata: { ...metadata, groupDescription, settledAmount: amountToSettle } });
            }
            
            if (excessLyd > 0) {
                const excessDesc = `باقي قيمة بيع دولار بعد تسوية مستحق`;
                if (options.excessHandling?.type === 'debt' && excessDebtId && excessDebtCustomerId) {
                    const excessCustomerName = options.excessHandling.newCustomerName || customers.find(c => c.id === excessDebtCustomerId)?.name || '';
                    const excessDebt: Debt = { id: excessDebtId, amount: excessLyd, paid: 0, date: getLocalISOString() };
                    setCustomers(prev => prev.map(c => c.id === excessDebtCustomerId ? { ...c, debts: [...c.debts, excessDebt] } : c));
                    addTransaction({ type: TransactionType.NewDebt, amount: excessLyd, currency: Currency.LYD, description: excessDesc, relatedParty: excessCustomerName, assetId: 'trade_debt', groupId, metadata });
                    mergeCustomerDebts(excessDebtCustomerId);
                } else { // Default to deposit
                    if (lydDestination === 'bank' && options.bankId) {
                        setBanks(prev => prev.map(b => b.id === options.bankId ? { ...b, balance: b.balance + excessLyd } : b));
                        addTransaction({ type: TransactionType.Deposit, amount: excessLyd, currency: Currency.LYD, description: excessDesc, relatedParty: receivable.debtor, assetId: options.bankId, groupId, metadata: { ...metadata, groupDescription } });
                    } else if (options.lydCashAssetId) {
                        setAssets(prev => ({ ...prev, [options.lydCashAssetId!]: (Number.isFinite(prev[options.lydCashAssetId!]) ? prev[options.lydCashAssetId!] : 0) + excessLyd }));
                        addTransaction({ type: TransactionType.Deposit, amount: excessLyd, currency: Currency.LYD, description: excessDesc, relatedParty: receivable.debtor, assetId: options.lydCashAssetId, groupId, metadata: { ...metadata, groupDescription } });
                    }
                }
            }
        } else {
            const baseDescription = `بيع ${usdAmount.toLocaleString()}$ بسعر ${displayRate}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;

            if (lydDestination === 'bank' && options.bankId) {
                setBanks(prev => prev.map(b => b.id === options.bankId ? { ...b, balance: b.balance + lydAmount } : b));
                addTransaction({ type: TransactionType.Deposit, amount: lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: options.bankId, groupId, metadata: { ...metadata, groupDescription } });
            } else if (options.lydCashAssetId) {
                setAssets(prev => ({ ...prev, [options.lydCashAssetId!]: (Number.isFinite(prev[options.lydCashAssetId!]) ? prev[options.lydCashAssetId!] : 0) + lydAmount }));
                addTransaction({ type: TransactionType.Deposit, amount: lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: options.lydCashAssetId, groupId, metadata: { ...metadata, groupDescription } });
            }
            addTransaction({ type: TransactionType.Withdrawal, amount: -usdAmount, currency: Currency.USD, description: groupDescription, relatedParty: 'صراف', assetId: usdSource, groupId, metadata: { ...metadata, groupDescription } });
        }
    };

    // ... (buyForeignCurrency, sellForeignCurrency, adjustAssetBalance, etc. - Keep unchanged)
    const buyForeignCurrency = (foreignAmount: number, rate: number, foreignCurrency: Currency, foreignAssetId: AssetId, lydSource: { type: 'cashLyd' | 'bank', bankId?: string, lydCashAssetId?: AssetId }, options: { isReceivable?: boolean; receivablePartyOption?: { value: string; label: string; __isNew__?: boolean } | null; note?: string; originalRate?: number; totalLydAmount?: number; isDebtSettlement?: boolean; settlementDebtCustomerId?: string; newSettlementDebtCustomerName?: string; }) => {
        const lydAmount = options.totalLydAmount ?? (foreignAmount * rate);
        const groupId = crypto.randomUUID();
        const metadata: Record<string, any> = { groupId, groupType: 'BUY_OTHER', foreignAmount, rate, lydAmount, foreignCurrency, foreignAssetId, lydSource, ...options };
        const displayRate = options.originalRate || rate;
    
        setAssets(prev => ({ ...prev, [foreignAssetId]: (Number.isFinite(prev[foreignAssetId]) ? prev[foreignAssetId] : 0) + foreignAmount }));
    
        let settlementCustomerIdResolved = options.settlementDebtCustomerId;
        if(options.newSettlementDebtCustomerName) {
            settlementCustomerIdResolved = addCustomer(options.newSettlementDebtCustomerName, Currency.LYD);
            metadata.settlementDebtCustomerId = settlementCustomerIdResolved;
        }

        if (options.isDebtSettlement && settlementCustomerIdResolved) {
            const customer = customers.find(c => c.id === settlementCustomerIdResolved);
            if (!customer) { console.error("Customer for debt settlement not found"); return; }
            
            const totalUnpaidDebt = customer.debts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
            const settledAmount = Math.min(lydAmount, totalUnpaidDebt);
            const remainingLydCost = lydAmount - settledAmount;
            const baseDescription = `شراء ${foreignAmount.toLocaleString()} ${foreignCurrency} مقابل تسوية دين لـ ${customer.name}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
    
            if (settledAmount > 0) {
                let amountLeftToSettle = settledAmount;
                const updatedDebtsForCustomer = customer.debts.map(debt => {
                    if (amountLeftToSettle <= 0) return debt;
                    const unpaid = debt.amount - debt.paid;
                    if (unpaid > 0) {
                        const paymentForThisDebt = Math.min(amountLeftToSettle, unpaid);
                        amountLeftToSettle -= paymentForThisDebt;
                        return { ...debt, paid: debt.paid + paymentForThisDebt };
                    }
                    return debt;
                });
    
                setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, debts: updatedDebtsForCustomer } : c));
                
                addTransaction({ type: TransactionType.Settlement, amount: settledAmount, currency: Currency.LYD, description: `تسوية دين مقابل شراء ${foreignCurrency} - ${options.note || ''}`, relatedParty: customer.name, assetId: 'settlement', groupId, metadata: { ...metadata, groupDescription } });
            }
    
            if (remainingLydCost > 0) {
                if (lydSource.type === 'bank' && lydSource.bankId) {
                    setBanks(prev => prev.map(b => b.id === lydSource.bankId ? { ...b, balance: b.balance - remainingLydCost } : b));
                    addTransaction({ type: TransactionType.Withdrawal, amount: -remainingLydCost, currency: Currency.LYD, description: `باقي قيمة شراء ${foreignCurrency} من ${banks.find(b => b.id === lydSource.bankId)?.name} - ${options.note || ''}`, relatedParty: customer.name, assetId: lydSource.bankId, groupId, metadata: { ...metadata, groupDescription } });
                } else if (lydSource.type === 'cashLyd' && lydSource.lydCashAssetId) {
                    setAssets(prev => ({ ...prev, [lydSource.lydCashAssetId!]: (Number.isFinite(prev[lydSource.lydCashAssetId!]) ? prev[lydSource.lydCashAssetId!] : 0) - remainingLydCost }));
                    addTransaction({ type: TransactionType.Withdrawal, amount: -remainingLydCost, currency: Currency.LYD, description: `باقي قيمة شراء ${foreignCurrency} من ${ASSET_NAMES[lydSource.lydCashAssetId]} - ${options.note || ''}`, relatedParty: customer.name, assetId: lydSource.lydCashAssetId, groupId, metadata: { ...metadata, groupDescription } });
                }
            }
            
            addTransaction({ type: TransactionType.Deposit, amount: foreignAmount, currency: foreignCurrency, description: groupDescription, relatedParty: customer.name, assetId: foreignAssetId, groupId, metadata: { ...metadata, groupDescription } });
        
        } else if (options.isReceivable && options.receivablePartyOption) {
            const receivablePartyName = options.receivablePartyOption.label;
            const newReceivableId = addReceivable(receivablePartyName, lydAmount, Currency.LYD, undefined, { groupId });

            const baseDescription = `شراء ${foreignAmount.toLocaleString()} ${foreignCurrency} مقابل مستحق لـ ${receivablePartyName}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
            metadata.createdReceivableId = newReceivableId;
            metadata.groupDescription = groupDescription;

            addTransaction({ type: TransactionType.Deposit, amount: foreignAmount, currency: foreignCurrency, description: groupDescription, relatedParty: receivablePartyName, assetId: foreignAssetId, groupId, metadata });
            addTransaction({ type: TransactionType.NewReceivable, amount: lydAmount, currency: Currency.LYD, description: `تسجيل مستحق لشراء ${foreignCurrency} - ${options.note || ''}`, relatedParty: receivablePartyName, assetId: 'trade_liability', groupId, metadata });
            
        } else {
            const baseDescription = `شراء ${foreignAmount.toLocaleString()} ${foreignCurrency} بسعر ${displayRate}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;

            if (lydSource.type === 'bank' && lydSource.bankId) {
                setBanks(prev => prev.map(b => b.id === lydSource.bankId ? { ...b, balance: b.balance - lydAmount } : b));
                addTransaction({ type: TransactionType.Withdrawal, amount: -lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: lydSource.bankId, groupId, metadata: { ...metadata, groupDescription } });
            } else if (lydSource.type === 'cashLyd' && lydSource.lydCashAssetId) {
                setAssets(prev => ({ ...prev, [lydSource.lydCashAssetId!]: (Number.isFinite(prev[lydSource.lydCashAssetId!]) ? prev[lydSource.lydCashAssetId!] : 0) - lydAmount }));
                addTransaction({ type: TransactionType.Withdrawal, amount: -lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: lydSource.lydCashAssetId, groupId, metadata: { ...metadata, groupDescription } });
            }
            addTransaction({ type: TransactionType.Deposit, amount: foreignAmount, currency: foreignCurrency, description: groupDescription, relatedParty: 'صراف', assetId: foreignAssetId, groupId, metadata: { ...metadata, groupDescription } });
        }
    };
    const sellForeignCurrency = (foreignAmount: number, rate: number, foreignCurrency: Currency, foreignAssetId: AssetId, lydDestination: { type: 'cashLyd' | 'bank', bankId?: string, lydCashAssetId?: AssetId }, options: { isDebt?: boolean; customerId?: string; newCustomerName?: string; isReceivableSettlement?: boolean; receivableId?: string; note?: string; originalRate?: number; totalLydAmount?: number; excessHandling?: { type: 'deposit' | 'debt'; customerId?: string; newCustomerName?: string; }; }) => {
        const lydAmount = options.totalLydAmount ?? (foreignAmount * rate);
        const groupId = crypto.randomUUID();
        let metadata: Record<string, any> = { groupId, groupType: 'SELL_OTHER', foreignAmount, rate, lydAmount, foreignCurrency, foreignAssetId, lydDestination, ...options };
        const displayRate = options.originalRate || rate;
    
        setAssets(prev => ({ ...prev, [foreignAssetId]: (Number.isFinite(prev[foreignAssetId]) ? prev[foreignAssetId] : 0) - foreignAmount }));
    
        if (options.isDebt) {
            const customerNameForTx = options.newCustomerName || customers.find(c => c.id === options.customerId)?.name || '';
             if (!customerNameForTx) { 
                console.error("Customer could not be determined for debt creation."); 
                setAssets(prev => ({ ...prev, [foreignAssetId]: (Number.isFinite(prev[foreignAssetId]) ? prev[foreignAssetId] : 0) + foreignAmount }));
                return; 
            }
            
            let targetCustomerId: string | undefined = options.customerId;
            if (options.newCustomerName) {
                targetCustomerId = addCustomer(options.newCustomerName, Currency.LYD);
            }
            if (!targetCustomerId) return;
            
            const createdDebtId = addDebt(targetCustomerId, lydAmount, { groupId });
    
            const baseDescription = `بيع ${foreignAmount.toLocaleString()} ${foreignCurrency} كدين على ${customerNameForTx}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
            
            metadata.createdDebtId = createdDebtId;
            metadata.debtCustomerId = targetCustomerId;
            metadata.groupDescription = groupDescription;

            addTransaction({ type: TransactionType.NewDebt, amount: lydAmount, currency: Currency.LYD, description: `دين مقابل بيع ${foreignCurrency} - ${options.note || ''}`, relatedParty: customerNameForTx, assetId: 'trade_debt', groupId, metadata });
            addTransaction({ type: TransactionType.Withdrawal, amount: -foreignAmount, currency: foreignCurrency, description: groupDescription, relatedParty: customerNameForTx, assetId: foreignAssetId, groupId, metadata });
        } else if (options.isReceivableSettlement && options.receivableId) {
            const receivable = receivables.find(r => r.id === options.receivableId);
            if (!receivable) { 
                console.error("Receivable not found"); 
                setAssets(prev => ({ ...prev, [foreignAssetId]: (Number.isFinite(prev[foreignAssetId]) ? prev[foreignAssetId] : 0) + foreignAmount }));
                return; 
            }
            
            const remainingReceivable = receivable.amount - receivable.paid;
            const amountToSettle = Math.min(lydAmount, remainingReceivable);
            const excessLyd = lydAmount - amountToSettle;
            const baseDescription = `بيع ${foreignAmount.toLocaleString()} ${foreignCurrency} مقابل تسوية مستحق لـ ${receivable.debtor}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;
            
            let excessDebtId: string | undefined;
            let excessDebtCustomerId: string | undefined;

            if (excessLyd > 0 && options.excessHandling?.type === 'debt') {
                let targetCustomerId: string | undefined = options.excessHandling.customerId;
                if (options.excessHandling.newCustomerName) {
                    targetCustomerId = addCustomer(options.excessHandling.newCustomerName, Currency.LYD);
                }
                if (targetCustomerId) {
                    excessDebtId = crypto.randomUUID();
                    excessDebtCustomerId = targetCustomerId;
                    metadata.excessDebtId = excessDebtId;
                    metadata.excessDebtCustomerId = excessDebtCustomerId;
                }
            }
            
            addTransaction({ type: TransactionType.Withdrawal, amount: -foreignAmount, currency: foreignCurrency, description: groupDescription, relatedParty: receivable.debtor, assetId: foreignAssetId, groupId: groupId, metadata: {...metadata, groupDescription} });

            if (amountToSettle > 0) {
                setReceivables(prev => prev.map(r => r.id === options.receivableId ? { ...r, paid: r.paid + amountToSettle } : r));
                addTransaction({ type: TransactionType.Settlement, amount: amountToSettle, currency: Currency.LYD, description: `تسوية مستحق من بيع ${foreignCurrency} - ${options.note || ''}`, relatedParty: receivable.debtor, assetId: 'settlement', groupId, metadata: { ...metadata, groupDescription, settledAmount: amountToSettle } });
            }
            
            if (excessLyd > 0) {
                const excessDesc = `باقي قيمة بيع ${foreignCurrency} بعد تسوية مستحق`;
                if (options.excessHandling?.type === 'debt' && excessDebtId && excessDebtCustomerId) {
                    const excessCustomerName = options.excessHandling.newCustomerName || customers.find(c => c.id === excessDebtCustomerId)?.name || '';
                    const excessDebt: Debt = { id: excessDebtId, amount: excessLyd, paid: 0, date: getLocalISOString() };
                    setCustomers(prev => prev.map(c => c.id === excessDebtCustomerId ? { ...c, debts: [...c.debts, excessDebt] } : c));
                    addTransaction({ type: TransactionType.NewDebt, amount: excessLyd, currency: Currency.LYD, description: excessDesc, relatedParty: excessCustomerName, assetId: 'trade_debt', groupId, metadata });
                    mergeCustomerDebts(excessDebtCustomerId);
                } else { // Deposit
                    if (lydDestination.type === 'bank' && lydDestination.bankId) {
                        setBanks(prev => prev.map(b => b.id === lydDestination.bankId ? { ...b, balance: b.balance + excessLyd } : b));
                        addTransaction({ type: TransactionType.Deposit, amount: excessLyd, currency: Currency.LYD, description: excessDesc, relatedParty: receivable.debtor, assetId: lydDestination.bankId, groupId, metadata });
                    } else if (lydDestination.type === 'cashLyd' && lydDestination.lydCashAssetId) {
                        setAssets(prev => ({ ...prev, [lydDestination.lydCashAssetId!]: (Number.isFinite(prev[lydDestination.lydCashAssetId!]) ? prev[lydDestination.lydCashAssetId!] : 0) + excessLyd }));
                        addTransaction({ type: TransactionType.Deposit, amount: excessLyd, currency: Currency.LYD, description: excessDesc, relatedParty: receivable.debtor, assetId: lydDestination.lydCashAssetId, groupId, metadata });
                    }
                }
            }
        } else {
            const baseDescription = `بيع ${foreignAmount.toLocaleString()} ${foreignCurrency} بسعر ${displayRate}`;
            const groupDescription = options.note ? `${baseDescription} - ${options.note}` : baseDescription;

            if (lydDestination.type === 'bank' && lydDestination.bankId) {
                setBanks(prev => prev.map(b => b.id === lydDestination.bankId ? { ...b, balance: b.balance + lydAmount } : b));
                addTransaction({ type: TransactionType.Deposit, amount: lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: lydDestination.bankId, groupId, metadata: { ...metadata, groupDescription } });
            } else if (lydDestination.type === 'cashLyd' && lydDestination.lydCashAssetId) {
                setAssets(prev => ({ ...prev, [lydDestination.lydCashAssetId!]: (Number.isFinite(prev[lydDestination.lydCashAssetId!]) ? prev[lydDestination.lydCashAssetId!] : 0) + lydAmount }));
                addTransaction({ type: TransactionType.Deposit, amount: lydAmount, currency: Currency.LYD, description: groupDescription, relatedParty: 'صراف', assetId: lydDestination.lydCashAssetId, groupId, metadata: { ...metadata, groupDescription } });
            }
            addTransaction({ type: TransactionType.Withdrawal, amount: -foreignAmount, currency: foreignCurrency, description: groupDescription, relatedParty: 'صراف', assetId: foreignAssetId, groupId, metadata: { ...metadata, groupDescription } });
        }
    };
    const adjustAssetBalance = (assetId: AssetId, amount: number, type: 'deposit' | 'withdrawal', note: string, options?: { isProfit?: boolean; isLoss?: boolean }) => {
        const finalAmount = type === 'deposit' ? amount : -amount;
        setAssets(prev => ({
            ...prev,
            [assetId]: (Number.isFinite(prev[assetId]) ? prev[assetId] : 0) + finalAmount
        }));
    
        const groupId = crypto.randomUUID();
        
        const currency = assetId.includes('Usd') ? Currency.USD : assetId.includes('Tnd') ? Currency.TND : assetId.includes('Eur') ? Currency.EUR : Currency.LYD;
        const actionLabel = type === 'deposit' ? 'إدخال' : 'إخراج';
        const fullDescription = `${actionLabel} ${formatCurrency(amount, currency)} - ${note}`;
        const groupDescription = fullDescription;

        const metadata = { 
            groupId, 
            groupType: 'ADJUST_BALANCE', 
            groupDescription,
            isProfit: options?.isProfit,
            isLoss: options?.isLoss
        };
    
        addTransaction({
            type: type === 'deposit' ? TransactionType.Deposit : TransactionType.Withdrawal,
            amount: finalAmount,
            currency,
            description: fullDescription,
            relatedParty: 'تعديل يدوي',
            assetId: assetId,
            groupId,
            metadata
        });
    };
    // ... (exchangeBetweenUsdAssets, exchangeBetweenEurAssets, transferBetweenBanks, etc. - Keep unchanged)
    const exchangeBetweenUsdAssets = (details: {
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
    }) => {
        const { amount, toAmount, fromAsset, fee, note } = details;
        const toAsset = fromAsset === 'cashUsdLibya' ? 'cashUsdTurkey' : 'cashUsdLibya';
    
        if ((assets[fromAsset] || 0) < amount) {
            alert(`الرصيد في ${ASSET_NAMES[fromAsset]} غير كافٍ.`);
            return;
        }
    
        const groupId = crypto.randomUUID();
        const groupDescription = `بدل ${formatCurrency(amount, Currency.USD)} من ${ASSET_NAMES[fromAsset]} مقابل ${formatCurrency(toAmount, Currency.USD)} إلى ${ASSET_NAMES[toAsset]}`;
        const metadata: any = { groupId, groupType: 'USD_EXCHANGE', groupDescription, ...details };
    
        // 1. Update USD assets
        setAssets(prev => ({
            ...prev,
            [fromAsset]: (Number.isFinite(prev[fromAsset]) ? prev[fromAsset] : 0) - amount,
            [toAsset]: (Number.isFinite(prev[toAsset]) ? prev[toAsset] : 0) + toAmount,
        }));
    
        // 2. Handle the fee based on handling type
        if (fee.amount > 0) {
            const feeDesc = `فرق حوالة: ${note || groupDescription}`;
            if (fee.handling === 'cash' && fee.lydAssetId) {
                const feeAmount = fee.type === 'add' ? fee.amount : -fee.amount;
                setAssets(prev => ({
                    ...prev,
                    [fee.lydAssetId!]: (Number.isFinite(prev[fee.lydAssetId!]) ? prev[fee.lydAssetId!] : 0) + feeAmount,
                }));
                const feeMetadata = {
                    ...metadata,
                    isProfit: fee.type === 'add',
                    isLoss: fee.type === 'deduct',
                };
                addTransaction({
                    type: fee.type === 'add' ? TransactionType.Deposit : TransactionType.Withdrawal,
                    amount: feeAmount,
                    currency: Currency.LYD,
                    description: feeDesc,
                    relatedParty: 'فرق حوالة',
                    assetId: fee.lydAssetId,
                    groupId,
                    metadata: feeMetadata
                });
    
            } else if (fee.handling === 'debt' && fee.customerOption) {
                let customerId = fee.customerOption.value;
                let customerName = fee.customerOption.label;

                if (fee.customerOption.__isNew__) {
                    customerId = addCustomer(customerName, Currency.LYD);
                }
                
                addDebt(customerId, fee.amount, { groupId });
                
                metadata.debtCustomerId = customerId;
                metadata.fee.customerName = customerName;

                addTransaction({
                    type: TransactionType.NewDebt,
                    amount: fee.amount,
                    currency: Currency.LYD,
                    description: `دين فرق حوالة: ${note || 'بدل دولار'}`,
                    relatedParty: customerName,
                    assetId: 'trade_debt',
                    groupId,
                    metadata
                });

            } else if (fee.handling === 'receivable' && fee.receivableOption) {
                const partyName = fee.receivableOption.label;
                const feeAmount = fee.amount;
                
                const createdReceivableId = addReceivable(partyName, feeAmount, Currency.LYD, undefined, { groupId });
                
                metadata.createdReceivableId = createdReceivableId;
                metadata.fee.receivableParty = partyName;
            }
        }
    
        // 3. Log USD transactions
        const difference = toAmount - amount;

        addTransaction({
            type: TransactionType.Withdrawal,
            amount: -amount,
            currency: Currency.USD,
            description: `بدل ${formatCurrency(amount, Currency.USD)} إلى ${ASSET_NAMES[toAsset]}`,
            relatedParty: `بدل إلى ${ASSET_NAMES[toAsset]}`,
            assetId: fromAsset,
            groupId,
            metadata
        });
    
        addTransaction({
            type: TransactionType.Deposit,
            amount: amount,
            currency: Currency.USD,
            description: `بدل ${formatCurrency(amount, Currency.USD)} من ${ASSET_NAMES[fromAsset]}`,
            relatedParty: `بدل من ${ASSET_NAMES[fromAsset]}`,
            assetId: toAsset,
            groupId,
            metadata
        });

        if (difference !== 0) {
            const isProfit = difference > 0;
            const pnlMetadata = {
                ...metadata,
                isProfit: isProfit,
                isLoss: !isProfit,
            };
            addTransaction({
                type: isProfit ? TransactionType.Deposit : TransactionType.Withdrawal,
                amount: difference,
                currency: Currency.USD,
                description: isProfit ? 'ربح فرق بدل دولار' : 'خسارة فرق بدل دولار',
                relatedParty: 'فرق بدل',
                assetId: toAsset,
                groupId,
                metadata: pnlMetadata
            });
        }
    };
    
    const exchangeBetweenEurAssets = (details: {
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
    }) => {
        const { amount, toAmount, fromAsset, fee, note } = details;
        const toAsset = fromAsset === 'cashEurLibya' ? 'cashEurTurkey' : 'cashEurLibya';
    
        if ((assets[fromAsset] || 0) < amount) {
            alert(`الرصيد في ${ASSET_NAMES[fromAsset]} غير كافٍ.`);
            return;
        }
    
        const groupId = crypto.randomUUID();
        const groupDescription = `بدل ${formatCurrency(amount, Currency.EUR)} من ${ASSET_NAMES[fromAsset]} مقابل ${formatCurrency(toAmount, Currency.EUR)} إلى ${ASSET_NAMES[toAsset]}`;
        const metadata: any = { groupId, groupType: 'EUR_EXCHANGE', groupDescription, ...details };
    
        // 1. Update EUR assets
        setAssets(prev => ({
            ...prev,
            [fromAsset]: (Number.isFinite(prev[fromAsset]) ? prev[fromAsset] : 0) - amount,
            [toAsset]: (Number.isFinite(prev[toAsset]) ? prev[toAsset] : 0) + toAmount,
        }));
    
        // 2. Handle the fee based on handling type
        if (fee.amount > 0) {
            const feeDesc = `فرق حوالة: ${note || groupDescription}`;
            if (fee.handling === 'cash' && fee.lydAssetId) {
                const feeAmount = fee.type === 'add' ? fee.amount : -fee.amount;
                setAssets(prev => ({
                    ...prev,
                    [fee.lydAssetId!]: (Number.isFinite(prev[fee.lydAssetId!]) ? prev[fee.lydAssetId!] : 0) + feeAmount,
                }));
                const feeMetadata = {
                    ...metadata,
                    isProfit: fee.type === 'add',
                    isLoss: fee.type === 'deduct',
                };
                addTransaction({
                    type: fee.type === 'add' ? TransactionType.Deposit : TransactionType.Withdrawal,
                    amount: feeAmount,
                    currency: Currency.LYD,
                    description: feeDesc,
                    relatedParty: 'فرق حوالة',
                    assetId: fee.lydAssetId,
                    groupId,
                    metadata: feeMetadata
                });
    
            } else if (fee.handling === 'debt' && fee.customerOption) {
                let customerId = fee.customerOption.value;
                let customerName = fee.customerOption.label;

                if (fee.customerOption.__isNew__) {
                    customerId = addCustomer(customerName, Currency.LYD);
                }
                
                addDebt(customerId, fee.amount, { groupId });

                metadata.debtCustomerId = customerId;
                metadata.fee.customerName = customerName;

                addTransaction({
                    type: TransactionType.NewDebt,
                    amount: fee.amount,
                    currency: Currency.LYD,
                    description: `دين فرق حوالة: ${note || 'بدل يورو'}`,
                    relatedParty: customerName,
                    assetId: 'trade_debt',
                    groupId,
                    metadata
                });

            } else if (fee.handling === 'receivable' && fee.receivableOption) {
                const partyName = fee.receivableOption.label;
                const feeAmount = fee.amount;
                
                const createdReceivableId = addReceivable(partyName, feeAmount, Currency.LYD, undefined, { groupId });
                
                metadata.createdReceivableId = createdReceivableId;
                metadata.fee.receivableParty = partyName;
            }
        }
    
        // 3. Log EUR transactions
        const difference = toAmount - amount;

        addTransaction({
            type: TransactionType.Withdrawal,
            amount: -amount,
            currency: Currency.EUR,
            description: `بدل ${formatCurrency(amount, Currency.EUR)} إلى ${ASSET_NAMES[toAsset]}`,
            relatedParty: `بدل إلى ${ASSET_NAMES[toAsset]}`,
            assetId: fromAsset,
            groupId,
            metadata
        });
    
        addTransaction({
            type: TransactionType.Deposit,
            amount: amount,
            currency: Currency.EUR,
            description: `بدل ${formatCurrency(amount, Currency.EUR)} من ${ASSET_NAMES[fromAsset]}`,
            relatedParty: `بدل من ${ASSET_NAMES[fromAsset]}`,
            assetId: toAsset,
            groupId,
            metadata
        });

        if (difference !== 0) {
            const isProfit = difference > 0;
            const pnlMetadata = {
                ...metadata,
                isProfit: isProfit,
                isLoss: !isProfit,
            };
            addTransaction({
                type: isProfit ? TransactionType.Deposit : TransactionType.Withdrawal,
                amount: difference,
                currency: Currency.EUR,
                description: isProfit ? 'ربح فرق بدل يورو' : 'خسارة فرق بدل يورو',
                relatedParty: 'فرق بدل',
                assetId: toAsset,
                groupId,
                metadata: pnlMetadata
            });
        }
    };
    const transferBetweenBanks = (fromBankId: string, toBankId: string, amount: number) => {
        const fromBank = banks.find(b => b.id === fromBankId);
        const toBank = banks.find(b => b.id === toBankId);
        if (!fromBank || !toBank) return;
    
        setBanks(prev => prev.map(b => {
            if (b.id === fromBankId) return { ...b, balance: b.balance - amount };
            if (b.id === toBankId) return { ...b, balance: b.balance + amount };
            return b;
        }));
    
        const groupId = crypto.randomUUID();
        const groupDescription = `تحويل ${formatCurrency(amount, Currency.LYD)} من ${fromBank.name} إلى ${toBank.name}`;
        const metadata = { groupId, groupType: 'BANK_TRANSFER', groupDescription };
    
        addTransaction({
            type: TransactionType.BankWithdrawal,
            amount: -amount,
            currency: Currency.LYD,
            description: groupDescription,
            relatedParty: toBank.name,
            assetId: fromBankId,
            groupId,
            metadata
        });
        addTransaction({
            type: TransactionType.BankDeposit,
            amount: amount,
            currency: Currency.LYD,
            description: groupDescription,
            relatedParty: fromBank.name,
            assetId: toBankId,
            groupId,
            metadata
        });
    };
    const exchangeFromBankToCash = (bankId: string, amount: number, lydCashAssetId: AssetId) => {
        const bank = banks.find(b => b.id === bankId);
        if (!bank) return;
    
        // Decrease bank balance
        setBanks(prev => prev.map(b => 
            b.id === bankId ? { ...b, balance: b.balance - amount } : b
        ));
    
        // Increase cash asset balance
        setAssets(prev => ({
            ...prev,
            [lydCashAssetId]: (Number.isFinite(prev[lydCashAssetId]) ? prev[lydCashAssetId] : 0) + amount
        }));
    
        const groupId = crypto.randomUUID();
        const groupDescription = `بدل ${formatCurrency(amount, Currency.LYD)} من ${bank.name} إلى ${ASSET_NAMES[lydCashAssetId]}`;
        const metadata = { groupId, groupType: 'BANK_CASH_EXCHANGE', groupDescription };
    
        // Add transaction for bank withdrawal
        addTransaction({
            type: TransactionType.BankWithdrawal,
            amount: -amount,
            currency: Currency.LYD,
            description: groupDescription,
            relatedParty: `بدل إلى ${ASSET_NAMES[lydCashAssetId]}`,
            assetId: bankId,
            groupId,
            metadata
        });
    
        // Add transaction for cash deposit
        addTransaction({
            type: TransactionType.Deposit,
            amount: amount,
            currency: Currency.LYD,
            description: groupDescription,
            relatedParty: `بدل من ${bank.name}`,
            assetId: lydCashAssetId,
            groupId,
            metadata
        });
    };
    const exchangeFromCashToBank = (lydCashAssetId: AssetId, amount: number, bankId: string) => {
        const bank = banks.find(b => b.id === bankId);
        if (!bank) return;
        if ((assets[lydCashAssetId] || 0) < amount) {
            alert(`الرصيد في ${ASSET_NAMES[lydCashAssetId]} غير كافٍ.`);
            return;
        }
    
        // Decrease cash asset balance
        setAssets(prev => ({
            ...prev,
            [lydCashAssetId]: (Number.isFinite(prev[lydCashAssetId]) ? prev[lydCashAssetId] : 0) - amount
        }));
        
        // Increase bank balance
        setBanks(prev => prev.map(b => 
            b.id === bankId ? { ...b, balance: b.balance + amount } : b
        ));
    
        const groupId = crypto.randomUUID();
        const groupDescription = `بدل ${formatCurrency(amount, Currency.LYD)} من ${ASSET_NAMES[lydCashAssetId]} إلى ${bank.name}`;
        const metadata = { groupId, groupType: 'CASH_BANK_EXCHANGE', groupDescription };
    
        // Add transaction for cash withdrawal
        addTransaction({
            type: TransactionType.Withdrawal,
            amount: -amount,
            currency: Currency.LYD,
            description: groupDescription,
            relatedParty: `بدل إلى ${bank.name}`,
            assetId: lydCashAssetId,
            groupId,
            metadata
        });
    
        // Add transaction for bank deposit
        addTransaction({
            type: TransactionType.BankDeposit,
            amount: amount,
            currency: Currency.LYD,
            description: groupDescription,
            relatedParty: `بدل من ${ASSET_NAMES[lydCashAssetId]}`,
            assetId: bankId,
            groupId,
            metadata
        });
    };
    const archiveCustomer = (customerId: string) => setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, isArchived: true } : c));
    const restoreCustomer = (customerId: string) => setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, isArchived: false } : c));
    const adjustBankBalance = (bankId: string, amount: number, type: 'deposit' | 'withdrawal', note: string) => {
        const finalAmount = type === 'deposit' ? amount : amount;
        const bank = banks.find(b => b.id === bankId);
        if (!bank) return;
    
        setBanks(prev => prev.map(b => 
            b.id === bankId ? { ...b, balance: b.balance + finalAmount } : b
        ));
        
        const groupId = crypto.randomUUID();
        const actionLabel = type === 'deposit' ? 'إيداع' : 'سحب';
        const fullDescription = `${actionLabel} ${formatCurrency(amount, Currency.LYD)} - ${note}`;
        const metadata = { groupId, groupType: 'BANK_ADJUST', groupDescription: fullDescription };
    
        addTransaction({
            type: type === 'deposit' ? TransactionType.BankDeposit : TransactionType.BankWithdrawal,
            amount: finalAmount,
            currency: Currency.LYD,
            description: fullDescription,
            relatedParty: `تعديل رصيد ${bank.name}`,
            assetId: bankId,
            groupId,
            metadata
        });
    };
    // ... (addPosTransaction, etc. - Keep unchanged)
    const addPosTransaction = (details: { totalAmount: number; bankCommissionRate: number; bankDepositAmount: number; cashGivenToCustomer: number; bankId: string; transactionCount: number; lydCashAssetId: AssetId; note?: string; }) => {
        const bank = banks.find(b => b.id === details.bankId);
        if(!bank) return;

        const netProfit = details.bankDepositAmount - details.cashGivenToCustomer;

        const newPosTx: PosTransactionDetail = {
            id: crypto.randomUUID(),
            date: getLocalISOString(),
            totalAmount: details.totalAmount,
            bankCommissionRate: details.bankCommissionRate,
            bankDepositAmount: details.bankDepositAmount,
            cashGivenToCustomer: details.cashGivenToCustomer,
            lydCashAssetId: details.lydCashAssetId,
            bankId: details.bankId,
            transactionCount: details.transactionCount,
            note: details.note,
            netProfit: netProfit,
            bankName: bank.name,
            isArchived: false,
        };
        setPosTransactions(prev => [newPosTx, ...prev]);

        setBanks(prev => prev.map(b => b.id === details.bankId ? { ...b, balance: b.balance + details.bankDepositAmount } : b));
        if (details.cashGivenToCustomer > 0) {
            setAssets(prev => ({...prev, [details.lydCashAssetId]: (Number.isFinite(prev[details.lydCashAssetId]) ? prev[details.lydCashAssetId] : 0) - details.cashGivenToCustomer }));
        }
        
        const groupId = crypto.randomUUID();
        const groupDescription = `معاملة POS: ${details.transactionCount} معاملات`;
        const metadata = { groupId, groupType: 'POS_TRANSACTION', groupDescription, posTransactionId: newPosTx.id };

        addTransaction({ type: TransactionType.BankDeposit, amount: details.bankDepositAmount, currency: Currency.LYD, description: `إيداع من ماكينة POS (${details.transactionCount} معاملات)${details.note ? ' - ' + details.note : ''}`, relatedParty: bank.name, assetId: bank.id, groupId, metadata });
        if (details.cashGivenToCustomer > 0) {
            addTransaction({ type: TransactionType.Withdrawal, amount: -details.cashGivenToCustomer, currency: Currency.LYD, description: `سحب سيولة مقابل POS من ${ASSET_NAMES[details.lydCashAssetId]}`, relatedParty: 'زبون POS', assetId: details.lydCashAssetId, groupId, metadata });
        }
    };
    
    // ... (rest of POS logic, dollar cards, etc - Keep unchanged)
    const archivePosTransaction = (id: string) => setPosTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, isArchived: true } : tx));
    const restorePosTransaction = (id: string) => setPosTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, isArchived: false } : tx));
    const deletePosTransaction = (posTransactionId: string, silent: boolean = false) => {
        const posTxToDelete = posTransactions.find(tx => tx.id === posTransactionId);
        if (!posTxToDelete) {
            console.error("POS transaction to delete not found.");
            return;
        }

        // 1. Reverse financial impact
        setBanks(prev => prev.map(b => 
            b.id === posTxToDelete.bankId 
            ? { ...b, balance: b.balance - posTxToDelete.bankDepositAmount } 
            : b
        ));
        if (posTxToDelete.cashGivenToCustomer > 0) {
            setAssets(prev => ({
                ...prev, 
                [posTxToDelete.lydCashAssetId]: (Number.isFinite(prev[posTxToDelete.lydCashAssetId]) ? prev[posTxToDelete.lydCashAssetId] : 0) + posTxToDelete.cashGivenToCustomer 
            }));
        }

        const createVisibleReversal = () => {
            const groupId = crypto.randomUUID();
            const groupDescription = `إلغاء معاملة POS بقيمة إجمالية ${formatCurrency(posTxToDelete.totalAmount, Currency.LYD)}`;
            const metadata = { groupId, groupType: 'POS_TRANSACTION_DELETE', groupDescription };

            addTransaction({
                type: TransactionType.Reversal,
                amount: -posTxToDelete.bankDepositAmount,
                currency: Currency.LYD,
                description: `عكس إيداع POS من ${posTxToDelete.bankName}`,
                relatedParty: 'إلغاء معاملة POS',
                assetId: posTxToDelete.bankId,
                groupId,
                metadata
            });

            if (posTxToDelete.cashGivenToCustomer > 0) {
                addTransaction({
                    type: TransactionType.Reversal,
                    amount: posTxToDelete.cashGivenToCustomer,
                    currency: Currency.LYD,
                    description: `عكس سحب سيولة POS إلى ${ASSET_NAMES[posTxToDelete.lydCashAssetId]}`,
                    relatedParty: 'إلغاء معاملة POS',
                    assetId: posTxToDelete.lydCashAssetId,
                    groupId,
                    metadata
                });
            }
        }
        
        // 2. Handle transaction logging
        if (silent) {
            const originalTxGroupId = transactions.find(tx => tx.metadata?.posTransactionId === posTransactionId)?.groupId;
            if (originalTxGroupId) {
                setTransactions(prev => prev.map(tx => 
                    tx.groupId === originalTxGroupId ? { ...tx, isDeleted: true } : tx
                ));
            } else {
                console.warn(`Could not find original transaction for POS transaction ${posTransactionId} to perform silent delete. A visible reversal will be logged.`);
                createVisibleReversal();
            }
        } else {
            createVisibleReversal();
        }

        // 3. Remove the POS transaction detail
        setPosTransactions(prev => prev.filter(tx => tx.id !== posTransactionId));
    };
    
    const getPosTotalDeposits = (period: 'daily' | 'weekly' | 'monthly'): number => {
        const now = new Date();
        let startDate = new Date();
        if (period === 'daily') startDate.setHours(0, 0, 0, 0);
        else if (period === 'weekly') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
        }
        return posTransactions.filter(tx => !tx.isArchived && new Date(tx.date) >= startDate).reduce((sum, tx) => sum + tx.bankDepositAmount, 0);
    };

    const getActiveDollarCardSpend = () => {
        const bankIds = new Set(banks.map(b => b.id));
        let fromCash = 0;
        let fromBanks = 0;
        let fromExternal = 0;
    
        const activePurchases = dollarCardPurchases.filter(p => p.status === 'active' && !p.isArchived);
    
        for (const purchase of activePurchases) {
            for (const payment of purchase.payments) {
                if (payment.source === 'external') {
                    fromExternal += payment.amount;
                } else if (bankIds.has(payment.source)) {
                    fromBanks += payment.amount;
                } else {
                    fromCash += payment.amount;
                }
            }
        }
    
        return { 
            totalSpend: fromCash + fromBanks + fromExternal, 
            fromCash, 
            fromBanks,
            fromExternal 
        };
    };
    const addDollarCardPurchase = (customerInfo: Pick<DollarCardPurchase, 'customerName' | 'nationalId' | 'phone' | 'passportNumber' | 'contactInfo' | 'accountNumber' | 'iban'>) => {
        const newPurchase: DollarCardPurchase = {
            id: crypto.randomUUID(),
            ...customerInfo,
            payments: [],
            status: 'active',
            isArchived: false,
            createdAt: getLocalISOString(),
        };
        setDollarCardPurchases(prev => [newPurchase, ...prev]);
    };
    const updateDollarCardCustomerInfo = (purchaseId: string, newInfo: Pick<DollarCardPurchase, 'customerName' | 'nationalId' | 'phone' | 'passportNumber' | 'contactInfo' | 'accountNumber' | 'iban'>) => {
        setDollarCardPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, ...newInfo } : p));
    };
    const addPaymentToDollarCardPurchase = (purchaseId: string, paymentDetails: { amount: number; source: string; note?: string; isExternal?: boolean; }) => {
        const purchase = dollarCardPurchases.find(p => p.id === purchaseId);
        if (!purchase) return;
        
        const { amount, source, note, isExternal } = paymentDetails;

        if (isExternal) {
            const newPayment: DollarCardPayment = {
                id: crypto.randomUUID(),
                date: getLocalISOString(),
                amount: amount,
                source: 'external',
                sourceName: 'خارج الخزنة',
                note: note,
            };

            setDollarCardPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, payments: [...p.payments, newPayment] } : p));
            
            const groupId = crypto.randomUUID();
            const groupDescription = `دفعة خارج الخزنة لبطاقة دولار ${purchase.customerName}`;
            const metadata = { groupId, groupType: 'DOLLAR_CARD_PAYMENT_EXTERNAL', groupDescription, purchaseId, payment: newPayment };

            addTransaction({
                type: TransactionType.Withdrawal,
                amount: -amount,
                currency: Currency.LYD,
                description: groupDescription,
                relatedParty: purchase.customerName,
                assetId: 'external_dollar_card_payment',
                groupId,
                metadata
            });

        } else {
            const sourceIsBank = banks.some(b => b.id === source);
            const sourceName = sourceIsBank 
                ? banks.find(b => b.id === source)!.name
                : ASSET_NAMES[source as AssetId];
                
            const newPayment: DollarCardPayment = {
                id: crypto.randomUUID(),
                date: getLocalISOString(),
                amount: amount,
                source: source,
                sourceName,
                note: note,
            };
        
            setDollarCardPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, payments: [...p.payments, newPayment] } : p));
        
            if (sourceIsBank) {
                setBanks(prev => prev.map(b => b.id === source ? { ...b, balance: b.balance - amount } : b));
            } else {
                setAssets(prev => ({ ...prev, [source as AssetId]: (Number.isFinite(prev[source as AssetId]) ? prev[source as AssetId] : 0) - amount }));
            }
        
            const groupId = crypto.randomUUID();
            const groupDescription = `دفعة لبطاقة دولار ${purchase.customerName}`;
            const metadata = { groupId, groupType: 'DOLLAR_CARD_PAYMENT', groupDescription, purchaseId, payment: newPayment };
        
            addTransaction({
                type: TransactionType.Withdrawal,
                amount: -amount,
                currency: Currency.LYD,
                description: `دفعة لبطاقة دولار (${purchase.customerName})`,
                relatedParty: purchase.customerName,
                assetId: source,
                groupId,
                metadata
            });
        }
    };
    const updateDollarCardPayment = (purchaseId: string, paymentId: string, newAmount: number) => {
        let originalPayment: DollarCardPayment | undefined;
        let customerName = '';
        
        setDollarCardPurchases(prev => prev.map(p => {
            if (p.id === purchaseId) {
                customerName = p.customerName;
                return {
                    ...p,
                    payments: p.payments.map(payment => {
                        if (payment.id === paymentId) {
                            originalPayment = payment;
                            return { ...payment, amount: newAmount };
                        }
                        return payment;
                    })
                };
            }
            return p;
        }));
    
        if (originalPayment) {
            if (originalPayment.source === 'external') {
                 const difference = newAmount - originalPayment.amount;
                 const groupId = crypto.randomUUID();
                 addTransaction({
                    type: TransactionType.Reversal,
                    amount: -difference,
                    currency: Currency.LYD,
                    description: `تعديل دفعة خارجية من ${originalPayment.amount} إلى ${newAmount} لـ ${customerName}`,
                    relatedParty: customerName,
                    assetId: 'external_dollar_card_payment',
                    groupId,
                    metadata: { groupId, groupType: 'DOLLAR_CARD_PAYMENT_UPDATE', originalAmount: originalPayment.amount, newAmount }
                });

            } else {
                const difference = newAmount - originalPayment.amount; 
                const sourceIsBank = banks.some(b => b.id === originalPayment!.source);
        
                if (sourceIsBank) {
                    setBanks(prev => prev.map(b => b.id === originalPayment!.source ? { ...b, balance: b.balance - difference } : b));
                } else {
                    setAssets(prev => ({ ...prev, [originalPayment!.source as AssetId]: (Number.isFinite(prev[originalPayment!.source as AssetId]) ? prev[originalPayment!.source as AssetId] : 0) - difference }));
                }
                
                const groupId = crypto.randomUUID();
                const groupDescription = `تعديل دفعة بطاقة دولار`;
                const metadata = { groupId, groupType: 'DOLLAR_CARD_PAYMENT_UPDATE', groupDescription, originalAmount: originalPayment.amount, newAmount };
        
                addTransaction({
                    type: TransactionType.Reversal,
                    amount: -difference,
                    currency: Currency.LYD,
                    description: `تعديل دفعة من ${originalPayment.amount} إلى ${newAmount} لـ ${customerName}`,
                    relatedParty: customerName,
                    assetId: originalPayment.source,
                    groupId,
                    metadata
                });
            }
        }
    };
    const deletePaymentFromDollarCardPurchase = (purchaseId: string, paymentId: string, silent: boolean = false) => {
        let paymentToDelete: DollarCardPayment | undefined;
        let customerName = '';
        
        setDollarCardPurchases(prev => prev.map(p => {
            if (p.id === purchaseId) {
                customerName = p.customerName;
                paymentToDelete = p.payments.find(pm => pm.id === paymentId);
                return { ...p, payments: p.payments.filter(pm => pm.id !== paymentId) };
            }
            return p;
        }));
        
        if (paymentToDelete) {
            const refundAmount = paymentToDelete.amount;
            
            if (paymentToDelete.source !== 'external') {
                 const sourceIsBank = banks.some(b => b.id === paymentToDelete!.source);
                if (sourceIsBank) {
                    setBanks(prev => prev.map(b => b.id === paymentToDelete!.source ? { ...b, balance: b.balance + refundAmount } : b));
                } else {
                    setAssets(prev => ({ ...prev, [paymentToDelete!.source as AssetId]: (Number.isFinite(prev[paymentToDelete!.source as AssetId]) ? prev[paymentToDelete!.source as AssetId] : 0) + refundAmount }));
                }
            }
    
            const assetIdForTx = paymentToDelete.source === 'external' ? 'external_dollar_card_payment' : paymentToDelete.source;

            if (silent) {
                const originalTxGroupId = transactions.find(tx => tx.metadata?.payment?.id === paymentId)?.groupId;
                if (originalTxGroupId) {
                    setTransactions(prev => prev.map(tx => 
                        tx.groupId === originalTxGroupId ? { ...tx, isDeleted: true } : tx
                    ));
                } else {
                    console.warn(`Could not find original transaction for paymentId ${paymentId} to perform silent delete. A visible reversal will be logged.`);
                     const groupId = crypto.randomUUID();
                     addTransaction({
                        type: TransactionType.Reversal,
                        amount: refundAmount,
                        currency: Currency.LYD,
                        description: `إلغاء دفعة (حذف صامت): ${formatCurrency(refundAmount, Currency.LYD)} لـ ${customerName}`,
                        relatedParty: customerName,
                        assetId: assetIdForTx,
                        groupId,
                        metadata: { groupId, groupType: 'DOLLAR_CARD_PAYMENT_DELETE_FALLBACK', groupDescription: "حذف دفعة بطاقة دولار (صامت)" },
                        isDeleted: true,
                    });
                }
            } else {
                const groupId = crypto.randomUUID();
                const groupDescription = `حذف دفعة بطاقة دولار`;
                const metadata = { groupId, groupType: 'DOLLAR_CARD_PAYMENT_DELETE', groupDescription, purchaseId, paymentId };
                
                addTransaction({
                    type: TransactionType.Reversal,
                    amount: refundAmount,
                    currency: Currency.LYD,
                    description: `إلغاء دفعة بقيمة ${formatCurrency(refundAmount, Currency.LYD)} لـ ${customerName}`,
                    relatedParty: customerName,
                    assetId: assetIdForTx,
                    groupId,
                    metadata
                });
            }
        }
    };
    const completeDollarCardPurchase = (purchaseId: string, completionDetails: { receivedUsdAmount: number; usdDestinationAsset: 'cashUsdLibya' | 'cashUsdTurkey' }) => {
        const purchase = dollarCardPurchases.find(p => p.id === purchaseId);
        if (!purchase) return;
        
        const totalLydPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
        const finalCostPerDollar = totalLydPaid > 0 && completionDetails.receivedUsdAmount > 0 
            ? totalLydPaid / completionDetails.receivedUsdAmount 
            : 0;

        const completionData = {
            ...completionDetails,
            totalLydPaid,
            finalCostPerDollar,
            completionDate: getLocalISOString()
        };
    
        setDollarCardPurchases(prev => prev.map(p => 
            p.id === purchaseId ? { 
                ...p, 
                status: 'completed',
                completionDetails: completionData
            } : p
        ));
    
        setAssets(prev => ({ ...prev, [completionDetails.usdDestinationAsset]: (Number.isFinite(prev[completionDetails.usdDestinationAsset]) ? prev[completionDetails.usdDestinationAsset] : 0) + completionDetails.receivedUsdAmount }));
        
        const groupId = crypto.randomUUID();
        const groupDescription = `استلام دولار لبطاقة ${purchase.customerName}`;
        const metadata = { groupId, groupType: 'DOLLAR_CARD_COMPLETE', groupDescription, purchaseId, completionDetails: completionData };
    
        addTransaction({
            type: TransactionType.Deposit,
            amount: completionDetails.receivedUsdAmount,
            currency: Currency.USD,
            description: `استلام دولار من عملية بطاقة ${purchase.customerName}`,
            relatedParty: purchase.customerName,
            assetId: completionDetails.usdDestinationAsset,
            groupId,
            metadata
        });
    };
    const deleteDollarCardPurchase = (purchaseId: string) => {
        const purchase = dollarCardPurchases.find(p => p.id === purchaseId);
        if (!purchase) return;
    
        purchase.payments.forEach(payment => {
            if(payment.source !== 'external') {
                const isBank = banks.some(b => b.id === payment.source);
                if (isBank) {
                    setBanks(prev => prev.map(b => b.id === payment.source ? { ...b, balance: b.balance + payment.amount } : b));
                } else {
                    setAssets(prev => ({ ...prev, [payment.source as AssetId]: (Number.isFinite(prev[payment.source as AssetId]) ? prev[payment.source as AssetId] : 0) + payment.amount }));
                }
            }
        });
    
        const groupDescription = `حذف عملية بطاقة دولار لـ ${purchase.customerName}`;
        
        const paymentTxGroupIds = new Set(
            transactions
                .filter(tx => tx.metadata?.purchaseId === purchaseId && (tx.metadata?.groupType === 'DOLLAR_CARD_PAYMENT' || tx.metadata?.groupType === 'DOLLAR_CARD_PAYMENT_EXTERNAL'))
                .flatMap(tx => tx.groupId ? [tx.groupId] : [])
        );

        setTransactions(prev => prev.map(tx => (tx.groupId && paymentTxGroupIds.has(tx.groupId)) ? { ...tx, isDeleted: true } : tx));

        setDollarCardPurchases(prev => prev.filter(p => p.id !== purchaseId));
    };
    const archiveDollarCardPurchase = (purchaseId: string) => {
        setDollarCardPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, isArchived: true } : p));
    };
    const restoreDollarCardPurchase = (purchaseId: string) => {
        setDollarCardPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, isArchived: false } : p));
    };
    const addExpenseType = (name: string) => {
        const newType: ExpenseType = { id: crypto.randomUUID(), name };
        setExpenseTypes(prev => [...prev, newType]);
    };
    const deleteExpenseType = (id: string) => {
        if (operatingCosts.some(cost => cost.expenseTypeId === id)) {
            alert("لا يمكن حذف هذا النوع لأنه مستخدم في مصروفات حالية.");
            return;
        }
        setExpenseTypes(prev => prev.filter(t => t.id !== id));
    };
    const addOperatingCost = (cost: { amount: number; source: string; expenseTypeId: string; note?: string; date: string; }) => {
        const expenseType = expenseTypes.find(t => t.id === cost.expenseTypeId);
        if (!expenseType) return;
        
        // Handle external source
        if (cost.source === 'external') {
            const newCost: OperatingCost = {
                id: crypto.randomUUID(),
                ...cost,
                sourceName: 'خارج الخزنة',
                expenseTypeName: expenseType.name,
            };
            setOperatingCosts(prev => [newCost, ...prev]);

            const groupId = crypto.randomUUID();
            const groupDescription = `مصروف تشغيلي: ${expenseType.name} (خارج الخزنة)`;
            const metadata = { groupId, groupType: 'OPERATING_COST', groupDescription, costId: newCost.id };

            addTransaction({
                type: TransactionType.Withdrawal,
                amount: -cost.amount,
                currency: Currency.LYD,
                description: `مصروف (خارجي): ${expenseType.name}${cost.note ? ` - ${cost.note}` : ''}`,
                relatedParty: 'تكاليف تشغيلية',
                assetId: 'external_cost', // New asset ID for tracking
                groupId,
                metadata
            });
            return;
        }

        const sourceIsBank = banks.some(b => b.id === cost.source);
        const sourceName = sourceIsBank 
            ? banks.find(b => b.id === cost.source)!.name
            : ASSET_NAMES[cost.source as AssetId];
    
        const newCost: OperatingCost = {
            id: crypto.randomUUID(),
            ...cost,
            sourceName,
            expenseTypeName: expenseType.name,
        };
        setOperatingCosts(prev => [newCost, ...prev]);
    
        if (sourceIsBank) {
            setBanks(prev => prev.map(b => b.id === cost.source ? { ...b, balance: b.balance - cost.amount } : b));
        } else {
            setAssets(prev => ({ ...prev, [cost.source as AssetId]: (Number.isFinite(prev[cost.source as AssetId]) ? prev[cost.source as AssetId] : 0) - cost.amount }));
        }
    
        const groupId = crypto.randomUUID();
        const groupDescription = `مصروف تشغيلي: ${expenseType.name} (من ${sourceName})`;
        const metadata = { groupId, groupType: 'OPERATING_COST', groupDescription, costId: newCost.id };
    
        addTransaction({
            type: TransactionType.Withdrawal,
            amount: -cost.amount,
            currency: Currency.LYD,
            description: `مصروف: ${expenseType.name}${cost.note ? ` - ${cost.note}` : ''}`,
            relatedParty: 'تكاليف تشغيلية',
            assetId: cost.source,
            groupId,
            metadata
        });
    };
    const updateOperatingCost = (costId: string, updates: { amount: number; source: string; expenseTypeId: string; note?: string; date: string; }) => {
        const originalCost = operatingCosts.find(c => c.id === costId);
        if (!originalCost) return;
    
        // Silent delete of the old cost to reverse its effects, then add the new one
        deleteOperatingCost(costId, true); 
        addOperatingCost(updates);
    };
    const deleteOperatingCost = (costId: string, silent: boolean = false) => {
        const costToDelete = operatingCosts.find(c => c.id === costId);
        if (!costToDelete) return;

        // Only reverse financial impact if it wasn't external
        if (costToDelete.source !== 'external') {
            const isBank = banks.some(b => b.id === costToDelete.source);
            if (isBank) {
                setBanks(prev => prev.map(b => b.id === costToDelete.source ? { ...b, balance: b.balance + costToDelete.amount } : b));
            } else {
                setAssets(prev => ({ ...prev, [costToDelete.source as AssetId]: (Number.isFinite(prev[costToDelete.source as AssetId]) ? prev[costToDelete.source as AssetId] : 0) + costToDelete.amount }));
            }
        }
        
        const originalTxGroupId = transactions.find(tx => tx.metadata?.costId === costId)?.groupId;
        if (silent && originalTxGroupId) {
            setTransactions(prev => prev.map(tx => 
                tx.groupId === originalTxGroupId ? { ...tx, isDeleted: true } : tx
            ));
        } else {
            const groupId = crypto.randomUUID();
            const groupDescription = `إلغاء مصروف تشغيلي: ${costToDelete.expenseTypeName}`;
            
            // If external, we just log a reversal but don't add money back to any real asset
            const assetId = costToDelete.source === 'external' ? 'external_cost' : costToDelete.source;

            addTransaction({
                type: TransactionType.Reversal,
                amount: costToDelete.amount,
                currency: Currency.LYD,
                description: groupDescription,
                relatedParty: 'تكاليف تشغيلية',
                assetId: assetId,
                groupId,
                metadata: { groupId, groupType: 'OPERATING_COST_DELETE', groupDescription }
            });
        }
        setOperatingCosts(prev => prev.filter(c => c.id !== costId));
    };
    const showDailyClosingReport = () => setIsClosingModalOpen(true);
    const hideDailyClosingReport = () => setIsClosingModalOpen(false);
    const getComparisonReportData = (period: 'day' | 'week' | 'month' | 'year'): { openingBalances: DailyOpeningBalances['balances']; closingBalances: DailyOpeningBalances['balances']; title: string; } | null => {
        const now = new Date();
        let startDate = new Date(now);
    
        switch(period) {
            case 'day':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                 startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }
        
        const startDateStr = startDate.toLocaleDateString('en-CA');
    
        const openingEntry = [...dailyOpeningBalancesHistory]
            .filter(entry => entry.date <= startDateStr)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
        if (!openingEntry) {
            return null;
        }
    
        const closingBalances = {
            assets: { ...assetsWithDerived },
            banks: [...banks]
        };
    
        const periodTitles: Record<string, string> = { day: "اليوم", week: "الأسبوع", month: "الشهر", year: "السنة"};
    
        return {
            openingBalances: openingEntry.balances,
            closingBalances,
            title: `مقارنة بين رصيد بداية ${periodTitles[period]} والرصيد الحالي.`
        };
    };
    const forceCloseAndRollover = (dateStr: string) => {
        const today = dateStr;
        const existingEntryIndex = dailyOpeningBalancesHistory.findIndex(entry => entry.date === today);
    
        const newBalances: DailyOpeningBalances['balances'] = {
            assets: { ...assetsWithDerived },
            banks: JSON.parse(JSON.stringify(banks))
        };
    
        if (existingEntryIndex > -1) {
            setDailyOpeningBalancesHistory(prev => {
                const newHistory = [...prev];
                newHistory[existingEntryIndex] = { date: today, balances: newBalances };
                return newHistory;
            });
        } else {
            setDailyOpeningBalancesHistory(prev => [...prev, { date: today, balances: newBalances }]);
        }
    };
    const deleteTransactionGroup = (groupId: string) => {
        // Function to handle specific rollback logic for complex transaction groups
        
        // 1. Identify all transactions in the group to get context
        const groupTxs = transactions.filter(tx => tx.groupId === groupId && !tx.isDeleted);
        if (groupTxs.length === 0) return;

        // 2. Perform financial reversal (Cash/Bank balances)
        groupTxs.forEach(tx => {
            const amount = tx.amount;
            const assetId = tx.assetId;
            const isBank = banks.some(b => b.id === assetId);
    
            if (isBank) {
                setBanks(prev => prev.map(b => b.id === assetId ? { ...b, balance: b.balance - amount } : b));
            } else if (Object.prototype.hasOwnProperty.call(assets, assetId)) {
                setAssets(prev => ({ ...prev, [assetId as AssetId]: (Number.isFinite(prev[assetId as AssetId]) ? prev[assetId as AssetId] : 0) - amount }));
            }
        });

        // 3. Handle logic reversal (Debts, Receivables, etc.)
        // We iterate through ALL transactions in the group to catch split logic (e.g. Debt Payment + Surplus Receivable)
        
        const processedLogicTypes = new Set<string>();

        groupTxs.forEach(tx => {
            if (!tx.metadata) return;
            const metadata = tx.metadata;
            const uniqueKey = `${metadata.groupType}-${metadata.debtId || metadata.receivableId || 'general'}`;
            
            // Prevent double processing for same logical entity if multiple txs share metadata (though usually distinct)
            if (processedLogicTypes.has(uniqueKey)) return;
            processedLogicTypes.add(uniqueKey);

            switch (metadata.groupType) {
                case 'DEBT_PAYMENT':
                    if (metadata.customerId && metadata.debtId && metadata.amount) {
                        setCustomers(prev => prev.map(c => c.id === metadata.customerId ? { 
                            ...c, 
                            debts: c.debts.map(d => d.id === metadata.debtId ? { ...d, paid: d.paid - metadata.amount } : d) 
                        } : c));
                    }
                    if (metadata.isSettlement && metadata.receivableId && metadata.settledAmount) {
                        setReceivables(prev => prev.map(r => r.id === metadata.receivableId ? { ...r, paid: r.paid - metadata.settledAmount } : r));
                    }
                    break;
                
                case 'NEW_RECEIVABLE':
                    // This handles surplus that created a receivable
                    {
                        const receivableId = metadata.createdReceivableId || metadata.receivableId;
                        if (receivableId) {
                            setReceivables(prev => {
                                const originalReceivable = prev.find(r => r.id === receivableId);
                                if (!originalReceivable) return prev;
                                
                                // Logic for merged receivables if applicable
                                const findFinalActiveParent = (childId: string, allReceivables: Receivable[]): Receivable | null => {
                                    let parent = allReceivables.find(r => r.metadata?.mergedFrom?.includes(childId));
                                    if (!parent) return null; 
                                    while(true) {
                                        const nextParent = allReceivables.find(r => r.metadata?.mergedFrom?.includes(parent!.id));
                                        if(nextParent) parent = nextParent; else break; 
                                    }
                                    return !parent.isArchived ? parent : null;
                                }

                                const contributedAmount = originalReceivable.amount - originalReceivable.paid;
                                const finalParent = findFinalActiveParent(receivableId, prev);

                                if (finalParent) {
                                    return prev
                                        .map(r => {
                                            if (r.id === finalParent.id) {
                                                return { ...r, amount: r.amount - contributedAmount };
                                            }
                                            return r;
                                        })
                                        .filter(r => r.id !== receivableId);
                                } else {
                                    return prev.filter(r => r.id !== receivableId);
                                }
                            });
                        }
                    }
                    break;

                case 'NEW_DEBT':
                    if (metadata.customerId && metadata.debtId) {
                        setCustomers(prev => prev.map(c => {
                            if (c.id === metadata.customerId) {
                                const customer = c;
                                const debtToRemove = customer.debts.find(d => d.id === metadata.debtId);
                                if (!debtToRemove) return c;
                
                                const contributedAmount = debtToRemove.amount - debtToRemove.paid;
                                const finalParent = findFinalActiveParentDebt(metadata.debtId, customer.debts);
                                
                                if (finalParent) {
                                    const updatedDebts = customer.debts.map(d => {
                                        if (d.id === finalParent.id) {
                                            return { ...d, amount: d.amount - contributedAmount };
                                        }
                                        return d;
                                    }).filter(d => d.id !== metadata.debtId);
                                    return { ...c, debts: updatedDebts };
                                } else {
                                    return { ...c, debts: customer.debts.filter(d => d.id !== metadata.debtId) };
                                }
                            }
                            return c;
                        }));
                    }
                    break;

                case 'RECEIVABLE_PAYMENT':
                    if (metadata.receivableId && metadata.amount) {
                        setReceivables(prev => prev.map(r => r.id === metadata.receivableId ? { ...r, paid: r.paid - metadata.amount } : r));
                    }
                    break;
                case 'SELL_USD':
                case 'SELL_OTHER':
                    if (metadata.isReceivableSettlement && metadata.receivableId) {
                        const settlementTx = groupTxs.find(tx => tx.type === TransactionType.Settlement);
                        const settledAmount = settlementTx ? settlementTx.amount : 0;
                        if (settledAmount > 0) {
                             setReceivables(prev => {
                                const allReceivables = [...prev];
                                const findFinalActiveParent = (childId: string, allRecs: Receivable[]): Receivable | null => {
                                    let parent = allRecs.find(r => r.metadata?.mergedFrom?.includes(childId));
                                    if (!parent) return null;
                                    while (true) {
                                        const nextParent = allRecs.find(r => r.metadata?.mergedFrom?.includes(parent!.id));
                                        if (nextParent) parent = nextParent; else break;
                                    }
                                    return !parent.isArchived ? parent : null;
                                };
                                const finalParent = findFinalActiveParent(metadata.receivableId, allReceivables);
                                
                                // Reverse the payment on the original receivable.
                                let updatedReceivables = allReceivables.map(r => 
                                    r.id === metadata.receivableId ? { ...r, paid: r.paid - settledAmount } : r
                                );
                                
                                // If it was part of a merge, adjust parent's total amount to reflect the change.
                                if (finalParent) {
                                    updatedReceivables = updatedReceivables.map(r => {
                                        if (r.id === finalParent.id) {
                                            return { ...r, amount: r.amount + settledAmount };
                                        }
                                        return r;
                                    });
                                }
                                
                                return updatedReceivables;
                            });
                        }
                    }
                    if (metadata.createdDebtId && metadata.debtCustomerId) {
                        setCustomers(prev => prev.map(c => {
                            if (c.id === metadata.debtCustomerId) {
                                const customer = c;
                                const debtToRemove = customer.debts.find(d => d.id === metadata.createdDebtId);
                                if (!debtToRemove) return c;
                                const contributedAmount = debtToRemove.amount - debtToRemove.paid;
                                const finalParent = findFinalActiveParentDebt(metadata.createdDebtId, customer.debts);
                                if (finalParent) {
                                    const updatedDebts = customer.debts.map(d => {
                                        if (d.id === finalParent.id) {
                                            return { ...d, amount: d.amount - contributedAmount };
                                        }
                                        return d;
                                    }).filter(d => d.id !== metadata.createdDebtId);
                                    return { ...c, debts: updatedDebts };
                                } else {
                                    return { ...c, debts: customer.debts.filter(d => d.id !== metadata.createdDebtId) };
                                }
                            }
                            return c;
                        }));
                    }
                    if (metadata.excessDebtId && metadata.excessDebtCustomerId) {
                         setCustomers(prev => prev.map(c => {
                            if (c.id === metadata.excessDebtCustomerId) {
                                const customer = c;
                                const debtToRemove = customer.debts.find(d => d.id === metadata.excessDebtId);
                                if (!debtToRemove) return c;
                                const contributedAmount = debtToRemove.amount - debtToRemove.paid;
                                const finalParent = findFinalActiveParentDebt(metadata.excessDebtId, customer.debts);
                                if (finalParent) {
                                    const updatedDebts = customer.debts.map(d => {
                                        if (d.id === finalParent.id) {
                                            return { ...d, amount: d.amount - contributedAmount };
                                        }
                                        return d;
                                    }).filter(d => d.id !== metadata.excessDebtId);
                                    return { ...c, debts: updatedDebts };
                                } else {
                                    return { ...c, debts: customer.debts.filter(d => d.id !== metadata.excessDebtId) };
                                }
                            }
                            return c;
                        }));
                    }
                    break;
                case 'DOLLAR_CARD_PAYMENT':
                    if (metadata.purchaseId && metadata.payment?.id) {
                        setDollarCardPurchases(prev => prev.map(p => p.id === metadata.purchaseId ? { ...p, payments: p.payments.filter(pm => pm.id !== metadata.payment.id) } : p));
                    }
                    break;
                case 'OPERATING_COST':
                    if (metadata.costId) {
                        setOperatingCosts(prev => prev.filter(c => c.id !== metadata.costId));
                    }
                    break;
                case 'DOLLAR_CARD_COMPLETE':
                    if (metadata.purchaseId) {
                        setDollarCardPurchases(prev => prev.map(p => {
                            if (p.id === metadata.purchaseId) {
                                const { completionDetails, ...rest } = p;
                                return { ...rest, status: 'active' } as DollarCardPurchase;
                            }
                            return p;
                        }));
                    }
                    break;
                case 'BUY_USD':
                case 'BUY_OTHER':
                    if (metadata.isDebtSettlement && metadata.settlementDebtCustomerId) {
                        const settlementTx = groupTxs.find(tx => tx.type === TransactionType.Settlement);
                        const settledAmount = settlementTx ? settlementTx.amount : 0;
                
                        if (settledAmount > 0) {
                            setCustomers(prev => prev.map(c => {
                                if (c.id === metadata.settlementDebtCustomerId) {
                                    let amountToUnpay = settledAmount;
                                    const customerDebts = [...c.debts];
                                    const refunds: { debtId: string, refundAmount: number }[] = [];
                
                                    for (let i = customerDebts.length - 1; i >= 0; i--) {
                                        if (amountToUnpay <= 0) break;
                                        const debt = customerDebts[i];
                                        if (debt.paid > 0) {
                                            const refundAmount = Math.min(amountToUnpay, debt.paid);
                                            refunds.push({ debtId: debt.id, refundAmount });
                                            amountToUnpay -= refundAmount;
                                        }
                                    }
                                    
                                    let updatedDebts = [...c.debts];
                                    
                                    for (const { debtId, refundAmount } of refunds) {
                                        updatedDebts = updatedDebts.map(d => 
                                            d.id === debtId ? { ...d, paid: d.paid - refundAmount } : d
                                        );
                
                                        const finalParent = findFinalActiveParentDebt(debtId, c.debts);
                                        if (finalParent) {
                                            updatedDebts = updatedDebts.map(d => 
                                                d.id === finalParent.id ? { ...d, amount: d.amount + refundAmount } : d
                                            );
                                        }
                                    }
                                    
                                    return { ...c, debts: updatedDebts };
                                }
                                return c;
                            }));
                        }
                    }
                    if (metadata.isReceivable && metadata.createdReceivableId) {
                        const receivableId = metadata.createdReceivableId;
                        setReceivables(prev => {
                            const originalReceivable = prev.find(r => r.id === receivableId);
                            if (!originalReceivable) return prev;
                            
                            const findFinalActiveParent = (childId: string, allReceivables: Receivable[]): Receivable | null => {
                                let parent = allReceivables.find(r => r.metadata?.mergedFrom?.includes(childId));
                                if (!parent) return null; 
                                while(true) {
                                    const nextParent = allReceivables.find(r => r.metadata?.mergedFrom?.includes(parent!.id));
                                    if(nextParent) parent = nextParent; else break; 
                                }
                                return !parent.isArchived ? parent : null;
                            }
    
                            const contributedAmount = originalReceivable.amount - originalReceivable.paid;
                            const finalParent = findFinalActiveParent(receivableId, prev);
    
                            if (finalParent) {
                                return prev
                                    .map(r => {
                                        if (r.id === finalParent.id) {
                                            return { ...r, amount: r.amount - contributedAmount };
                                        }
                                        return r;
                                    })
                                    .filter(r => r.id !== receivableId);
                            } else {
                                return prev.filter(r => r.id !== receivableId);
                            }
                        });
                    }
                    break;
                case 'POS_TRANSACTION':
                    if (metadata.posTransactionId) {
                        setPosTransactions(prev => prev.filter(p => p.id !== metadata.posTransactionId));
                    }
                    break;
                case 'SINGLE_DEBT_CONVERSION':
                    if (metadata.customerId && metadata.originalDebtId && metadata.newDebtId && metadata.destinationCustomerId && metadata.lydAmount && metadata.unpaidUsdAmount) {
                        setCustomers(prev => prev.map(c => {
                            let customer = { ...c };
                            let modified = false;
                
                            // Handle LYD debt removal
                            if (customer.id === metadata.destinationCustomerId) {
                                const debtToRemove = customer.debts.find(d => d.id === metadata.newDebtId);
                                if (debtToRemove) {
                                    // Logic for merged debts could be added here
                                    customer.debts = customer.debts.filter(d => d.id !== metadata.newDebtId);
                                    modified = true;
                                }
                            }
                
                            // Handle USD debt restoration (can be the same customer)
                            if (customer.id === metadata.customerId) {
                                const debtExists = customer.debts.some(d => d.id === metadata.originalDebtId);
                                if (debtExists) {
                                    customer.debts = customer.debts.map(d =>
                                        d.id === metadata.originalDebtId
                                            ? { ...d, paid: d.paid - metadata.unpaidUsdAmount }
                                            : d
                                    );
                                    modified = true;
                                }
                            }
                            
                            return modified ? customer : c;
                        }));
                    }
                    break;
                case 'USD_EXCHANGE':
                case 'EUR_EXCHANGE':
                    if (metadata.fee) {
                        if (metadata.fee.handling === 'debt' && metadata.createdDebtId && metadata.debtCustomerId) {
                            setCustomers(prev => prev.map(c => {
                                if (c.id === metadata.debtCustomerId) {
                                    const customer = c;
                                    const debtToRemove = customer.debts.find(d => d.id === metadata.createdDebtId);
                                    if (!debtToRemove) return c;
                                    // Logic for merged debts could be added here
                                    return { ...c, debts: customer.debts.filter(d => d.id !== metadata.createdDebtId) };
                                }
                                return c;
                            }));
                        } else if (metadata.fee.handling === 'receivable' && metadata.createdReceivableId) {
                            const receivableId = metadata.createdReceivableId;
                            setReceivables(prev => {
                                // Logic for merged receivables could be added here
                                return prev.filter(r => r.id !== receivableId);
                            });
                        }
                    }
                    break;
            }
        });
    
        setTransactions(prev => prev.map(tx => 
            tx.groupId === groupId ? { ...tx, isDeleted: true } : tx
        ));
    };
    const restoreTransactionGroup = (groupId: string) => {
        const groupTxs = transactions.filter(tx => tx.groupId === groupId && tx.isDeleted);
        if (groupTxs.length === 0) return;
    
        // 1. Financial Restoration
        groupTxs.forEach(tx => {
            const amount = tx.amount;
            const assetId = tx.assetId;
            const isBank = banks.some(b => b.id === assetId);
    
            if (isBank) {
                setBanks(prev => prev.map(b => b.id === assetId ? { ...b, balance: b.balance + amount } : b));
            } else if (Object.prototype.hasOwnProperty.call(assets, assetId)) {
                setAssets(prev => ({ ...prev, [assetId as AssetId]: (Number.isFinite(prev[assetId as AssetId]) ? prev[assetId as AssetId] : 0) + amount }));
            }
        });
        
        // 2. Logic Restoration
        const processedLogicTypes = new Set<string>();

        groupTxs.forEach(tx => {
            if (!tx.metadata) return;
            const metadata = tx.metadata;
            const uniqueKey = `${metadata.groupType}-${metadata.debtId || metadata.receivableId || 'general'}`;
            
            if (processedLogicTypes.has(uniqueKey)) return;
            processedLogicTypes.add(uniqueKey);

             switch (metadata.groupType) {
                case 'DEBT_PAYMENT':
                    if (metadata.customerId && metadata.debtId && metadata.amount) {
                        setCustomers(prev => prev.map(c => c.id === metadata.customerId ? { ...c, debts: c.debts.map(d => d.id === metadata.debtId ? { ...d, paid: d.paid + metadata.amount } : d) } : c));
                    }
                    if (metadata.isSettlement && metadata.receivableId && metadata.settledAmount) {
                        setReceivables(prev => prev.map(r => r.id === metadata.receivableId ? { ...r, paid: r.paid + metadata.settledAmount } : r));
                    }
                    break;
                
                case 'NEW_RECEIVABLE':
                    if (metadata.receivableId && metadata.amount) {
                        const receivableToRestore: Receivable = {
                            id: metadata.receivableId,
                            debtor: tx.relatedParty, // Use tx relatedParty as backup
                            amount: metadata.amount,
                            paid: 0,
                            currency: tx.currency,
                            date: tx.date,
                            isArchived: false,
                            metadata: metadata.createdReceivableId ? { mergedFrom: [] } : undefined,
                        };
                        setReceivables(prev => {
                            if (prev.some(r => r.id === receivableToRestore.id)) return prev;
                            return [...prev, receivableToRestore];
                        });
                    }
                    break;

                case 'NEW_DEBT':
                    if (metadata.customerId && metadata.debtId && metadata.amount) {
                        const newDebt: Debt = { id: metadata.debtId, amount: metadata.amount, paid: 0, date: tx.date };
                        setCustomers(prev => prev.map(c => c.id === metadata.customerId ? { ...c, debts: [...c.debts, newDebt] } : c));
                    }
                    break;

                case 'RECEIVABLE_PAYMENT':
                    if (metadata.receivableId && metadata.amount) {
                        setReceivables(prev => prev.map(r => r.id === metadata.receivableId ? { ...r, paid: r.paid + metadata.amount } : r));
                    }
                    break;
                case 'SELL_USD':
                case 'SELL_OTHER':
                    if (metadata.isReceivableSettlement && metadata.receivableId) {
                        const settlementTx = groupTxs.find(tx => tx.type === TransactionType.Settlement);
                        const settledAmount = settlementTx ? settlementTx.amount : 0;
                        if (settledAmount > 0) {
                            setReceivables(prev => prev.map(r => 
                                r.id === metadata.receivableId ? { ...r, paid: r.paid + settledAmount } : r
                            ));
                        }
                    }
                     const debtTx = groupTxs.find(tx => tx.type === TransactionType.NewDebt);
                    if (debtTx) {
                        if (metadata.createdDebtId && metadata.debtCustomerId) {
                            const restoredDebt: Debt = { id: metadata.createdDebtId, amount: debtTx.amount, paid: 0, date: debtTx.date };
                            setCustomers(prev => prev.map(c => 
                                c.id === metadata.debtCustomerId 
                                ? { ...c, debts: [...c.debts, restoredDebt] } 
                                : c
                            ));
                        }
                        if (metadata.excessDebtId && metadata.excessDebtCustomerId) {
                            const restoredDebt: Debt = { id: metadata.excessDebtId, amount: debtTx.amount, paid: 0, date: debtTx.date };
                            setCustomers(prev => prev.map(c => 
                                c.id === metadata.excessDebtCustomerId 
                                ? { ...c, debts: [...c.debts, restoredDebt] } 
                                : c
                            ));
                        }
                    }
                    break;
                case 'DOLLAR_CARD_PAYMENT':
                    if (metadata.purchaseId && metadata.payment) {
                        setDollarCardPurchases(prev => prev.map(p => {
                            if (p.id === metadata.purchaseId) {
                                if (p.payments.some(pm => pm.id === metadata.payment.id)) return p;
                                return { ...p, payments: [...p.payments, metadata.payment] };
                            }
                            return p;
                        }));
                    }
                    break;
                case 'OPERATING_COST':
                    break;
                case 'DOLLAR_CARD_COMPLETE':
                    if (metadata.purchaseId && metadata.completionDetails) {
                        setDollarCardPurchases(prev => prev.map(p => p.id === metadata.purchaseId ? { ...p, status: 'completed', completionDetails: metadata.completionDetails } : p));
                    }
                    break;
                case 'BUY_USD':
                case 'BUY_OTHER':
                    if (metadata.isDebtSettlement && metadata.settlementDebtCustomerId) {
                        const settlementTx = groupTxs.find(tx => tx.type === TransactionType.Settlement);
                        const settledAmount = settlementTx ? settlementTx.amount : 0;

                        if (settledAmount > 0) {
                            setCustomers(prev => prev.map(c => {
                                if (c.id === metadata.settlementDebtCustomerId) {
                                    let amountToPay = settledAmount;
                                    const paidDebts = c.debts.map(debt => {
                                        if (amountToPay <= 0) return debt;
                                        const unpaid = debt.amount - debt.paid;
                                        if (unpaid > 0) {
                                            const paymentForThisDebt = Math.min(amountToPay, unpaid);
                                            amountToPay -= paymentForThisDebt;
                                            return { ...debt, paid: debt.paid + paymentForThisDebt };
                                        }
                                        return debt;
                                    });
                                    return { ...c, debts: paidDebts };
                                }
                                return c;
                            }));
                        }
                    }
                    if (metadata.isReceivable && metadata.createdReceivableId) {
                        setReceivables(prev => {
                             const exists = prev.some(r => r.id === metadata.createdReceivableId);
                             if (exists) { 
                                return prev.map(r => r.id === metadata.createdReceivableId ? { ...r, isArchived: false } : r);
                             } else { 
                                 const newReceivable: Receivable = {
                                     id: metadata.createdReceivableId,
                                     debtor: metadata.receivablePartyOption.label,
                                     amount: metadata.lydAmount,
                                     paid: 0,
                                     currency: Currency.LYD,
                                     date: tx.date,
                                     isArchived: false,
                                 };
                                 return [...prev, newReceivable];
                             }
                        });
                    }
                    break;
                case 'POS_TRANSACTION':
                    break;
                case 'SINGLE_DEBT_CONVERSION':
                    if (metadata.customerId && metadata.originalDebtId && metadata.newDebtId && metadata.lydAmount && metadata.destinationCustomerId && metadata.unpaidUsdAmount) {
                        const newLydDebt = { id: metadata.newDebtId, amount: metadata.lydAmount, paid: 0, date: tx.date };
                        
                        setCustomers(prev => prev.map(c => {
                            let customer = { ...c };
                            let modified = false;
                
                            // Handle USD debt re-payment
                            if (customer.id === metadata.customerId) {
                                const originalDebtExists = customer.debts.some(d => d.id === metadata.originalDebtId);
                                if (originalDebtExists) {
                                    customer.debts = customer.debts.map(d =>
                                        d.id === metadata.originalDebtId
                                            ? { ...d, paid: d.paid + metadata.unpaidUsdAmount }
                                            : d
                                    );
                                    modified = true;
                                }
                            }
                
                            // Handle LYD debt re-creation
                            if (customer.id === metadata.destinationCustomerId) {
                                if (!customer.debts.some(d => d.id === newLydDebt.id)) {
                                    customer.debts = [...customer.debts, newLydDebt];
                                    modified = true;
                                }
                            }
                            
                            return modified ? customer : c;
                        }));
                    }
                    break;
                case 'USD_EXCHANGE':
                case 'EUR_EXCHANGE':
                    if (metadata.fee) {
                        if (metadata.fee.handling === 'debt' && metadata.createdDebtId && metadata.debtCustomerId && metadata.fee.customerName) {
                            const restoredDebt: Debt = { id: metadata.createdDebtId, amount: metadata.fee.amount, paid: 0, date: tx.date };
                            setCustomers(prev => prev.map(c => 
                                c.id === metadata.debtCustomerId 
                                ? { ...c, debts: [...c.debts, restoredDebt] } 
                                : c
                            ));
                        } else if (metadata.fee.handling === 'receivable' && metadata.createdReceivableId && metadata.fee.receivableParty) {
                            const restoredReceivable: Receivable = {
                                id: metadata.createdReceivableId,
                                debtor: metadata.fee.receivableParty,
                                amount: metadata.fee.amount,
                                paid: 0,
                                currency: Currency.LYD,
                                date: tx.date,
                                isArchived: false,
                            };
                            setReceivables(prev => {
                                if (prev.some(r => r.id === restoredReceivable.id)) return prev;
                                return [...prev, restoredReceivable];
                            });
                        }
                    }
                    break;
            }
        });
        
        setTransactions(prev => prev.map(tx => 
            tx.groupId === groupId ? { ...tx, isDeleted: false } : tx
        ));
    };
    const updateTransactionDate = (transactionIds: string[], direction: 'forward' | 'backward') => {
        const idsToUpdate = new Set(transactionIds);
        setTransactions(prev => prev.map(tx => {
            if (idsToUpdate.has(tx.id)) {
                const newDate = new Date(tx.date);
                const offset = direction === 'forward' ? 1 : -1;
                newDate.setDate(newDate.getDate() + offset);
                return { ...tx, date: getLocalISOString(newDate) };
            }
            return tx;
        }));
    };
    const toggleTransactionVisibility = (transactionIds: string[], hide: boolean) => {
        const idsToToggle = new Set(transactionIds);
        setTransactions(prev =>
            prev.map(tx =>
                idsToToggle.has(tx.id) ? { ...tx, isTemporarilyHidden: hide } : tx
            )
        );
    };
    const updateTelegramSettings = (token: string, chatId: string) => {
        setTelegramSettings({ token, chatId });
    };
    const sendTelegramMessage = async (message: string, isMarkdown: boolean = true) => {
        if (!telegramSettings.token || !telegramSettings.chatId) {
            console.error("Telegram settings are not configured.");
            return false;
        }
        const url = `https://api.telegram.org/bot${telegramSettings.token}/sendMessage`;
        try {
            const body: any = { chat_id: telegramSettings.chatId, text: message };
            if (isMarkdown) {
                body.parse_mode = 'MarkdownV2';
            }
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            return data.ok;
        } catch (error) {
            console.error("Failed to send Telegram message:", error);
            return false;
        }
    };
    const sendTestTelegramMessage = async () => {
        const message = "✅ *رسالة اختبار*\n\nهذه رسالة اختبار للتأكد من أن إعدادات تليجرام صحيحة\\.";
        return await sendTelegramMessage(message);
    };
    const sendDollarCardReportToTelegram = async (purchaseId: string): Promise<boolean> => {
        const purchase = dollarCardPurchases.find(p => p.id === purchaseId);
        if (!purchase) return false;
        const message = formatDollarCardCustomerForTelegram(purchase);
        return await sendTelegramMessage(message, false);
    };
    
    const exportData = (overrides?: { capitalHistory?: CapitalHistoryEntry[] }): string => {
        const dataToExport = {
            users,
            assets,
            banks,
            customers,
            receivables,
            transactions,
            posTransactions,
            dollarCardPurchases,
            expenseTypes,
            operatingCosts,
            dailyOpeningBalancesHistory,
            pendingTrades,
            externalValues,
            externalValueTransactions,
            telegramSettings,
            lastReportSent,
            capitalHistory: overrides?.capitalHistory ?? capitalHistory,
        };
        return JSON.stringify(dataToExport, null, 2);
    };

    const importData = (jsonData: Record<string, any>) => {
        setUsers(jsonData.users ?? []);
        setAssets(jsonData.assets ?? { cashLydMisrata: 0, cashLydTripoli: 0, cashLydZliten: 0, cashUsdLibya: 0, cashUsdTurkey: 0, cashTnd: 0, cashEurLibya: 0, cashEurTurkey: 0, cashSar: 0, cashEgp: 0 });
        setBanks(jsonData.banks ?? []);
        setCustomers(jsonData.customers ?? []);
        setReceivables(jsonData.receivables ?? []);
        setTransactions(jsonData.transactions ?? []);
        setPosTransactions(jsonData.posTransactions ?? []);
        setDollarCardPurchases(jsonData.dollarCardPurchases ?? []);
        setExpenseTypes(jsonData.expenseTypes ?? []);
        setOperatingCosts(jsonData.operatingCosts ?? []);
        setDailyOpeningBalancesHistory(jsonData.dailyOpeningBalancesHistory ?? []);
        setPendingTrades(jsonData.pendingTrades ?? []);
        setExternalValues(jsonData.externalValues ?? []);
        setExternalValueTransactions(jsonData.externalValueTransactions ?? []);
        setTelegramSettings(jsonData.telegramSettings ?? { token: '', chatId: '' });
        setLastReportSent(jsonData.lastReportSent ?? { daily: '', weekly: '', monthly: '' });
        setCapitalHistory(jsonData.capitalHistory ?? []);
        setCurrentUser(null);
    };

    const migrateData = (jsonData: Record<string, string>) => {
        const migrationMap: Record<string, (data: any) => void> = {
            'assets': (d) => setAssets(d), 'banks': (d) => setBanks(d), 'transactions': (d) => setTransactions(d),
            'customers': (d) => setCustomers(d), 'receivables': (d) => setReceivables(d), 'posTransactions': (d) => setPosTransactions(d),
            'dollarCardPurchases': (d) => setDollarCardPurchases(d), 'operatingCosts': (d) => setOperatingCosts(d), 'expenseTypes': (d) => setExpenseTypes(d),
            'users': (d) => setUsers(d), 'dailyOpeningBalancesHistory': (d) => setDailyOpeningBalancesHistory(d), 'telegramSettings': (d) => setTelegramSettings(d),
        };
        for (const key in jsonData) {
            if (migrationMap[key]) {
                try {
                    migrationMap[key](JSON.parse(jsonData[key]));
                } catch (e) {
                    console.error(`Error parsing data for key ${key}:`, e);
                    throw new Error(`فشل تحليل البيانات للمفتاح ${key}.`);
                }
            }
        }
        setCurrentUser(null);
    };
    const uploadAllDataToSupabase = async () => {
        if (!isSupabaseEnabled) return;
        const payloads: { key: string; value: any }[] = [
            { key: 'users', value: users },
            { key: 'assets', value: assets },
            { key: 'banks', value: banks },
            { key: 'customers', value: customers },
            { key: 'receivables', value: receivables },
            { key: 'transactions', value: transactions },
            { key: 'posTransactions', value: posTransactions },
            { key: 'dollarCardPurchases', value: dollarCardPurchases },
            { key: 'expenseTypes', value: expenseTypes },
            { key: 'operatingCosts', value: operatingCosts },
            { key: 'dailyOpeningBalancesHistory', value: dailyOpeningBalancesHistory },
            { key: 'pendingTrades', value: pendingTrades },
            { key: 'externalValues', value: externalValues },
            { key: 'externalValueTransactions', value: externalValueTransactions },
            { key: 'telegramSettings', value: telegramSettings },
            { key: 'lastReportSent', value: lastReportSent },
            { key: 'capitalHistory', value: capitalHistory },
            { key: 'dashboardCardConfig', value: dashboardCardConfig },
            { key: 'sidebarConfig', value: sidebarConfig },
            { key: 'isSidebarCollapsed', value: isSidebarCollapsed },
            { key: 'isNumberFormattingEnabled', value: isNumberFormattingEnabled },
            { key: 'showCapitalEvolution', value: showCapitalEvolution },
            { key: 'isDetailedView', value: isDetailedView },
        ];
        for (const item of payloads) {
            await supabase!.from('app_data').upsert({ key: item.key, value: item.value });
        }
    };
    const loadDataFromSupabase = async () => {
        if (!isSupabaseEnabled) return;
        const { data, error } = await supabase!.from('app_data').select('key, value');
        if (error || !data) return;
        const map: Record<string, any> = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
        if (map.users) setUsers(map.users);
        if (map.assets) setAssets(map.assets);
        if (map.banks) setBanks(map.banks);
        if (map.customers) setCustomers(map.customers);
        if (map.receivables) setReceivables(map.receivables);
        if (map.transactions) setTransactions(map.transactions);
        if (map.posTransactions) setPosTransactions(map.posTransactions);
        if (map.dollarCardPurchases) setDollarCardPurchases(map.dollarCardPurchases);
        if (map.expenseTypes) setExpenseTypes(map.expenseTypes);
        if (map.operatingCosts) setOperatingCosts(map.operatingCosts);
        if (map.dailyOpeningBalancesHistory) setDailyOpeningBalancesHistory(map.dailyOpeningBalancesHistory);
        if (map.pendingTrades) setPendingTrades(map.pendingTrades);
        if (map.externalValues) setExternalValues(map.externalValues);
        if (map.externalValueTransactions) setExternalValueTransactions(map.externalValueTransactions);
        if (map.telegramSettings) setTelegramSettings(map.telegramSettings);
        if (map.lastReportSent) setLastReportSent(map.lastReportSent);
        if (map.capitalHistory) setCapitalHistory(map.capitalHistory);
        if (map.dashboardCardConfig) setDashboardCardConfig(map.dashboardCardConfig);
        if (map.sidebarConfig) setSidebarConfig(map.sidebarConfig);
        if (typeof map.isSidebarCollapsed === 'boolean') setIsSidebarCollapsed(map.isSidebarCollapsed);
        if (typeof map.isNumberFormattingEnabled === 'boolean') setIsNumberFormattingEnabled(map.isNumberFormattingEnabled);
        if (typeof map.showCapitalEvolution === 'boolean') setShowCapitalEvolution(map.showCapitalEvolution);
        if (typeof map.isDetailedView === 'boolean') setIsDetailedView(map.isDetailedView);
    };

    const startRealtime = () => {
        if (!isSupabaseEnabled) return;
        const channel = supabase!.channel('app_data_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, (payload: any) => {
                const { key, value } = payload.new || payload.old || {};
                switch (key) {
                    case 'users': setUsers(value); break;
                    case 'assets': setAssets(value); break;
                    case 'banks': setBanks(value); break;
                    case 'customers': setCustomers(value); break;
                    case 'receivables': setReceivables(value); break;
                    case 'transactions': setTransactions(value); break;
                    case 'posTransactions': setPosTransactions(value); break;
                    case 'dollarCardPurchases': setDollarCardPurchases(value); break;
                    case 'expenseTypes': setExpenseTypes(value); break;
                    case 'operatingCosts': setOperatingCosts(value); break;
                    case 'dailyOpeningBalancesHistory': setDailyOpeningBalancesHistory(value); break;
                    case 'pendingTrades': setPendingTrades(value); break;
                    case 'externalValues': setExternalValues(value); break;
                    case 'externalValueTransactions': setExternalValueTransactions(value); break;
                    case 'telegramSettings': setTelegramSettings(value); break;
                    case 'lastReportSent': setLastReportSent(value); break;
                    case 'capitalHistory': setCapitalHistory(value); break;
                    case 'dashboardCardConfig': setDashboardCardConfig(value); break;
                    case 'sidebarConfig': setSidebarConfig(value); break;
                    case 'isSidebarCollapsed': setIsSidebarCollapsed(value); break;
                    case 'isNumberFormattingEnabled': setIsNumberFormattingEnabled(value); break;
                    case 'showCapitalEvolution': setShowCapitalEvolution(value); break;
                    case 'isDetailedView': setIsDetailedView(value); break;
                }
            });
        channel.subscribe();
    };

    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('assets'); }, [assets]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('banks'); }, [banks]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('customers'); }, [customers]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('receivables'); }, [receivables]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('transactions'); }, [transactions]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('posTransactions'); }, [posTransactions]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('dollarCardPurchases'); }, [dollarCardPurchases]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('expenseTypes'); }, [expenseTypes]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('operatingCosts'); }, [operatingCosts]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('dailyOpeningBalancesHistory'); }, [dailyOpeningBalancesHistory]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('pendingTrades'); }, [pendingTrades]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('externalValues'); }, [externalValues]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('externalValueTransactions'); }, [externalValueTransactions]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('telegramSettings'); }, [telegramSettings]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('lastReportSent'); }, [lastReportSent]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('capitalHistory'); }, [capitalHistory]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('dashboardCardConfig'); }, [dashboardCardConfig]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('sidebarConfig'); }, [sidebarConfig]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('isSidebarCollapsed'); }, [isSidebarCollapsed]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('isNumberFormattingEnabled'); }, [isNumberFormattingEnabled]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('showCapitalEvolution'); }, [showCapitalEvolution]);
    useEffect(() => { if (isSupabaseEnabled && currentUser) enqueueSync('isDetailedView'); }, [isDetailedView]);
    const addPendingTrade = (description: string, tradeData: PendingTrade['tradeData']) => {
        const newTrade: PendingTrade = { id: crypto.randomUUID(), createdAt: getLocalISOString(), status: 'pending', description, tradeData };
        setPendingTrades(prev => [newTrade, ...prev]);
    };
    const updatePendingTrade = (tradeId: string, newDescription: string, newTradeData: PendingTrade['tradeData']) => {
        setPendingTrades(prev => prev.map(t => t.id === tradeId ? { ...t, description: newDescription, tradeData: newTradeData } : t));
    };
    const confirmPendingTrade = (tradeId: string) => {
        const trade = pendingTrades.find(t => t.id === tradeId);
        if (!trade) return;
        const { type, ...args }: any = trade.tradeData;
        switch (type) {
            case 'buyUsd': buyUsd(args.usdAmount, args.rate, args.lydSource, args.usdDestination, args.options); break;
            case 'sellUsd': sellUsd(args.usdAmount, args.rate, args.usdSource, args.lydDestination, args.options); break;
            case 'buyForeignCurrency': buyForeignCurrency(args.foreignAmount, args.rate, args.foreignCurrency, args.foreignAssetId, args.lydSource, args.options); break;
            case 'sellForeignCurrency': sellForeignCurrency(args.foreignAmount, args.rate, args.foreignCurrency, args.foreignAssetId, args.lydDestination, args.options); break;
            case 'adjustBalance': adjustAssetBalance(args.assetId, args.amount, args.txType, args.note, args.options); break;
        }
        setPendingTrades(prev => prev.filter(t => t.id !== tradeId));
    };
    const deletePendingTrade = (tradeId: string) => {
        setPendingTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: 'deleted' } : t));
    };
    const restorePendingTrade = (tradeId: string) => {
        setPendingTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: 'pending' } : t));
    };
    const addExternalValue = (value: Omit<ExternalValue, 'id' | 'createdAt'>) => {
        const newValue: ExternalValue = { id: crypto.randomUUID(), createdAt: getLocalISOString(), ...value };
        setExternalValues(prev => [newValue, ...prev]);
        const newTx: ExternalValueTransaction = { id: crypto.randomUUID(), externalValueId: newValue.id, date: getLocalISOString(), type: 'initial', amount: value.amount, user: currentUser?.displayName || 'نظام' };
        setExternalValueTransactions(prev => [newTx, ...prev]);
    };
    const adjustExternalValue = (id: string, amount: number, type: 'deposit' | 'withdrawal', notes?: string) => {
        setExternalValues(prev => prev.map(v => v.id === id ? { ...v, amount: type === 'deposit' ? v.amount + amount : v.amount - amount } : v));
        const newTx: ExternalValueTransaction = { id: crypto.randomUUID(), externalValueId: id, date: getLocalISOString(), type, amount, notes, user: currentUser?.displayName || 'نظام' };
        setExternalValueTransactions(prev => [newTx, ...prev]);
    };
    const deleteExternalValue = (id: string) => {
        setExternalValues(prev => prev.filter(v => v.id !== id));
        setExternalValueTransactions(prev => prev.filter(tx => tx.externalValueId !== id));
    };
    const deleteExternalValueTransaction = (transactionId: string) => {
        const txToDelete = externalValueTransactions.find(tx => tx.id === transactionId);
        if (!txToDelete) return;
        setExternalValues(prev => prev.map(v => {
            if (v.id === txToDelete.externalValueId) {
                const adjustment = txToDelete.type === 'deposit' || txToDelete.type === 'initial' ? -txToDelete.amount : txToDelete.amount;
                return { ...v, amount: v.amount + adjustment };
            }
            return v;
        }));
        setExternalValueTransactions(prev => prev.filter(tx => tx.id !== transactionId));
    };
    const mergeCustomerDebts = (customerId: string) => {
        setCustomers(prev => {
            const customerIndex = prev.findIndex(c => c.id === customerId);
            if (customerIndex === -1) return prev;
    
            const customer = prev[customerIndex];
            const allDebts = customer.debts;
            const unpaidDebts = allDebts.filter(d => (d.amount - d.paid) > 0 && !d.isArchived);
    
            if (unpaidDebts.length <= 1) {
                return prev;
            }
    
            const totalUnpaidAmount = unpaidDebts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
            const unpaidDebtIds = unpaidDebts.map(d => d.id);
    
            const mergedDebt: Debt = {
                id: crypto.randomUUID(),
                amount: totalUnpaidAmount,
                paid: 0,
                date: getLocalISOString(),
                metadata: {
                    mergedFrom: unpaidDebtIds
                }
            };
    
            const updatedDebts = allDebts.map(d => {
                if (unpaidDebtIds.includes(d.id)) {
                    return { ...d, isArchived: true };
                }
                return d;
            });
    
            const updatedCustomer = {
                ...customer,
                debts: [...updatedDebts, mergedDebt]
            };
    
            const newCustomers = [...prev];
            newCustomers[customerIndex] = updatedCustomer;
            return newCustomers;
        });
    };
    
    const mergeDebtorReceivables = (debtorName: string, currency: Currency) => {
        setReceivables(prev => {
            const receivablesForDebtor = prev.filter(r => r.debtor === debtorName && r.currency === currency);
            const unpaidReceivables = receivablesForDebtor.filter(r => !r.isArchived && (r.amount - r.paid) > 0);
    
            if (unpaidReceivables.length <= 1) {
                return prev;
            }
    
            const totalUnpaidAmount = unpaidReceivables.reduce((sum, r) => sum + (r.amount - r.paid), 0);
            
            const unpaidIds = unpaidReceivables.map(r => r.id);
            const mergedReceivable: Receivable = {
                id: crypto.randomUUID(),
                debtor: debtorName,
                amount: totalUnpaidAmount,
                paid: 0,
                currency,
                date: getLocalISOString(),
                isArchived: false,
                metadata: {
                    mergedFrom: unpaidIds
                }
            };
    
            const unpaidIdsSet = new Set(unpaidIds);
            const updatedPrev = prev.map(r => {
                if (unpaidIdsSet.has(r.id)) {
                    return { ...r, isArchived: true }; 
                }
                return r;
            });
    
            return [...updatedPrev, mergedReceivable];
        });
    };
    
    const convertSingleUsdDebtToLyd = (details: { 
        customerId: string; 
        debtId: string; 
        usdAmountToConvert: number;
        conversion: { rate?: number; totalLydAmount?: number; };
        destination: { type: 'existing_customer' | 'new_customer'; customerId?: string; newCustomerName?: string; }
    }) => {
        const { customerId, debtId, usdAmountToConvert, conversion, destination } = details;
    
        const customer = customers.find(c => c.id === customerId);
        const debtToConvert = customer?.debts.find(d => d.id === debtId);
    
        if (!customer || !debtToConvert || customer.currency !== Currency.USD) return;
    
        const unpaidUsdAmount = debtToConvert.amount - debtToConvert.paid;
        if (usdAmountToConvert <= 0 || usdAmountToConvert > unpaidUsdAmount) return;
    
        let lydAmount: number;
        let effectiveRate: number;
    
        if (conversion.totalLydAmount && conversion.totalLydAmount > 0) {
            lydAmount = conversion.totalLydAmount;
            effectiveRate = lydAmount / usdAmountToConvert;
        } else if (conversion.rate && conversion.rate > 0) {
            effectiveRate = conversion.rate;
            lydAmount = usdAmountToConvert * effectiveRate;
        } else {
            return;
        }

        let destinationCustomerId = destination.customerId;
        let destinationCustomerName = destination.newCustomerName;
        
        if(destination.type === 'new_customer' && destination.newCustomerName) {
            destinationCustomerId = addCustomer(destination.newCustomerName, Currency.LYD);
        } else if (destination.type === 'existing_customer' && destination.customerId) {
            destinationCustomerName = customers.find(c => c.id === destination.customerId)?.name;
        }

        if (!destinationCustomerId) return;
    
        const newLydDebt: Debt = {
            id: crypto.randomUUID(),
            amount: lydAmount,
            paid: 0,
            date: getLocalISOString(),
        };
    
        setCustomers(prev => prev.map(c => {
            if (c.id === customerId) {
                return { ...c, debts: c.debts.map(d => d.id === debtId ? { ...d, paid: d.paid + usdAmountToConvert } : d) };
            }
            if (c.id === destinationCustomerId) {
                return { ...c, debts: [...c.debts, newLydDebt] };
            }
            return c;
        }));
    
        const groupId = crypto.randomUUID();
        const groupDescription = `تحويل دين ${customer.name} من دولار إلى دينار`;
        const metadata = {
            groupId,
            groupType: 'SINGLE_DEBT_CONVERSION',
            groupDescription,
            customerId,
            originalDebtId: debtId,
            newDebtId: newLydDebt.id,
            unpaidUsdAmount: usdAmountToConvert,
            lydAmount,
            effectiveRate,
            destinationCustomerId,
            destinationCustomerName
        };
    
        addTransaction({
            type: TransactionType.DebtCollection,
            amount: usdAmountToConvert,
            currency: Currency.USD,
            description: `تحصيل جزء من دين دولار للتحويل إلى دينار`,
            relatedParty: customer.name,
            assetId: 'debt_conversion',
            groupId,
            metadata
        });
        
        addTransaction({
            type: TransactionType.NewDebt,
            amount: lydAmount,
            currency: Currency.LYD,
            description: `دين جديد بالدينار بعد تحويل ${formatCurrency(usdAmountToConvert, Currency.USD)} بسعر ${effectiveRate.toFixed(3)}`,
            relatedParty: metadata.destinationCustomerName,
            assetId: 'debt_conversion',
            groupId,
            metadata,
        });
        mergeCustomerDebts(destinationCustomerId);
    };
    
    const addCapitalHistoryEntry = (entry: CapitalHistoryEntry) => {
        setCapitalHistory(prev => [entry, ...prev].slice(0, 100));
    };

    const value: AppContextType = {
        currentUser, login, logout, hasPermission,
        users, addUser, updateUser, deleteUser,
        assets: assetsWithDerived, banks, customers, receivables, transactions, posTransactions, dollarCardPurchases, operatingCosts, expenseTypes, telegramSettings, isClosingModalOpen, dailyOpeningBalancesHistory, pendingTrades, externalValues, externalValueTransactions, capitalHistory,
        dashboardCardConfig, setDashboardCardConfig,
        sidebarConfig, setSidebarConfig,
        isSidebarCollapsed, toggleSidebar,
        isNumberFormattingEnabled, setIsNumberFormattingEnabled,
        showCapitalEvolution, setShowCapitalEvolution,
        isDetailedView, setIsDetailedView,
        addCapitalHistoryEntry, addTransaction, addBank, updateBank, deleteBank,
        addCustomer, archiveCustomer, restoreCustomer, addDebt, payDebt, archiveDebtor, restoreDebtor,
        addReceivable, payReceivable, archiveReceivable, restoreReceivable, deleteArchivedReceivable,
        getTotalDebts, getTotalReceivables,
        buyUsd, sellUsd, buyForeignCurrency, sellForeignCurrency,
        adjustAssetBalance, transferBetweenBanks, exchangeFromBankToCash, exchangeFromCashToBank, adjustBankBalance,
        addPosTransaction, archivePosTransaction, restorePosTransaction, deletePosTransaction, getPosTotalDeposits,
        getActiveDollarCardSpend, addDollarCardPurchase, updateDollarCardCustomerInfo, addPaymentToDollarCardPurchase, updateDollarCardPayment, deletePaymentFromDollarCardPurchase,
        completeDollarCardPurchase, deleteDollarCardPurchase, archiveDollarCardPurchase, restoreDollarCardPurchase,
        addExpenseType, deleteExpenseType, addOperatingCost, updateOperatingCost, deleteOperatingCost,
        showDailyClosingReport, hideDailyClosingReport, getComparisonReportData, forceCloseAndRollover,
        deleteTransactionGroup, restoreTransactionGroup, updateTransactionDate,
        updateTelegramSettings, sendTestTelegramMessage, sendDollarCardReportToTelegram,
        exportData, importData, migrateData,
        uploadAllDataToSupabase: uploadAllDataToSupabase,
        loadDataFromSupabase: loadDataFromSupabase,
        addPendingTrade, updatePendingTrade, confirmPendingTrade, deletePendingTrade, restorePendingTrade,
        addExternalValue, adjustExternalValue, deleteExternalValue, deleteExternalValueTransaction,
        mergeCustomerDebts,
        mergeDebtorReceivables,
        exchangeBetweenUsdAssets,
        exchangeBetweenEurAssets,
        toggleTransactionVisibility,
        convertSingleUsdDebtToLyd,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
