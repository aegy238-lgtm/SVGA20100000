
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRecord, AppSettings } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface HeaderProps {
  onLogoClick: () => void;
  isAdmin: boolean;
  currentUser: UserRecord | null;
  settings: AppSettings | null;
  onAdminToggle: () => void;
  onLogout: () => void;
  isAdminOpen: boolean;
  onBatchOpen: () => void;
  onStoreOpen: () => void;
  onConverterOpen?: () => void;
  onImageConverterOpen?: () => void;
  onImageEditorOpen?: () => void;
  onLoginClick?: () => void;
  currentTab?: 'svga' | 'batch' | 'store' | 'converter' | 'image-converter' | 'image-editor';
}

export const Header: React.FC<HeaderProps> = ({ 
  onLogoClick, currentUser, settings, onBatchOpen, onStoreOpen, onConverterOpen, onImageConverterOpen, onImageEditorOpen, onLoginClick, currentTab, isAdmin, onAdminToggle, onLogout
}) => {
  const { language, setLanguage } = useLanguage();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRedeemKey = async () => {
    if (!licenseKey || !currentUser) return;
    setLoading(true);
    try {
      // 1. Find Key
      const q = query(collection(db, 'licenseKeys'), where('key', '==', licenseKey), where('isUsed', '==', false));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert("الكود غير صحيح أو مستخدم مسبقاً");
        setLoading(false);
        return;
      }

      const keyDoc = snapshot.docs[0];
      const keyData = keyDoc.data();

      // 2. Calculate Expiry
      const now = new Date();
      let expiry = new Date();
      if (keyData.duration === 'day') expiry.setDate(now.getDate() + 1);
      else if (keyData.duration === 'week') expiry.setDate(now.getDate() + 7);
      else if (keyData.duration === 'month') expiry.setMonth(now.getMonth() + 1);
      else if (keyData.duration === 'year') expiry.setFullYear(now.getFullYear() + 1);

      // 3. Update User
      await updateDoc(doc(db, 'users', currentUser.id), {
        isVIP: true,
        subscriptionType: keyData.duration,
        subscriptionExpiry: expiry,
        activatedKey: licenseKey
      });

      // 4. Mark Key Used
      await updateDoc(doc(db, 'licenseKeys', keyDoc.id), {
        isUsed: true,
        usedBy: currentUser.id,
        usedAt: now
      });

      alert("تم تفعيل الاشتراك بنجاح! قم بتحديث الصفحة.");
      setIsKeyModalOpen(false);
      window.location.reload();

    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء التفعيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-20 z-50 transition-all duration-300 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div 
              onClick={onLogoClick}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                {settings?.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-xl">S</span>
                )}
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
              <button 
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
              >
                {language === 'ar' ? 'EN' : 'AR'}
              </button>
              <button onClick={onLogoClick} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTab === 'svga' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-500 hover:text-white'}`}>SVGA</button>
              <button onClick={onConverterOpen} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTab === 'converter' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-500 hover:text-white'}`}>Video to SVGA</button>
              <button onClick={onImageConverterOpen} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTab === 'image-converter' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-white'}`}>Images to SVGA</button>
              <button onClick={onImageEditorOpen} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTab === 'image-editor' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-slate-500 hover:text-white'}`}>Image Editor</button>
              <button onClick={onBatchOpen} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTab === 'batch' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-slate-500 hover:text-white'}`}>Compressor</button>
              <button onClick={onStoreOpen} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTab === 'store' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </button>
              {isAdmin && (
                <button onClick={onAdminToggle} className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20">
                  Admin
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!currentUser ? (
              <button 
                onClick={onLoginClick}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-glow-sky transition-all"
              >
                تسجيل الدخول
              </button>
            ) : (
              <>
                {currentUser && !currentUser.isVIP && (
                  <button 
                    onClick={() => setIsKeyModalOpen(true)}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-all shadow-glow-sky"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">تفعيل اشتراك</span>
                  </button>
                )}

                {currentUser?.isVIP && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">VIP Access</span>
                    <span className="text-[10px] text-amber-500/70 font-mono">
                      {currentUser.subscriptionType}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm font-bold text-white">{currentUser.name}</span>
                      {(currentUser.isVIP || currentUser.role === 'admin') && (
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-4-3.99-4-.485 0-.96.084-1.4.238C14.45 2.375 13.08 1.5 11.5 1.5c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.71-4 3.99 0 .485.084.96.238 1.4C1.375 9.55.5 10.92.5 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 4 3.99 4 .485 0 .96-.084 1.4-.238C8.55 22.625 9.92 23.5 11.5 23.5c1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.71 4-3.99 0-.485-.084-.96-.238-1.4C21.625 15.45 22.5 14.08 22.5 12.5zM9.04 17.41l-4.59-4.59 1.42-1.41 3.17 3.17 8.17-8.17 1.42 1.41-9.59 9.59z"/>
                        </svg>
                      )}
                    </div>
                    {currentUser.email && <span className="text-[10px] text-slate-400 block">{currentUser.email}</span>}
                  </div>
                  
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-white font-bold shadow-lg">
                      {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {(currentUser.isVIP || currentUser.role === 'admin') && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-[1px] shadow-sm">
                        <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-4-3.99-4-.485 0-.96.084-1.4.238C14.45 2.375 13.08 1.5 11.5 1.5c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.71-4 3.99 0 .485.084.96.238 1.4C1.375 9.55.5 10.92.5 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 4 3.99 4 .485 0 .96-.084 1.4-.238C8.55 22.625 9.92 23.5 11.5 23.5c1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.71 4-3.99 0-.485-.084-.96-.238-1.4C21.625 15.45 22.5 14.08 22.5 12.5zM9.04 17.41l-4.59-4.59 1.42-1.41 3.17 3.17 8.17-8.17 1.42 1.41-9.59 9.59z"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={onLogout}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"
                    title="تسجيل الخروج"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Key Redemption Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-white mb-2 text-center">تفعيل الاشتراك</h3>
            <p className="text-slate-500 text-xs text-center mb-6">أدخل كود التفعيل للحصول على صلاحيات VIP</p>
            
            <input 
              type="text" 
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="KEY-XXXXXXXX-XXXX"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-center font-mono tracking-widest mb-6 outline-none focus:border-sky-500 transition-all"
            />

            <div className="flex gap-4">
              <button 
                onClick={handleRedeemKey}
                disabled={loading || !licenseKey}
                className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-sm transition-all shadow-glow-sky disabled:opacity-50"
              >
                {loading ? 'جاري التحقق...' : 'تفعيل'}
              </button>
              <button 
                onClick={() => setIsKeyModalOpen(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl font-black text-sm transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
