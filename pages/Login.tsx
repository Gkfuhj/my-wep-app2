import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { KeyRound, User, Sun, Moon } from 'lucide-react';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAppContext();
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const ok = await login(username, password);
        if (ok) {
            setTimeout(() => {
                try {
                    navigate('/dashboard', { replace: true });
                } catch (_) {
                    window.location.hash = '#/dashboard';
                }
            }, 50);
        } else {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-dark-bg p-4 transition-colors duration-300">
            <div className="absolute top-5 end-5">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-gray-200 dark:bg-dark-card text-gray-600 dark:text-gold hover:bg-gray-300 dark:hover:bg-opacity-80 transition-all"
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-dark-card rounded-2xl shadow-2xl shadow-black/5 dark:shadow-black/30 border border-gray-200 dark:border-dark-border transition-colors duration-300">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-dark dark:from-gold-light dark:to-gold">شركة الخزينة الحديثه للبرمجة </h1>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">يرجى تسجيل الدخول للمتابعة</p>
                </div>
                {error && <p className="text-sm text-red-500 dark:text-red-400 text-center bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label
                            htmlFor="username"
                            className="text-sm font-bold text-gray-600 dark:text-gray-400 block mb-2"
                        >
                            اسم المستخدم
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400 dark:text-gray-500">
                                <User className="w-5 h-5" />
                            </span>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                                className="block w-full ps-12 p-3 bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-200 text-sm rounded-lg focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold transition"
                                placeholder="e.g. admin"
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="text-sm font-bold text-gray-600 dark:text-gray-400 block mb-2"
                        >
                            كلمة المرور
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400 dark:text-gray-500">
                                <KeyRound className="w-5 h-5" />
                            </span>
                             <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="block w-full ps-12 p-3 bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-800 dark:text-gray-200 text-sm rounded-lg focus:ring-primary dark:focus:ring-gold focus:border-primary dark:focus:border-gold transition"
                                placeholder="************"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-3 text-white dark:text-black text-base font-bold bg-primary hover:bg-primary-dark dark:bg-gradient-to-r dark:from-gold-dark dark:via-gold dark:to-gold-light rounded-lg dark:hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-gold focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-card transition-all shadow-lg shadow-primary/20 dark:shadow-gold/20"
                        >
                            دخول
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
