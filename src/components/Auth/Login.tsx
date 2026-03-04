import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginProps {
  onToggle: () => void;
}

export const Login: React.FC<LoginProps> = ({ onToggle }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = 'فشل تسجيل الدخول.';
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'تم حظر الوصول مؤقتاً بسبب تكرار المحاولات الفاشلة. يرجى المحاولة لاحقاً.';
      } else if (err.code === 'auth/configuration-not-found') {
        msg = 'خطأ في إعدادات المصادقة. يرجى التحقق من تفعيل تسجيل الدخول بالبريد الإلكتروني في Firebase Console.';
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <span className="text-white font-black text-2xl">S</span>
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">تسجيل الدخول</h2>
            <p className="text-slate-400 text-sm">مرحباً بك مجدداً في SVGA Armed Designer</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all"
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري التحميل...' : 'دخول'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              ليس لديك حساب؟{' '}
              <button
                onClick={onToggle}
                className="text-sky-400 hover:text-sky-300 font-bold transition-colors"
              >
                إنشاء حساب جديد
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
