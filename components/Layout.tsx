import React from 'react';
import { Outlet } from 'react-router';
import Sidebar from './Sidebar';
import Header from './Header';
import DailyClosingModal from './DailyClosingModal';
import { useAppContext } from '../contexts/AppContext';

const Layout: React.FC = () => {
    const { isClosingModalOpen, hideDailyClosingReport } = useAppContext();
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-dark-bg text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-dark-bg p-6">
                    <div className="container mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
            <DailyClosingModal isOpen={isClosingModalOpen} onClose={hideDailyClosingReport} />
        </div>
    );
};

export default Layout;