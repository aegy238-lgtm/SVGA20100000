
import React, { useState, useEffect } from 'react';
import { UserRecord, StoreProduct, AppSettings, LicenseKey, ActivityLog, StoreCategory, SubscriptionType, PresetBackground } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { MOCK_PRODUCTS } from '../constants';

interface AdminPanelProps {
  currentUser: UserRecord | null;
  onCancel: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'store' | 'keys' | 'settings' | 'logs' | 'backgrounds'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [backgrounds, setBackgrounds] = useState<PresetBackground[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Store Form State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<StoreProduct>>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);

  const FORMAT_OPTIONS = ['SVGA', 'Lottie', 'DotLottie', 'GIF', 'WebP', 'APNG', 'MP4', 'WebM', 'MOV', 'VAP'];
  const DEFAULT_CATEGORIES = ['الطفل', 'إطارات', 'دخوليات', 'هدايا', 'VIP'];

  // Background Form State
  const [newBgLabel, setNewBgLabel] = useState('');
  const [newBgUrl, setNewBgUrl] = useState('');

  // Key Generation State
  const [keyDuration, setKeyDuration] = useState<SubscriptionType>('month');
  const [keyCount, setKeyCount] = useState(1);

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'store') { fetchProducts(); fetchCategories(); }
    else if (activeTab === 'keys') fetchKeys();
    else if (activeTab === 'logs') fetchLogs();
    else if (activeTab === 'backgrounds') fetchBackgrounds();
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      } else {
        // Default settings
        const defaults: AppSettings = {
          appName: 'SVGA Genius',
          logoUrl: '',
          backgroundUrl: '',
          whatsappNumber: '',
          isRegistrationOpen: true,
          defaultFreeAttempts: 3,
          costs: { svgaProcess: 0, batchCompress: 0, vipPrice: 0 }
        };
        setSettings(defaults);
      }
    } catch (e) { console.error(e); }
  };

  const saveSettings = async () => {
    if (!settings) return;
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert("تم حفظ الإعدادات بنجاح");
      window.location.reload(); // Reload to reflect changes immediately
    } catch (e) { alert("فشل حفظ الإعدادات"); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList: UserRecord[] = [];
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as UserRecord);
      });
      setUsers(usersList);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("فشل جلب المستخدمين.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsList: StoreProduct[] = [];
      querySnapshot.forEach((doc) => {
        productsList.push({ id: doc.id, ...doc.data() } as StoreProduct);
      });
      setProducts(productsList);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const list: StoreCategory[] = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as StoreCategory));
      setCategories(list.sort((a, b) => a.order - b.order));
    } catch (e) { console.error(e); }
  };

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'licenseKeys'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list: LicenseKey[] = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as LicenseKey));
      setKeys(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc')); // Limit in real app
      const querySnapshot = await getDocs(q);
      const list: ActivityLog[] = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchBackgrounds = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'preset_backgrounds'));
      const list: PresetBackground[] = [];
      querySnapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as PresetBackground));
      setBackgrounds(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const generateKeys = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      for (let i = 0; i < keyCount; i++) {
        const keyString = `KEY-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now().toString().substr(-4)}`;
        const newKey: LicenseKey = {
          id: `key_${Date.now()}_${i}`,
          key: keyString,
          duration: keyDuration,
          isUsed: false,
          createdAt: new Date(),
          createdBy: currentUser.id
        };
        await setDoc(doc(db, 'licenseKeys', newKey.id), newKey);
      }
      fetchKeys();
      alert(`تم توليد ${keyCount} كود بنجاح`);
    } catch (e) { alert("فشل توليد الأكواد"); } finally { setLoading(false); }
  };

  const toggleUserBan = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
    } catch (err) { alert("فشل تحديث حالة المستخدم"); }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName,
        order: categories.length
      });
      setNewCategoryName('');
      fetchCategories();
    } catch (e) { alert("فشل إضافة القسم"); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("حذف القسم؟")) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      fetchCategories();
    } catch (e) { alert("فشل الحذف"); }
  };

  const handleAddBackground = async () => {
    if (!newBgLabel || !newBgUrl) return;
    try {
      await addDoc(collection(db, 'preset_backgrounds'), {
        label: newBgLabel,
        url: newBgUrl,
        createdAt: new Date()
      });
      setNewBgLabel('');
      setNewBgUrl('');
      fetchBackgrounds();
    } catch (e) { alert("فشل إضافة الخلفية"); }
  };

  const handleDeleteBackground = async (id: string) => {
    if (!confirm("حذف الخلفية؟")) return;
    try {
      await deleteDoc(doc(db, 'preset_backgrounds', id));
      fetchBackgrounds();
    } catch (e) { alert("فشل الحذف"); }
  };

  const handleSaveProduct = async () => {
    if (!currentProduct.name || !currentProduct.price) return;
    try {
      const productData = {
        ...currentProduct,
        supportedFormats: selectedFormats.length > 0 ? selectedFormats : ['MP4'],
        updatedAt: new Date()
      };

      if (currentProduct.id) {
        const { id, ...data } = productData;
        await updateDoc(doc(db, 'products', id!), data);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date()
        });
      }
      setIsEditingProduct(false);
      setCurrentProduct({});
      setSelectedFormats([]);
      fetchProducts();
    } catch (err) { alert("فشل حفظ المنتج"); }
  };

  const openProductEdit = (product: StoreProduct) => {
    setCurrentProduct(product);
    setSelectedFormats(product.supportedFormats || []);
    setIsEditingProduct(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (err) { alert("فشل حذف المنتج"); }
  };

  return (
    <div className="animate-in fade-in zoom-in duration-500 font-arabic text-right pb-20" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">لوحة التحكم الشاملة</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">الإدارة والاشتراكات</p>
        </div>
        <button onClick={onCancel} className="p-3 hover:bg-white/10 rounded-xl transition-all text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
        {[
          { id: 'users', label: 'المستخدمين' },
          { id: 'keys', label: 'أكواد الاشتراك' },
          { id: 'store', label: 'المتجر والأقسام' },
          { id: 'backgrounds', label: 'خلفيات العمل' },
          { id: 'settings', label: 'الإعدادات العامة' },
          { id: 'logs', label: 'سجلات النشاط' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-sky-500 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 min-h-[500px]">
        {loading && <div className="text-center py-10 text-sky-500 font-black">جاري التحميل...</div>}
        
        {!loading && activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/10">
                  <th className="pb-4 pr-4">المستخدم</th>
                  <th className="pb-4">الاشتراك</th>
                  <th className="pb-4">المحاولات</th>
                  <th className="pb-4">الحالة</th>
                  <th className="pb-4 pl-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-300">
                {users.map(user => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="font-bold text-white flex items-center gap-1">
                        {user.name}
                        {(user.isVIP || user.role === 'admin') && (
                          <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-4-3.99-4-.485 0-.96.084-1.4.238C14.45 2.375 13.08 1.5 11.5 1.5c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.71-4 3.99 0 .485.084.96.238 1.4C1.375 9.55.5 10.92.5 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 4 3.99 4 .485 0 .96-.084 1.4-.238C8.55 22.625 9.92 23.5 11.5 23.5c1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.71 4-3.99 0-.485-.084-.96-.238-1.4C21.625 15.45 22.5 14.08 22.5 12.5zM9.04 17.41l-4.59-4.59 1.42-1.41 3.17 3.17 8.17-8.17 1.42 1.41-9.59 9.59z"/>
                          </svg>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{user.email}</div>
                    </td>
                    <td className="py-4">
                      {user.isVIP ? (
                        <span className="text-emerald-400 font-black">{user.subscriptionType}</span>
                      ) : (
                        <span className="text-slate-500">مجاني</span>
                      )}
                    </td>
                    <td className="py-4 font-mono text-sky-400">{user.freeAttempts}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 pl-4">
                      <button onClick={() => toggleUserBan(user.id, user.status)} className="text-red-400 hover:text-red-300 text-[10px] font-black border border-red-500/20 px-3 py-1 rounded-lg">
                        {user.status === 'banned' ? 'فك الحظر' : 'حظر'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeTab === 'keys' && (
          <div className="space-y-8">
            <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/10 flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase">مدة الاشتراك</label>
                <select value={keyDuration} onChange={(e) => setKeyDuration(e.target.value as any)} className="bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none w-40">
                  <option value="day">يوم واحد</option>
                  <option value="week">أسبوع</option>
                  <option value="month">شهر</option>
                  <option value="year">سنة</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase">العدد</label>
                <input type="number" value={keyCount} onChange={(e) => setKeyCount(parseInt(e.target.value))} className="bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none w-24 text-center" />
              </div>
              <button onClick={generateKeys} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all shadow-glow-emerald">
                توليد الأكواد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {keys.map(key => (
                <div key={key.id} className={`p-4 rounded-2xl border ${key.isUsed ? 'bg-slate-900/30 border-white/5 opacity-50' : 'bg-slate-900/80 border-sky-500/30'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-sm font-black text-white tracking-wider">{key.key}</span>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${key.isUsed ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {key.isUsed ? 'مستخدم' : 'جديد'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>المدة: {key.duration}</span>
                    <span>{key.createdAt?.toDate?.().toLocaleDateString() || 'Now'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activeTab === 'store' && (
          <div className="space-y-8">
            <div className="flex gap-4 items-end bg-slate-950/50 p-6 rounded-3xl border border-white/10">
              <div className="flex-1 space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase">إضافة قسم جديد</label>
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none" placeholder="مثال: إطارات، بقوليات، هدايا..." />
              </div>
              <button onClick={handleAddCategory} className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-black text-xs">إضافة</button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Show Default Categories as read-only chips */}
              {DEFAULT_CATEGORIES.map(cat => (
                 <div key={cat} className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3 opacity-70">
                   <span className="text-white text-xs font-bold">{cat}</span>
                   <span className="text-[8px] text-slate-500">(افتراضي)</span>
                 </div>
              ))}
              {/* Show DB Categories with delete option */}
              {categories.map(cat => (
                <div key={cat.id} className="px-4 py-2 bg-sky-500/10 rounded-xl border border-sky-500/20 flex items-center gap-3">
                  <span className="text-white text-xs font-bold">{cat.name}</span>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-400">×</button>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black text-lg">المنتجات</h3>
                <button onClick={() => { setCurrentProduct({}); setSelectedFormats([]); setIsEditingProduct(true); }} className="px-6 py-2 bg-sky-500 text-white rounded-xl font-black text-xs">+ منتج جديد</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <div key={product.id} className="bg-slate-950/50 border border-white/10 rounded-3xl p-6 relative group">
                    <h4 className="text-white font-bold">{product.name}</h4>
                    <p className="text-slate-500 text-xs mb-2">{product.category}</p>
                    <div className="text-sky-400 font-black">${product.price}</div>
                    <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openProductEdit(product)} className="p-2 bg-white/10 rounded-lg text-white">✎</button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'backgrounds' && (
          <div className="space-y-8">
            <div className="flex gap-4 items-end bg-slate-950/50 p-6 rounded-3xl border border-white/10">
              <div className="flex-1 space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase">اسم الخلفية</label>
                <input type="text" value={newBgLabel} onChange={(e) => setNewBgLabel(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none" placeholder="مثال: خلفية حمراء" />
              </div>
              <div className="flex-[2] space-y-2">
                <label className="text-slate-500 text-[10px] font-black uppercase">رابط الصورة (URL)</label>
                <input type="text" value={newBgUrl} onChange={(e) => setNewBgUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs outline-none" placeholder="https://..." />
              </div>
              <button onClick={handleAddBackground} className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-black text-xs">إضافة</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {backgrounds.map(bg => (
                <div key={bg.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10">
                  <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                    <span className="text-white text-xs font-bold mb-2">{bg.label}</span>
                    <button onClick={() => handleDeleteBackground(bg.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white">
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activeTab === 'settings' && settings && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase">اسم التطبيق</label>
              <input type="text" value={settings.appName} onChange={(e) => setSettings({...settings, appName: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase">رابط اللوجو (URL)</label>
              <input type="text" value={settings.logoUrl} onChange={(e) => setSettings({...settings, logoUrl: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase">رابط الخلفية (URL)</label>
              <input type="text" value={settings.backgroundUrl} onChange={(e) => setSettings({...settings, backgroundUrl: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase">رقم الواتساب (للمتجر)</label>
              <input type="text" value={settings.whatsappNumber} onChange={(e) => setSettings({...settings, whatsappNumber: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white" placeholder="966500000000" />
            </div>
            <div className="space-y-2">
              <label className="text-slate-500 text-[10px] font-black uppercase">عدد المحاولات المجانية الافتراضي</label>
              <input type="number" value={settings.defaultFreeAttempts} onChange={(e) => setSettings({...settings, defaultFreeAttempts: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white" />
            </div>
            <button onClick={saveSettings} className="w-full py-4 bg-sky-500 text-white rounded-2xl font-black text-sm shadow-glow-sky">حفظ التغييرات</button>
          </div>
        )}

        {!loading && activeTab === 'logs' && (
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div>
                  <div className="text-white font-bold text-xs">{log.action}</div>
                  <div className="text-slate-500 text-[10px]">{log.details}</div>
                </div>
                <div className="text-right">
                  <div className="text-sky-400 text-[10px] font-black">{log.userName}</div>
                  <div className="text-slate-600 text-[9px]">{log.timestamp?.toDate?.().toLocaleString() || '---'}</div>
                </div>
              </div>
            ))}
            {logs.length === 0 && <div className="text-center text-slate-500 text-xs">لا توجد سجلات</div>}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {isEditingProduct && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-white mb-6">{currentProduct.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <input type="text" placeholder="اسم المنتج" value={currentProduct.name || ''} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <input type="number" placeholder="السعر" value={currentProduct.price || ''} onChange={e => setCurrentProduct({...currentProduct, price: Number(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm" />
              
              <div className="space-y-2">
                <label className="block text-slate-500 text-[10px] font-black uppercase">القسم</label>
                <select 
                  value={currentProduct.category || ''} 
                  onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none"
                >
                  <option value="">اختر القسم...</option>
                  {/* Merge default categories with DB categories, removing duplicates */}
                  {Array.from(new Set([...DEFAULT_CATEGORIES, ...categories.map(c => c.name)])).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <textarea placeholder="الوصف" value={currentProduct.description || ''} onChange={e => setCurrentProduct({...currentProduct, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm h-24" />
              <input type="text" placeholder="رابط الصورة" value={currentProduct.imageUrl || ''} onChange={e => setCurrentProduct({...currentProduct, imageUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <input type="text" placeholder="رابط الفيديو" value={currentProduct.videoUrl || ''} onChange={e => setCurrentProduct({...currentProduct, videoUrl: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm" />
              
              <div>
                <label className="block text-slate-500 text-[10px] font-black uppercase mb-2">صيغ الملفات المتاحة</label>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map(format => (
                    <button
                      key={format}
                      onClick={() => {
                        if (selectedFormats.includes(format)) {
                          setSelectedFormats(selectedFormats.filter(f => f !== format));
                        } else {
                          setSelectedFormats([...selectedFormats, format]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                        selectedFormats.includes(format) 
                          ? 'bg-sky-500 text-white border-sky-400' 
                          : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={handleSaveProduct} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-black text-sm">حفظ</button>
              <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl font-black text-sm">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
