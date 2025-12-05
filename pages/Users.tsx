import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { User } from '../types';
import { Plus, Edit, Trash2 } from 'lucide-react';
import UserPermissionsModal from '../components/UserPermissionsModal';
import ConfirmationModal from '../components/ConfirmationModal';

const Users: React.FC = () => {
    const { users, addUser, updateUser, deleteUser, hasPermission } = useAppContext();
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [confirmationState, setConfirmationState] = useState<{
        isOpen: boolean;
        userId: string | null;
        message: string;
    }>({ isOpen: false, userId: null, message: '' });

    const openModalForNew = () => {
        setEditingUser(null);
        setIsPermissionsModalOpen(true);
    };

    const openModalForEdit = (user: User) => {
        setEditingUser(user);
        setIsPermissionsModalOpen(true);
    };

    const handleSaveUser = (user: User, isNew: boolean) => {
        if (isNew) {
            const { id, ...newUser } = user;
            addUser(newUser);
        } else {
            updateUser(user.id, user);
        }
        setIsPermissionsModalOpen(false);
    };

    const handleDeleteUser = (userId: string) => {
        setConfirmationState({
            isOpen: true,
            userId: userId,
            message: 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.',
        });
    };

    const onConfirmDelete = () => {
        if (confirmationState.userId) {
            deleteUser(confirmationState.userId);
        }
    };

    const closeConfirmationModal = () => {
        setConfirmationState({ isOpen: false, userId: null, message: '' });
    };

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 dark:border-dark-border">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">إدارة المستخدمين</h2>
                {hasPermission('users', 'add') && (
                    <button onClick={openModalForNew} className="flex items-center gap-2 px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90 transition-opacity">
                        <Plus size={18} /> إضافة مستخدم جديد
                    </button>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-black/20 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">الاسم المعروض</th>
                            <th scope="col" className="px-6 py-3">اسم المستخدم</th>
                            <th scope="col" className="px-6 py-3">الدور</th>
                            <th scope="col" className="px-6 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">{user.displayName}</td>
                                <td className="px-6 py-4 font-mono">{user.username}</td>
                                <td className="px-6 py-4">
                                    {user.id === 'admin-user' ? 
                                        <span className="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 dark:text-red-300 dark:bg-red-900/50 rounded-full">مدير عام</span> : 
                                        <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/50 rounded-full">مستخدم</span>
                                    }
                                </td>
                                <td className="px-6 py-4 flex gap-3">
                                    {hasPermission('users', 'edit') && (
                                        <button onClick={() => openModalForEdit(user)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300" title="تعديل"><Edit size={18} /></button>
                                    )}
                                    {hasPermission('users', 'delete') && user.id !== 'admin-user' && (
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" title="حذف"><Trash2 size={18} /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isPermissionsModalOpen && (
                <UserPermissionsModal
                    isOpen={isPermissionsModalOpen}
                    onClose={() => setIsPermissionsModalOpen(false)}
                    user={editingUser}
                    onSave={handleSaveUser}
                />
            )}
             <ConfirmationModal
                isOpen={confirmationState.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={onConfirmDelete}
                title="تأكيد حذف المستخدم"
                message={confirmationState.message}
                confirmText="حذف"
            />
        </div>
    );
};

export default Users;