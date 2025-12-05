import React from 'react';
import { Routes, Route, Navigate, HashRouter } from 'react-router-dom';
import { AppProvider, useAppContext } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Banks from './pages/Banks';
import Debts from './pages/Debts';
import Receivables from './pages/Receivables';
import AllTransactions from './pages/AllTransactions';
import Login from './pages/Login';
import Pos from './pages/Pos';
import DollarCardPurchasePage from './pages/DollarCardPurchasePage';
import DollarCardHistoryPage from './pages/DollarCardHistoryPage';
import OperatingCosts from './pages/OperatingCosts';
import CashFlow from './pages/CashFlow';
import Users from './pages/Users';
import { User } from './types';
import TelegramSettings from './pages/TelegramSettings';
import TransactionManagement from './pages/TransactionManagement';
import DataManagementPage from './pages/DataManagementPage';
import IncompleteTrades from './pages/IncompleteTrades';
import ExternalValues from './pages/ExternalValues';
import ClosingPage from './pages/ClosingPage';
import DashboardSettings from './pages/DashboardSettings';

const PrivateRoute: React.FC<{ children: React.ReactNode, requiredPermission?: keyof User['permissions'] }> = ({ children, requiredPermission }) => {
  const { currentUser, hasPermission } = useAppContext();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  if (requiredPermission && !hasPermission(requiredPermission, 'view')) {
      return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<PrivateRoute requiredPermission="dashboard"><Dashboard /></PrivateRoute>} />
                <Route path="banks" element={<PrivateRoute requiredPermission="banks"><Banks /></PrivateRoute>} />
                <Route path="debts" element={<PrivateRoute requiredPermission="debts"><Debts /></PrivateRoute>} />
                <Route path="pos" element={<PrivateRoute requiredPermission="pos"><Pos /></PrivateRoute>} />
                <Route path="receivables" element={<PrivateRoute requiredPermission="receivables"><Receivables /></PrivateRoute>} />
                <Route path="transactions" element={<PrivateRoute requiredPermission="transactions"><AllTransactions /></PrivateRoute>} />
                <Route path="cash-flow" element={<PrivateRoute requiredPermission="cashFlow"><CashFlow /></PrivateRoute>} />
                <Route path="dollar-cards" element={<PrivateRoute requiredPermission="dollarCards"><DollarCardPurchasePage /></PrivateRoute>} />
                <Route path="dollar-card-history" element={<PrivateRoute requiredPermission="dollarCardHistory"><DollarCardHistoryPage /></PrivateRoute>} />
                <Route path="operating-costs" element={<PrivateRoute requiredPermission="operatingCosts"><OperatingCosts /></PrivateRoute>} />
                <Route path="incomplete-trades" element={<PrivateRoute requiredPermission="incompleteTrades"><IncompleteTrades /></PrivateRoute>} />
                <Route path="transaction-management" element={<PrivateRoute requiredPermission="transactionManagement"><TransactionManagement /></PrivateRoute>} />
                <Route path="users" element={<PrivateRoute requiredPermission="users"><Users /></PrivateRoute>} />
                <Route path="telegram" element={<PrivateRoute requiredPermission="telegram"><TelegramSettings /></PrivateRoute>} />
                <Route path="dashboard-settings" element={<PrivateRoute requiredPermission="dashboardSettings"><DashboardSettings /></PrivateRoute>} />
                <Route path="data-management" element={<PrivateRoute requiredPermission="dataManagement"><DataManagementPage /></PrivateRoute>} />
                <Route path="external-values" element={<PrivateRoute requiredPermission="externalValues"><ExternalValues /></PrivateRoute>} />
                <Route path="closing" element={<PrivateRoute requiredPermission="closing"><ClosingPage /></PrivateRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
