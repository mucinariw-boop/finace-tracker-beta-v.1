import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, AlertCircle, RefreshCw, Save, Target, Wallet, BarChart3, 
  Settings2, ListFilter, History, ArrowUpDown, Trash2, PieChart as PieIcon, 
  LayoutDashboard, Database, X, PlusCircle, Bot, Sparkles, LogOut, User, Lock, Mail, Key, CloudDownload
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Inisialisasi Auth
let auth;
try {
  if (typeof __firebase_config !== 'undefined') {
    const app = initializeApp(JSON.parse(__firebase_config));
    auth = getAuth(app);
  }
} catch (e) {
  console.warn("Firebase tidak tersedia.");
}

const MASTER_ACCOUNTS = ["Kas Tunai", "BCA", "Mandiri", "GoPay", "OVO"];
const DEFAULT_INCOME_CATS = ["Gaji Utama", "Freelance", "Investasi", "Bonus", "Lain-lain"];
const DEFAULT_EXPENSE_CATS = ["Makan & Minum", "Transportasi", "Tagihan", "Hiburan", "Keluarga"];
const CHART_COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#3b82f6'];
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbycOz_48bYCbKtcbKsTfO4M4KhrMOnUIZxTpwc1y0f7BhsFftsLsj0_v_SAqKLmdMzYvA/exec';

export default function App() {
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('pft_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ nama: '', email: '', password: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ type: '', message: '' });
  
  // UI Enhancements (Feedback Tester)
  const [showWelcome, setShowWelcome] = useState(false); 

  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('pft_api_url') || DEFAULT_API_URL);
  const [isApiSetupOpen, setIsApiSetupOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const storageKeys = useMemo(() => ({
    tx: `pft_tx_${authUser?.id || 'guest'}`,
    budget: `pft_budget_${authUser?.id || 'guest'}`
  }), [authUser]);
  
  const [customIncomeCats, setCustomIncomeCats] = useState([]);
  const [customExpenseCats, setCustomExpenseCats] = useState([]);
  const [customAccounts, setCustomAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [manualBudgets, setManualBudgets] = useState({});

  // Fungsi Load Data Transaksi
  const fetchCloudData = async (user, url) => {
    if (!url || !user) return;
    setIsSyncing(true);
    setSyncStatus({ type: 'info', message: 'Menyinkronkan data...' });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'getData', memberId: user.id })
      });
      const resData = await response.json();
      
      if (resData.status === 'success') {
        setTransactions(resData.data);
        localStorage.setItem(`pft_tx_${user.id}`, JSON.stringify(resData.data));
        setSyncStatus({ type: 'success', message: 'Data mutakhir!' });
      } else {
        setSyncStatus({ type: 'error', message: resData.message });
      }
    } catch (err) {
      setSyncStatus({ type: 'error', message: 'Gagal menarik data server.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus({ type: '', message: '' }), 3000);
    }
  };

  // Fungsi Load Data Pengaturan (Kategori & Akun Kustom) dari Database Sheet
  const fetchSetupFromCloud = async (user, url) => {
    if (!url || !user) return;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'get_setup', id_member: user.id })
      });
      const resData = await response.json();
      
      if (resData.data) {
        const setup = JSON.parse(resData.data);
        if (setup.kategoriPemasukan) setCustomIncomeCats(setup.kategoriPemasukan);
        if (setup.kategoriPengeluaran) setCustomExpenseCats(setup.kategoriPengeluaran);
        if (setup.akun) setCustomAccounts(setup.akun);
      }
    } catch (err) {
      console.error('Gagal mengambil pengaturan dari cloud', err);
    }
  };

  // Fungsi Save Data Pengaturan ke Database Sheet
  const saveSetupToCloud = async (incCats, expCats, accs) => {
    if (!authUser || !apiUrl) return;
    const dataPengaturan = {
      kategoriPemasukan: incCats,
      kategoriPengeluaran: expCats,
      akun: accs
    };
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'save_setup', 
          id_member: authUser.id, 
          data_setup: JSON.stringify(dataPengaturan) 
        })
      });
    } catch (err) {
      console.error('Gagal menyimpan pengaturan ke cloud', err);
    }
  };

  useEffect(() => {
    if (authUser) {
      const savedTx = localStorage.getItem(storageKeys.tx);
      if (savedTx) setTransactions(JSON.parse(savedTx));
      const savedBudget = localStorage.getItem(storageKeys.budget);
      setManualBudgets(savedBudget ? JSON.parse(savedBudget) : {});

      fetchSetupFromCloud(authUser, apiUrl); // Tarik kategori kustom per user
      fetchCloudData(authUser, apiUrl);      // Tarik transaksi
    }
  }, [authUser, apiUrl, storageKeys]);

  useEffect(() => { localStorage.setItem('pft_api_url', apiUrl); }, [apiUrl]);
  useEffect(() => { if (authUser) localStorage.setItem('pft_auth_user', JSON.stringify(authUser)); }, [authUser]);
  useEffect(() => { if (authUser && !isSyncing) localStorage.setItem(storageKeys.tx, JSON.stringify(transactions)); }, [transactions, authUser, storageKeys, isSyncing]);
  useEffect(() => { if (authUser) localStorage.setItem(storageKeys.budget, JSON.stringify(manualBudgets)); }, [manualBudgets, authUser, storageKeys]);

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('Pengeluaran');
  const [newAccName, setNewAccName] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterKategori, setFilterKategori] = useState('');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const allIncomeCats = useMemo(() => [...DEFAULT_INCOME_CATS, ...customIncomeCats], [customIncomeCats]);
  const allExpenseCats = useMemo(() => [...DEFAULT_EXPENSE_CATS, ...customExpenseCats], [customExpenseCats]);
  const allAccounts = useMemo(() => [...MASTER_ACCOUNTS, ...customAccounts], [customAccounts]);

  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    tipe: 'Pengeluaran',
    kategori: allExpenseCats[0],
    dariAkun: MASTER_ACCOUNTS[0],
    keAkun: '',
    nominal: '',
    keterangan: ''
  });

  // Interstitial animasi saat berhasil login
  const triggerWelcomeFlow = () => {
    setShowWelcome(true);
    setTimeout(() => {
      setShowWelcome(false);
      setActiveTab('dashboard');
    }, 1800);
  };

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthStatus({ type: 'info', message: 'Memproses otentikasi Google...' });
    
    if (!auth) {
      setTimeout(() => {
        const demoUser = { id: 'g_user_' + Date.now(), nama: 'Pengguna Google', email: 'user@google.com' };
        setAuthUser(demoUser);
        setAuthStatus({ type: '', message: '' });
        setIsAuthLoading(false);
        triggerWelcomeFlow();
      }, 1000);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const appUser = { id: user.uid, nama: user.displayName || 'Pengguna', email: user.email };
      setAuthUser(appUser);
      setAuthStatus({ type: '', message: '' });
      triggerWelcomeFlow();
    } catch (error) {
      setAuthStatus({ type: 'error', message: `Gagal login: ${error.message}` });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!apiUrl) return setAuthStatus({ type: 'error', message: 'API URL belum diatur!' });
    
    setIsAuthLoading(true);
    setAuthStatus({ type: 'info', message: 'Memeriksa kredensial...' });

    try {
      const payload = { action: authMode, ...authForm };
      const response = await fetch(apiUrl, { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      
      if (data.status === 'success') {
        setAuthUser(data.member);
        setAuthStatus({ type: '', message: '' });
        triggerWelcomeFlow();
      } else {
        setAuthStatus({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAuthStatus({ type: 'error', message: 'Gagal terhubung ke server.' });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem('pft_auth_user');
    setTransactions([]);
    setCustomIncomeCats([]);
    setCustomExpenseCats([]);
    setCustomAccounts([]);
    setAuthForm({ nama: '', email: '', password: '' });
    setAuthMode('login');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tipe') {
      if (value === 'Pemasukan') setFormData({ ...formData, tipe: value, kategori: allIncomeCats[0], dariAkun: '', keAkun: allAccounts[0] });
      else if (value === 'Pengeluaran') setFormData({ ...formData, tipe: value, kategori: allExpenseCats[0], dariAkun: allAccounts[0], keAkun: '' });
      else setFormData({ ...formData, tipe: value, kategori: '', dariAkun: allAccounts[0], keAkun: allAccounts[1] || allAccounts[0] });
    } else if (name === 'nominal') {
      setFormData({ ...formData, [name]: value.replace(/\D/g, "") });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tanggal || !formData.tipe || !formData.nominal) {
      setSyncStatus({ type: 'error', message: 'Tanggal, Tipe, dan Nominal wajib diisi!' });
      setTimeout(() => setSyncStatus({ type: '', message: '' }), 3000);
      return;
    }

    setIsSubmitting(true);
    const newTx = { id: 'temp_' + Date.now().toString(), ...formData };
    setTransactions(prev => [...prev, newTx]);

    if (apiUrl) {
      try {
        await fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'save', memberId: authUser.id, ...formData }) });
        setSyncStatus({ type: 'success', message: 'Tersimpan di Cloud!' });
      } catch (err) {
        setSyncStatus({ type: 'error', message: 'Hanya tersimpan lokal.' });
      }
    }
    setFormData({ ...formData, nominal: '', keterangan: '' });
    setIsSubmitting(false);
    setTimeout(() => setSyncStatus({ type: '', message: '' }), 3000);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;
    
    let newInc = customIncomeCats, newExp = customExpenseCats;
    if (newCatType === 'Pemasukan' && !allIncomeCats.includes(cleanName)) {
      newInc = [...customIncomeCats, cleanName];
      setCustomIncomeCats(newInc);
    } else if (newCatType === 'Pengeluaran' && !allExpenseCats.includes(cleanName)) {
      newExp = [...customExpenseCats, cleanName];
      setCustomExpenseCats(newExp);
    }
    saveSetupToCloud(newInc, newExp, customAccounts); // Push ke cloud
    setNewCatName('');
  };

  const handleDeleteCustomCat = (type, catName) => {
    let newInc = customIncomeCats, newExp = customExpenseCats;
    if (type === 'Pemasukan') {
      newInc = customIncomeCats.filter(c => c !== catName);
      setCustomIncomeCats(newInc);
    } else {
      newExp = customExpenseCats.filter(c => c !== catName);
      setCustomExpenseCats(newExp);
    }
    saveSetupToCloud(newInc, newExp, customAccounts);
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    const cleanName = newAccName.trim();
    if (!cleanName || allAccounts.includes(cleanName)) return;
    const newAccs = [...customAccounts, cleanName];
    setCustomAccounts(newAccs);
    saveSetupToCloud(customIncomeCats, customExpenseCats, newAccs); // Push ke cloud
    setNewAccName('');
  };

  const handleDeleteCustomAcc = (accName) => {
    const newAccs = customAccounts.filter(a => a !== accName);
    setCustomAccounts(newAccs);
    saveSetupToCloud(customIncomeCats, customExpenseCats, newAccs);
  };

  const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const balances = useMemo(() => {
    let total = 0;
    const accBalances = allAccounts.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {});
    transactions.forEach(t => {
      const amt = Number(t.nominal);
      if (t.tipe === 'Pemasukan') { total += amt; if (accBalances[t.keAkun] !== undefined) accBalances[t.keAkun] += amt; } 
      else if (t.tipe === 'Pengeluaran') { total -= amt; if (accBalances[t.dariAkun] !== undefined) accBalances[t.dariAkun] -= amt; } 
      else if (t.tipe === 'Mutasi') {
        if (accBalances[t.dariAkun] !== undefined) accBalances[t.dariAkun] -= amt;
        if (accBalances[t.keAkun] !== undefined) accBalances[t.keAkun] += amt;
      }
    });
    return { total, ...accBalances };
  }, [transactions, allAccounts]);

  const cashflowEval = useMemo(() => {
    let totalIn = 0, totalOut = 0;
    const expenseByCategory = {};
    allExpenseCats.forEach(cat => expenseByCategory[cat] = 0);
    transactions.forEach(t => {
      const amt = Number(t.nominal);
      if (t.tipe === 'Pemasukan') totalIn += amt;
      if (t.tipe === 'Pengeluaran') {
        totalOut += amt;
        expenseByCategory[t.kategori] = (expenseByCategory[t.kategori] || 0) + amt;
      }
    });
    return { totalIn, totalOut, expenseByCategory, savingsRate: totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : 0 };
  }, [transactions, allExpenseCats]);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];
    if (filterKategori) result = result.filter(t => t.kategori === filterKategori || t.tipe === filterKategori);
    if (startDate) result = result.filter(t => t.tanggal >= startDate);
    if (endDate) result = result.filter(t => t.tanggal <= endDate);
    result.sort((a, b) => {
      if (sortOrder === 'date-desc') return new Date(b.tanggal) - new Date(a.tanggal);
      if (sortOrder === 'date-asc') return new Date(a.tanggal) - new Date(b.tanggal);
      if (sortOrder === 'nominal-desc') return Number(b.nominal) - Number(a.nominal);
      if (sortOrder === 'nominal-asc') return Number(a.nominal) - Number(b.nominal);
      return 0;
    });
    return result;
  }, [transactions, filterKategori, sortOrder, startDate, endDate]);

  const handleGetAIAdvice = async () => {
    if (!apiUrl || transactions.length === 0) return;
    setIsAnalyzing(true);
    setAiAnalysis('');
    const topExpensesArr = Object.entries(cashflowEval.expenseByCategory).filter(([_, val]) => val > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, val]) => `${name} (${formatRp(val)})`).join(', ');
    try {
      const response = await fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'analyze', summary: { income: cashflowEval.totalIn, expense: cashflowEval.totalOut, topExpenses: topExpensesArr || 'Tidak ada pengeluaran' } }) });
      const data = await response.json();
      if (data.status === 'success') setAiAnalysis(data.data);
      else setAiAnalysis(`Error AI: ${data.message}`);
    } catch (error) { setAiAnalysis("Terjadi kesalahan jaringan AI."); } finally { setIsAnalyzing(false); }
  };

  // STYLE ANIMASI
  const AppStyles = () => (
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes slideUpFade {
        0% { opacity: 0; transform: translateY(15px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes popInScale {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
      }
      .animate-slide-up { animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .animate-pop-in { animation: popInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      
      /* Styling custom scrollbar agar lebih rapi */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `}} />
  );

  // RENDER: NOT LOGGED IN
  if (!authUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative">
        <AppStyles />
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsApiSetupOpen(true)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 transition">
             <Settings2 size={14}/> URL API
           </button>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 animate-pop-in">
          <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-indigo-200 shadow-lg transform rotate-3">💰</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">FINANCE TRACKER</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Sistem Member & AI Strategist</p>
          </div>
          
          <div className="p-6 sm:p-8">
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
              <button onClick={() => {setAuthMode('login'); setAuthStatus({type:'', message:''})}} className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Masuk</button>
              <button onClick={() => {setAuthMode('register'); setAuthStatus({type:'', message:''})}} className={`flex-1 text-sm font-semibold py-2.5 rounded-lg transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Daftar</button>
            </div>

            {authStatus.message && (
              <div className={`p-3.5 rounded-xl text-xs font-semibold mb-5 flex items-start gap-2.5 animate-slide-up ${authStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                <AlertCircle size={16} className="shrink-0 mt-0.5"/> 
                <span className="leading-relaxed">{authStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Nama Lengkap</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="text" required value={authForm.nama} onChange={(e) => setAuthForm({...authForm, nama: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="Misal: Budi Santoso"/>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Alamat Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="email" required value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="nama@email.com"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input type="password" required value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" placeholder="••••••••"/>
                </div>
              </div>

              <button type="submit" disabled={isAuthLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-indigo-200 transition-all flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed">
                {isAuthLoading ? <RefreshCw size={18} className="animate-spin"/> : <Lock size={18}/>}
                {authMode === 'login' ? 'Masuk ke Dashboard' : 'Buat Akun Sekarang'}
              </button>
            </form>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-4 text-xs text-slate-400 font-medium">atau masuk cepat</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <button type="button" onClick={handleGoogleLogin} disabled={isAuthLoading} className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold py-3.5 rounded-xl shadow-sm transition-all flex justify-center items-center gap-3 disabled:opacity-70">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Lanjutkan dengan Google
            </button>
          </div>
        </div>
        
        {/* API Setup Modal UI (Login Screen) */}
        {isApiSetupOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-pop-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
              <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2"><Database className="text-indigo-500" size={20}/> URL Google Apps Script</h3>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">Sistem membutuhkan URL backend untuk menyimpan data.</p>
              <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://script.google.com/.../exec" className="w-full p-3.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-mono text-xs mb-5 bg-slate-50 text-slate-700"/>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsApiSetupOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition">Simpan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER: WELCOME SCREEN (Animasi Interstitial)
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center animate-pop-in">
        <AppStyles />
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 flex flex-col items-center text-center max-w-sm w-full mx-4 border border-slate-100">
           <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} className="text-indigo-600 animate-[popInScale_0.5s_ease-out_0.2s_both]" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">Selamat Datang!</h2>
           <p className="text-slate-500 font-medium">{authUser.nama}</p>
           <div className="mt-8 flex gap-1">
             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
             <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
           </div>
        </div>
      </div>
    );
  }

  // RENDER: MAIN APP (LOGGED IN)
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-16 selection:bg-indigo-100 selection:text-indigo-900">
      <AppStyles />
      
      {/* HEADER MULTI-TENANT */}
      <header className="bg-white text-slate-800 py-3.5 px-4 sm:px-6 flex justify-between items-center shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-sm shadow-indigo-200 flex items-center justify-center">
             <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight leading-tight">Finance Tracker</h1>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium"><User size={10}/> {authUser.nama}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => fetchCloudData(authUser, apiUrl)} disabled={isSyncing} className={`text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`} title="Sinkronisasi Data">
            <CloudDownload size={18} className={isSyncing ? 'animate-pulse' : ''} />
          </button>
          <button onClick={() => setIsApiSetupOpen(true)} className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition" title="Pengaturan Kategori">
            <Settings2 size={18}/>
          </button>
          <button onClick={handleLogout} className="text-red-400 hover:bg-red-50 hover:text-red-600 p-2 rounded-lg transition" title="Keluar">
            <LogOut size={18}/>
          </button>
        </div>
      </header>

      { }
      {/* TABS NAVIGATION */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-3 bg-slate-100/80 p-1.5 rounded-xl w-full max-w-2xl relative overflow-hidden backdrop-blur-md border border-slate-200/60">
          {isSyncing && <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-100"><div className="h-full bg-indigo-500 w-1/3 animate-[slide_1s_ease-in-out_infinite]"></div></div>}
          
          <button onClick={() => setActiveTab('dashboard')} className={`py-2.5 px-2 rounded-lg font-semibold text-xs sm:text-sm flex flex-col md:flex-row items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
             <LayoutDashboard size={16} className={activeTab==='dashboard' ? 'text-indigo-600' : ''}/> <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('tracker')} className={`py-2.5 px-2 rounded-lg font-semibold text-xs sm:text-sm flex flex-col md:flex-row items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'tracker' ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
             <History size={16} className={activeTab==='tracker' ? 'text-indigo-600' : ''}/> <span className="hidden sm:inline">Riwayat</span>
          </button>
          <button onClick={() => setActiveTab('strategy')} className={`py-2.5 px-2 rounded-lg font-semibold text-xs sm:text-sm flex flex-col md:flex-row items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'strategy' ? 'bg-white text-indigo-700 shadow-sm shadow-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
             <Sparkles size={16} className={activeTab==='strategy' ? 'text-yellow-500' : ''}/> <span className="hidden sm:inline">AI Strategi</span>
          </button>
        </div>
      </div>

      {/* STATUS TOAST */}
      {syncStatus.message && (
        <div className="max-w-7xl mx-auto px-4 mt-4 animate-slide-up">
          <div className={`p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm border ${syncStatus.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : syncStatus.type === 'info' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            {syncStatus.type === 'error' ? <AlertCircle size={18}/> : syncStatus.type === 'info' ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18}/>}
            {syncStatus.message}
          </div>
        </div>
      )}

      {}
      {/* TAB CONTENTS WRAPPER (Handles animations) */}
      <div key={activeTab} className="animate-slide-up max-w-7xl mx-auto px-4 mt-6">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* VISUAL & BALANCE (Kiri untuk visual hirarki yang kuat) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* KARTU TOTAL ASET (HERO SECTION) */}
              <div className="bg-gradient-to-br from-[#1e1b4b] via-indigo-900 to-indigo-800 rounded-2xl shadow-lg border border-indigo-700 overflow-hidden relative">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-400 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                
                {isSyncing && <div className="absolute inset-0 bg-indigo-900/50 backdrop-blur-[2px] z-10 flex items-center justify-center"><RefreshCw className="animate-spin text-white" size={24}/></div>}
                
                <div className="p-6 sm:p-8 relative z-10">
                  <div className="flex items-center gap-2 text-indigo-200 mb-2 font-medium text-sm">
                    <Wallet size={16}/> Total Saldo Keseluruhan
                  </div>
                  <div className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-6">
                     {formatRp(balances.total)}
                  </div>
                  
                  {/* Saldo per Akun */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {allAccounts.map((acc, idx) => {
                      if(balances[acc] === 0) return null; // Hide empty accounts to save space
                      return (
                        <div key={acc} className="bg-white/10 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
                          <div className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider mb-1 truncate">{acc}</div>
                          <div className="text-sm font-semibold text-white truncate">{formatRp(balances[acc] || 0)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STATISTIK MINI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden group hover:shadow-md transition">
                  <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> Cashflow Bulan Ini</h3>
                  <div className="flex justify-between items-end mb-2">
                     <div>
                        <div className="text-xs font-semibold text-slate-500">Pemasukan</div>
                        <div className="text-sm font-bold text-emerald-600">{formatRp(cashflowEval.totalIn)}</div>
                     </div>
                     <div className="text-right">
                        <div className="text-xs font-semibold text-slate-500">Pengeluaran</div>
                        <div className="text-sm font-bold text-red-500">{formatRp(cashflowEval.totalOut)}</div>
                     </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                     <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${cashflowEval.totalIn > 0 ? Math.min(100, ((cashflowEval.totalIn - cashflowEval.totalOut) / cashflowEval.totalIn) * 100) : 0}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-3 font-medium">Margin Simpanan: <span className="text-slate-600 font-bold">{cashflowEval.savingsRate.toFixed(1)}%</span></div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden group hover:shadow-md transition">
                  <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2"><PieIcon size={18} className="text-pink-500"/> Pos Pengeluaran Top</h3>
                  <div className="space-y-3.5 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    {allExpenseCats.map((cat, idx) => {
                      const amt = cashflowEval.expenseByCategory[cat] || 0;
                      if (amt === 0) return null;
                      const pct = cashflowEval.totalOut > 0 ? (amt / cashflowEval.totalOut) * 100 : 0;
                      return (
                        <div key={cat} className="text-xs group/item">
                           <div className="flex justify-between font-medium text-slate-600 mb-1.5">
                              <span className="truncate pr-2">{cat}</span>
                              <span className="font-bold text-slate-800 shrink-0">{formatRp(amt)}</span>
                           </div>
                           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                           </div>
                        </div>
                      );
                    }).filter(Boolean).length === 0 && <div className="text-xs text-slate-400 text-center italic mt-6">Belum ada pengeluaran</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* INPUT FORM (Kanan) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                   <h2 className="font-bold text-slate-800 flex items-center gap-2"><Save size={18} className="text-indigo-600"/> Catat Transaksi</h2>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block font-semibold mb-1.5 text-xs text-slate-500 ml-1">Tanggal</label>
                       <input type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-700 transition" />
                    </div>
                    <div>
                       <label className="block font-semibold mb-1.5 text-xs text-slate-500 ml-1">Tipe Transaksi</label>
                       <select name="tipe" value={formData.tipe} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm font-semibold text-slate-700 transition">
                         <option value="Pengeluaran">Pengeluaran</option>
                         <option value="Pemasukan">Pemasukan</option>
                         <option value="Mutasi">Mutasi / Transfer</option>
                       </select>
                    </div>
                  </div>

                  {formData.tipe !== 'Mutasi' && (
                    <div>
                       <label className="block font-semibold mb-1.5 text-xs text-slate-500 ml-1">Kategori</label>
                       <select name="kategori" value={formData.kategori} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-700 transition">
                          {(formData.tipe === 'Pemasukan' ? allIncomeCats : allExpenseCats).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                       </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block font-semibold mb-1.5 text-xs text-slate-500 ml-1">Dari Akun</label>
                       <select name="dariAkun" value={formData.dariAkun} onChange={handleChange} disabled={formData.tipe === 'Pemasukan'} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                          {formData.tipe === 'Pemasukan' ? <option value="">-</option> : allAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block font-semibold mb-1.5 text-xs text-slate-500 ml-1">Ke Akun</label>
                       <select name="keAkun" value={formData.keAkun} onChange={handleChange} disabled={formData.tipe === 'Pengeluaran'} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                          {formData.tipe === 'Pengeluaran' ? <option value="">-</option> : allAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                       </select>
                    </div>
                  </div>

                  <div>
                     <label className="block font-semibold mb-1.5 text-xs text-slate-500 ml-1">Nominal (Rp)</label>
                     <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                       <input type="text" name="nominal" value={formData.nominal ? new Intl.NumberFormat('id-ID').format(formData.nominal) : ''} onChange={handleChange} placeholder="0" className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-lg font-bold text-slate-800 transition" />
                     </div>
                  </div>

                  <div>
                     <label className="block font-semibold mb-1.5 text-xs text-slate-500 ml-1">Catatan Tambahan</label>
                     <input type="text" name="keterangan" value={formData.keterangan} onChange={handleChange} placeholder="Misal: Beli kopi susu..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-700 transition" />
                  </div>

                  <button type="submit" disabled={isSubmitting || isSyncing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                    {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN TRANSAKSI'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRACKER (Riwayat) */}
        {activeTab === 'tracker' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[400px]">
             {isSyncing && <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3"><RefreshCw className="animate-spin text-indigo-600" size={36}/><span className="text-sm font-semibold text-indigo-800">Menyinkronkan riwayat...</span></div>}
            
            {/* Filter Header */}
            <div className="border-b border-slate-100 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                 <History size={18} className="text-indigo-600"/> RIWAYAT TRANSAKSI
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                   <span className="text-[10px] font-semibold text-slate-400 uppercase">Periode:</span>
                   <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer" />
                   <span className="text-slate-300">-</span>
                   <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer" />
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                   <ListFilter size={14} className="text-slate-400"/>
                   <select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer">
                      <option value="">Semua Kategori</option>
                      <optgroup label="Tipe Transaksi">
                        <option value="Pemasukan">Hanya Pemasukan</option>
                        <option value="Pengeluaran">Hanya Pengeluaran</option>
                        <option value="Mutasi">Hanya Mutasi</option>
                      </optgroup>
                      <optgroup label="Spesifik">
                        {allExpenseCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                   </select>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                   <ArrowUpDown size={14} className="text-slate-400"/>
                   <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer">
                      <option value="date-desc">Paling Baru</option>
                      <option value="date-asc">Paling Lama</option>
                      <option value="nominal-desc">Nominal Terbesar</option>
                      <option value="nominal-asc">Nominal Terkecil</option>
                   </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                     <th className="p-4 pl-6">Tanggal</th>
                     <th className="p-4">Tipe</th>
                     <th className="p-4">Kategori</th>
                     <th className="p-4">Akun</th>
                     <th className="p-4 text-right">Nominal</th>
                     <th className="p-4 pr-6">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-16 text-slate-400 font-medium">{isSyncing ? 'Memuat data...' : 'Belum ada transaksi ditemukan.'}</td></tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="p-4 pl-6 whitespace-nowrap text-xs text-slate-500 font-medium">{t.tanggal}</td>
                        <td className="p-4">
                           <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${t.tipe === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : t.tipe === 'Pengeluaran' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {t.tipe}
                           </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">{t.kategori || '-'}</td>
                        <td className="p-4 text-slate-500 text-xs font-medium">
                           {t.tipe === 'Mutasi' ? <span className="flex items-center gap-1">{t.dariAkun} <span className="text-slate-300">➔</span> {t.keAkun}</span> : (t.tipe === 'Pemasukan' ? t.keAkun : t.dariAkun)}
                        </td>
                        <td className={`p-4 text-right font-bold whitespace-nowrap text-base ${t.tipe === 'Pemasukan' ? 'text-emerald-600' : t.tipe === 'Pengeluaran' ? 'text-slate-800' : 'text-slate-600'}`}>
                           {t.tipe === 'Pengeluaran' ? '-' : ''} {formatRp(t.nominal)}
                        </td>
                        <td className="p-4 pr-6 text-slate-500 text-xs max-w-[180px] truncate group-hover:text-slate-700 transition-colors">
                           {t.keterangan || <span className="text-slate-300 italic">kosong</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: STRATEGI & AI */}
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl shadow-xl border border-indigo-800 overflow-hidden relative">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 translate-y-1/4"><Bot size={300} /></div>
              
              <div className="p-8 sm:p-10 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-800/50 border border-indigo-700/50 text-indigo-200 text-xs font-bold mb-6">
                  <Sparkles size={14} className="text-yellow-400"/> AI Robo-Advisor
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Strategi Personal untuk {authUser.nama}</h2>
                <p className="text-indigo-200 text-sm max-w-xl leading-relaxed mb-8">Saya akan menganalisis pola arus kas (cashflow) Anda bulan ini, menemukan potensi pemborosan, dan memberikan saran praktis agar tujuan finansial Anda lebih cepat tercapai.</p>
                
                {!aiAnalysis && !isAnalyzing ? (
                  <button onClick={handleGetAIAdvice} className="bg-white text-indigo-900 font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-900/50 hover:bg-slate-50 hover:scale-[1.02] transition-all flex items-center gap-2 text-sm transform active:scale-95">
                    <Bot size={20} className="text-indigo-600" /> Analisis Keuangan Saya Sekarang
                  </button>
                ) : isAnalyzing ? (
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 border border-white/10 max-w-xl">
                    <RefreshCw className="animate-spin text-indigo-400" size={36} />
                    <span className="text-sm font-semibold text-indigo-100 tracking-wide">AI sedang menelusuri data transaksi Anda...</span>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-700 shadow-2xl shadow-black/20 max-w-4xl relative">
                    <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg rotate-12"><Sparkles className="text-white" size={20}/></div>
                    
                    {/* Render text with basic markdown (bold, bullets) */}
                    <div className="text-sm space-y-3 leading-relaxed prose prose-indigo max-w-none">
                       {aiAnalysis.split('\n').map((line, index) => {
                          const parts = line.split(/(\*\*.*?\*\*)/g);
                          return (
                            <p key={index} className="mb-2">
                              {parts.map((part, i) => {
                                if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-slate-900">{part.slice(2, -2)}</strong>;
                                if (part.startsWith('* ')) return <span key={i} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-indigo-500">{part.slice(2)}</span>;
                                return part;
                              })}
                            </p>
                          );
                       })}
                    </div>
                    
                    <button onClick={handleGetAIAdvice} className="mt-8 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 flex items-center gap-2 border border-indigo-100 px-4 py-2.5 rounded-lg transition-colors">
                      <RefreshCw size={14} /> Perbarui Analisis
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 p-5 bg-slate-50/50">
                 <h2 className="font-bold text-slate-800 flex items-center gap-2"><Target size={18} className="text-indigo-600"/> Target Budget Planner</h2>
                 <p className="text-xs text-slate-500 mt-1 font-medium">Sistem otomatis menyarankan penghematan 10% dari realisasi pengeluaran bulan ini.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                     <tr>
                        <th className="p-4 pl-6">Pos Kategori</th>
                        <th className="p-4">Realisasi Bulan Ini</th>
                        <th className="p-4">Saran AI (-10%)</th>
                        <th className="p-4 pr-6">Budget Final Anda</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allExpenseCats.map((cat, idx) => {
                      const realisasi = cashflowEval.expenseByCategory[cat] || 0;
                      const saranSys = realisasi * 0.9;
                      const manualVal = manualBudgets[cat] !== undefined ? manualBudgets[cat] : Math.round(saranSys);
                      return (
                        <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 pl-6 font-semibold text-slate-700">{cat}</td>
                          <td className="p-4 font-bold text-slate-600">{formatRp(realisasi)}</td>
                          <td className="p-4 text-emerald-600/70 font-medium italic">{formatRp(saranSys)}</td>
                          <td className="p-4 pr-6">
                            <div className="relative max-w-[180px]">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">Rp</span>
                               <input type="number" value={manualVal} onChange={(e) => setManualBudgets({ ...manualBudgets, [cat]: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 transition" placeholder="0"/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API SETUP & CUSTOM CATEGORY MODAL (Floating) */}
      {isApiSetupOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-pop-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col border border-white">
            
            <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 bg-slate-50">
               <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings2 size={20} className="text-indigo-600"/> Pengaturan Lanjutan</h3>
               <button onClick={() => setIsApiSetupOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-1.5 shadow-sm border border-slate-200 transition">
                  <X size={18}/>
               </button>
            </div>
            
            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar bg-white">
              {/* Info Database */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                 <div className="flex gap-3">
                    <Database size={20} className="text-indigo-600 shrink-0 mt-0.5"/>
                    <div>
                       <h4 className="font-bold text-indigo-900 text-sm mb-1">Database ID: {authUser.id.substring(0, 8)}...</h4>
                       <p className="text-xs text-indigo-700/80 mb-3 leading-relaxed">Pastikan URL Apps Script Google Sheet Anda benar agar data tersimpan aman.</p>
                       <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://script.google.com/..." className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg outline-none text-[11px] font-mono text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"/>
                    </div>
                 </div>
              </div>

              {/* Kustom Kategori */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><PlusCircle size={16} className="text-emerald-500"/> Kategori Transaksi Kustom</h4>
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Misal: Uang Jajan..." className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"/>
                  <select value={newCatType} onChange={(e) => setNewCatType(e.target.value)} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200">
                    <option value="Pengeluaran">Pengeluaran</option>
                    <option value="Pemasukan">Pemasukan</option>
                  </select>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition">Tambah</button>
                </form>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-xl p-2 bg-slate-50">
                  {customIncomeCats.length === 0 && customExpenseCats.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Belum ada kategori kustom.</div>}
                  {customIncomeCats.map(cat => (
                    <div key={'inc-'+cat} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm group">
                       <span className="font-semibold text-emerald-700 text-xs flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>{cat}</span>
                       <button onClick={() => handleDeleteCustomCat('Pemasukan', cat)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                    </div>
                  ))}
                  {customExpenseCats.map(cat => (
                    <div key={'exp-'+cat} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm group">
                       <span className="font-semibold text-red-600 text-xs flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>{cat}</span>
                       <button onClick={() => handleDeleteCustomCat('Pengeluaran', cat)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kustom Akun/Dompet */}
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><Wallet size={16} className="text-blue-500"/> Akun / Dompet Kustom</h4>
                <form onSubmit={handleAddAccount} className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input type="text" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="Misal: SeaBank..." className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"/>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition">Tambah</button>
                </form>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar border border-slate-100 rounded-xl p-2 bg-slate-50">
                  {customAccounts.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Belum ada akun kustom.</div>}
                  {customAccounts.map(acc => (
                    <div key={'acc-'+acc} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm group">
                       <span className="font-semibold text-blue-700 text-xs">{acc}</span>
                       <button onClick={() => handleDeleteCustomAcc(acc)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
               <button onClick={() => setIsApiSetupOpen(false)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-6 py-3 rounded-xl transition shadow-sm text-sm">Selesai</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
