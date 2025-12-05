import React, { useState, useEffect } from 'react';
import { User, Permissions } from '../types';
import Modal from './Modal';
import { PERMISSION_CATEGORIES, generateEmptyPermissions } from '../lib/permissions';

interface UserPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSave: (user: User, isNew: boolean) => void;
}

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({ isOpen, onClose, user, onSave }) => {
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [permissions, setPermissions] = useState<Permissions>(generateEmptyPermissions());

    const isNewUser = user === null;
    const isAdmin = user?.id === 'admin-user';
    
    const inputClasses = "mt-1 w-full bg-gray-50 dark:bg-dark-bg p-2 rounded-md border border-gray-300 dark:border-dark-border focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed";
    const checkboxClasses = "h-4 w-4 text-primary dark:text-gold bg-gray-100 dark:bg-dark-bg border-gray-300 dark:border-dark-border rounded focus:ring-primary dark:focus:ring-gold";


    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName);
            setUsername(user.username);
            setPassword(''); // Don't show existing password
            setPermissions(user.permissions);
        } else {
            setDisplayName('');
            setUsername('');
            setPassword('');
            setPermissions(generateEmptyPermissions());
        }
    }, [user, isOpen]);

    const handlePermissionChange = (category: keyof Permissions, permission: string, value: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [permission]: value
            }
        }));
    };

    const handleCategoryChange = (category: keyof Permissions, value: boolean) => {
        const newCategoryPermissions: { [key: string]: boolean } = {};
        Object.keys(PERMISSION_CATEGORIES[category].permissions).forEach(key => {
            newCategoryPermissions[key] = value;
        });

        setPermissions(prev => ({
            ...prev,
            [category]: newCategoryPermissions
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const passwordToSave = password || user?.password;
        if (isNewUser && !password) {
            alert('يجب إدخال كلمة مرور للمستخدم الجديد.');
            return;
        }

        onSave({
            id: user?.id || '',
            displayName,
            username,
            password: passwordToSave,
            permissions
        }, isNewUser);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNewUser ? 'إضافة مستخدم جديد' : `تعديل المستخدم: ${user.displayName}`} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم المعروض</label>
                        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required className={inputClasses}/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المستخدم (للدخول)</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required disabled={isAdmin} className={inputClasses}/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isNewUser ? 'مطلوبة' : 'اتركها فارغة لعدم التغيير'} required={isNewUser} className={inputClasses}/>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">الصلاحيات</h3>
                    {isAdmin ? (
                        <p className="text-center p-4 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded-md">
                            المدير العام يمتلك جميع الصلاحيات ولا يمكن تعديلها.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[40vh] overflow-y-auto p-4 bg-gray-50 dark:bg-dark-bg rounded-lg">
                            {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => {
                                const categoryKey = catKey as keyof Permissions;
                                const categoryPermissions = permissions[categoryKey];
                                const allChecked = categoryPermissions && Object.values(categoryPermissions).every(p => p === true);

                                return (
                                <div key={categoryKey} className="p-3 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card">
                                    <div className="flex items-center border-b border-gray-200 dark:border-dark-border pb-2 mb-2">
                                        <input
                                            type="checkbox"
                                            id={`cat-${categoryKey}`}
                                            checked={allChecked}
                                            onChange={(e) => handleCategoryChange(categoryKey, e.target.checked)}
                                            className={checkboxClasses}
                                        />
                                        <label htmlFor={`cat-${categoryKey}`} className="ms-2 font-bold text-primary-dark dark:text-gold-light">
                                            {category.label}
                                        </label>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {Object.entries(category.permissions).map(([permKey, permLabel]) => (
                                            <div key={permKey} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`${categoryKey}-${permKey}`}
                                                    checked={permissions[categoryKey]?.[permKey] || false}
                                                    onChange={(e) => handlePermissionChange(categoryKey, permKey, e.target.checked)}
                                                     className={checkboxClasses}
                                                />
                                                <label htmlFor={`${categoryKey}-${permKey}`} className="ms-2 text-gray-600 dark:text-gray-300">
                                                    {permLabel}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                    {!isAdmin && (
                        <button type="submit" className="px-4 py-2 bg-primary dark:bg-gradient-to-r from-gold-dark to-gold text-white dark:text-black font-bold rounded-lg hover:bg-primary-dark dark:hover:opacity-90">
                            {isNewUser ? 'حفظ المستخدم' : 'حفظ التعديلات'}
                        </button>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export default UserPermissionsModal;