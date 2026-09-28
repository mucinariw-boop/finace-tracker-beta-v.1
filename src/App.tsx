import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle2, AlertCircle, RefreshCw, Save, Target, Wallet, BarChart3, 
  Settings2, ListFilter, History, ArrowUpDown, Trash2, PieChart as PieIcon, 
  LayoutDashboard, Database, X, PlusCircle, Bot, Sparkles, LogOut, User, Lock, Mail, Key, CloudDownload
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Inisialisasi Auth untuk Login Google
let auth;
try {
  if (typeof __firebase_config !== 'undefined') {
    const app = initializeApp(JSON.parse(__firebase_config));
    auth = getAuth(app);
  }
} catch (e) {
  console.warn("Firebase tidak tersedia, fallback ke mode demo login Google.");
}

const MASTER_ACCOUNTS = ["Kas Tunai", "BCA", "Mandiri", "GoPay", "OVO"];
const DEFAULT_INCOME_CATS = ["Gaji Utama", "Freelance", "Investasi", "Bonus", "Lain-lain"];
const DEFAULT_EXPENSE_CATS = ["Makan & Minum", "Transportasi", "Tagihan", "Hiburan", "Keluarga"];
const CHART_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// URL API DEFAULT ANDA
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbycOz_48bYCbKtcbKsTfO4M4KhrMOnUIZxTpwc1y0f7BhsFftsLsj0_v_SAqKLmdMzYvA/exec';

export default function App() {
  // === AUTHENTICATION STATE ===
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('pft_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login'); 
  const [authForm, setAuthForm] = useState({ nama: '', email: '', password: '' });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState({ type: '', message: '' });

  // === GLOBAL STATE ===
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('pft_api_url') || DEFAULT_API_URL);
  const [isApiSetupOpen, setIsApiSetupOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // State baru untuk loading penarikan data

  // === DYNAMIC LOCAL STORAGE KEYS ===
  const storageKeys = useMemo(() => ({
    tx: `pft_tx_${authUser?.id || 'guest'}`,
    incCats: `pft_inc_cats_${authUser?.id || 'guest'}`,
    expCats: `pft_exp_cats_${authUser?.id || 'guest'}`,
    budget: `pft_budget_${authUser?.id || 'guest'}`,
    accounts: `pft_accounts_${authUser?.id || 'guest'}`
  }), [authUser]);
  
  // === USER DATA STATES ===
  const [customIncomeCats, setCustomIncomeCats] = useState([]);
  const [customExpenseCats, setCustomExpenseCats] = useState([]);
  const [customAccounts, setCustomAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [manualBudgets, setManualBudgets] = useState({});

  // FUNGSI TARIK DATA DARI GOOGLE SHEETS
  const fetchCloudData = async (user, url) => {
    if (!url || !user) return;
    setIsSyncing(true);
    setSyncStatus({ type: 'info', message: 'Menyinkronkan data dari Cloud...' });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getData', memberId: user.id })
      });
      const resData = await response.json();
      
      if (resData.status === 'success') {
        setTransactions(resData.data);
        localStorage.setItem(`pft_tx_${user.id}`, JSON.stringify(resData.data)); // Timpa lokal dengan data cloud
        setSyncStatus({ type: 'success', message: 'Data berhasil disinkronkan!' });
      } else {
        setSyncStatus({ type: 'error', message: resData.message });
      }
    } catch (err) {
      console.error(err);
      setSyncStatus({ type: 'error', message: 'Gagal menarik data dari server.' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus({ type: '', message: '' }), 3000);
    }
  };

  // Initialize data when authUser changes
  useEffect(() => {
    if (authUser) {
      // 1. Muat dari lokal dulu agar UI cepat tampil (Offline-first)
      const savedTx = localStorage.getItem(storageKeys.tx);
      if (savedTx) setTransactions(JSON.parse(savedTx));
      
      const savedInc = localStorage.getItem(storageKeys.incCats);
      setCustomIncomeCats(savedInc ? JSON.parse(savedInc) : []);
      
      const savedExp = localStorage.getItem(storageKeys.expCats);
      setCustomExpenseCats(savedExp ? JSON.parse(savedExp) : []);
      
      const savedAcc = localStorage.getItem(storageKeys.accounts);
      setCustomAccounts(savedAcc ? JSON.parse(savedAcc) : []);
      
      const savedBudget = localStorage.getItem(storageKeys.budget);
      setManualBudgets(savedBudget ? JSON.parse(savedBudget) : {});

      // 2. Tarik data terbaru dari Cloud (Google Sheets)
      fetchCloudData(authUser, apiUrl);
    }
  }, [authUser, apiUrl, storageKeys]);

  // Persist App Settings
  useEffect(() => { localStorage.setItem('pft_api_url', apiUrl); }, [apiUrl]);
  useEffect(() => { if (authUser) localStorage.setItem('pft_auth_user', JSON.stringify(authUser)); }, [authUser]);

  // Persist User Data locally (backup)
  useEffect(() => { if (authUser && !isSyncing) localStorage.setItem(storageKeys.tx, JSON.stringify(transactions)); }, [transactions, authUser, storageKeys, isSyncing]);
  useEffect(() => { if (authUser) localStorage.setItem(storageKeys.budget, JSON.stringify(manualBudgets)); }, [manualBudgets, authUser, storageKeys]);
  useEffect(() => {
    if (authUser) {
      localStorage.setItem(storageKeys.incCats, JSON.stringify(customIncomeCats));
      localStorage.setItem(storageKeys.expCats, JSON.stringify(customExpenseCats));
      localStorage.setItem(storageKeys.accounts, JSON.stringify(customAccounts));
    }
  }, [customIncomeCats, customExpenseCats, customAccounts, authUser, storageKeys]);

  // UI States
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

  // ==========================================
  // AUTHENTICATION LOGIC
  // ==========================================
  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setAuthStatus({ type: 'info', message: 'Memproses otentikasi Google...' });
    
    if (!auth) {
      // Fallback demo jika API Keys Google/Firebase belum disetel oleh sistem
      setTimeout(() => {
        const demoUser = { id: 'g_user_' + Date.now(), nama: 'Google User', email: 'user@google.com' };
        setAuthUser(demoUser);
        setAuthStatus({ type: '', message: '' });
        setActiveTab('dashboard');
        setIsAuthLoading(false);
      }, 1200);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Simpan data user ke state aplikasi
      const appUser = {
        id: user.uid,
        nama: user.displayName || 'Pengguna Google',
        email: user.email
      };
      
      setAuthUser(appUser);
      setAuthStatus({ type: '', message: '' });
      setActiveTab('dashboard');
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        setAuthStatus({ type: 'error', message: 'Login dibatalkan oleh pengguna.' });
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthStatus({ type: 'error', message: 'Metode Login Google belum diaktifkan.' });
      } else {
        setAuthStatus({ type: 'error', message: `Gagal login: ${error.message}` });
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!apiUrl) {
      setAuthStatus({ type: 'error', message: 'API URL Google Sheets belum diatur!' });
      return;
    }
    
    setIsAuthLoading(true);
    setAuthStatus({ type: 'info', message: 'Memproses ke server...' });

    try {
      const payload = { action: authMode, ...authForm };
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setAuthUser(data.member); // Set User & Trigger Sinkronisasi via useEffect
        setAuthStatus({ type: '', message: '' });
        setActiveTab('dashboard');
      } else {
        setAuthStatus({ type: 'error', message: data.message });
      }
    } catch (error) {
      setAuthStatus({ type: 'error', message: 'Gagal terhubung ke server Google.' });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    // Popup bawaan browser sering diblokir, langsung bersihkan data log-out
    setAuthUser(null);
    localStorage.removeItem('pft_auth_user');
    setTransactions([]); // Bersihkan data di UI
    setAuthForm({ nama: '', email: '', password: '' });
    setAuthMode('login');
  };

  // ==========================================
  // APP LOGIC
  // ==========================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'tipe') {
      if (value === 'Pemasukan') {
        setFormData({ ...formData, tipe: value, kategori: allIncomeCats[0], dariAkun: '', keAkun: allAccounts[0] });
      } else if (value === 'Pengeluaran') {
        setFormData({ ...formData, tipe: value, kategori: allExpenseCats[0], dariAkun: allAccounts[0], keAkun: '' });
      } else {
        setFormData({ ...formData, tipe: value, kategori: '', dariAkun: allAccounts[0], keAkun: allAccounts[1] || allAccounts[0] });
      }
    } else if (name === 'nominal') {
      const val = value.replace(/\D/g, "");
      setFormData({ ...formData, [name]: val });
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
    // Tambahkan ID sementara untuk rendering UI instan
    const newTx = { id: 'temp_' + Date.now().toString(), ...formData };
    setTransactions(prev => [...prev, newTx]);

    if (apiUrl) {
      try {
        // Kirim memberId agar masuk ke laci data yang benar
        const payload = { action: 'save', memberId: authUser.id, ...formData };
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        setSyncStatus({ type: 'success', message: 'Transaksi disimpan di Cloud!' });
      } catch (err) {
        setSyncStatus({ type: 'error', message: 'Tersimpan lokal (Gagal ke Cloud)' });
      }
    }

    setFormData({ ...formData, nominal: '', keterangan: '' });
    setIsSubmitting(false);
    setTimeout(() => setSyncStatus({ type: '', message: '' }), 3000);
  };

  const handleGetAIAdvice = async () => {
    if (!apiUrl || transactions.length === 0) return;
    setIsAnalyzing(true);
    setAiAnalysis('');
    
    const topExpensesArr = Object.entries(cashflowEval.expenseByCategory)
      .filter(([_, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, val]) => `${name} (${formatRp(val)})`)
      .join(', ');

    const payload = {
      action: 'analyze',
      summary: {
        income: cashflowEval.totalIn,
        expense: cashflowEval.totalOut,
        balance: cashflowEval.balanceStatus,
        topExpenses: topExpensesArr || 'Tidak ada pengeluaran'
      }
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.status === 'success') setAiAnalysis(data.data);
      else setAiAnalysis(`Error AI: ${data.message}`);
    } catch (error) {
      setAiAnalysis("Terjadi kesalahan jaringan saat mencoba terhubung dengan AI.");
    } finally {
      setIsAnalyzing(false);
    }
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
    let totalIn = 0, totalOut = 0, maxExpense = 0, minExpense = Infinity;
    const expenseByCategory = {};
    allExpenseCats.forEach(cat => expenseByCategory[cat] = 0);

    transactions.forEach(t => {
      const amt = Number(t.nominal);
      if (t.tipe === 'Pemasukan') totalIn += amt;
      if (t.tipe === 'Pengeluaran') {
        totalOut += amt;
        expenseByCategory[t.kategori] = (expenseByCategory[t.kategori] || 0) + amt;
        if (amt > maxExpense) maxExpense = amt;
        if (amt < minExpense) minExpense = amt;
      }
    });
    if (minExpense === Infinity) minExpense = 0;
    return { totalIn, totalOut, balanceStatus: totalIn - totalOut, maxExpense, minExpense, expenseByCategory, savingsRate: totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : 0 };
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

  const formatMarkdown = (text) => {
    if(!text) return null;
    return text.split('\n').map((line, index) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={index} className="mb-2 leading-relaxed">
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>;
            if (part.startsWith('* ')) return <span key={i} className="pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-blue-500">{part.slice(2)}</span>;
            return part;
          })}
        </p>
      );
    });
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) return;
    if (newCatType === 'Pemasukan' && !allIncomeCats.includes(cleanName)) setCustomIncomeCats([...customIncomeCats, cleanName]);
    if (newCatType === 'Pengeluaran' && !allExpenseCats.includes(cleanName)) setCustomExpenseCats([...customExpenseCats, cleanName]);
    setNewCatName('');
  };

  const handleDeleteCustomCat = (type, catName) => {
    if (type === 'Pemasukan') setCustomIncomeCats(customIncomeCats.filter(c => c !== catName));
    else setCustomExpenseCats(customExpenseCats.filter(c => c !== catName));
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    const cleanName = newAccName.trim();
    if (!cleanName) return;
    if (!allAccounts.includes(cleanName)) setCustomAccounts([...customAccounts, cleanName]);
    setNewAccName('');
  };

  const handleDeleteCustomAcc = (accName) => {
    setCustomAccounts(customAccounts.filter(a => a !== accName));
  };

  // ==========================================
  // RENDER: AUTHENTICATION SCREEN
  // ==========================================
  if (!authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1f3a5f] to-slate-800 flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4">
           <button onClick={() => setIsApiSetupOpen(true)} className="text-xs text-white/70 hover:text-white flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm transition">
             <Settings2 size={14}/> Setup API URL
           </button>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#1f3a5f] p-6 text-center">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">💰</div>
            <h1 className="text-xl font-black text-white tracking-wide">FINANCE TRACKER</h1>
            <p className="text-blue-200 text-xs mt-1">Sistem Member & AI Advisor</p>
          </div>
          
          <div className="p-6">
            <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
              <button onClick={() => {setAuthMode('login'); setAuthStatus({type:'', message:''})}} className={`flex-1 text-sm font-bold py-2 rounded-md transition ${authMode === 'login' ? 'bg-white shadow text-[#1f3a5f]' : 'text-gray-500'}`}>Login</button>
              <button onClick={() => {setAuthMode('register'); setAuthStatus({type:'', message:''})}} className={`flex-1 text-sm font-bold py-2 rounded-md transition ${authMode === 'register' ? 'bg-white shadow text-[#1f3a5f]' : 'text-gray-500'}`}>Daftar Baru</button>
            </div>

            {authStatus.message && (
              <div className={`p-3 rounded-lg text-xs font-bold mb-4 flex items-center gap-2 ${authStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                <AlertCircle size={14}/> {authStatus.message}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nama Lengkap</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input type="text" required value={authForm.nama} onChange={(e) => setAuthForm({...authForm, nama: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1f3a5f] outline-none transition" placeholder="John Doe"/>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Alamat Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="email" required value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1f3a5f] outline-none transition" placeholder="email@contoh.com"/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input type="password" required value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#1f3a5f] outline-none transition" placeholder="••••••••"/>
                </div>
              </div>

              <button type="submit" disabled={isAuthLoading} className="w-full bg-[#0f9d58] hover:bg-[#0a7e46] text-white font-bold py-3 rounded-xl shadow transition flex justify-center items-center gap-2 mt-2 disabled:opacity-70">
                {isAuthLoading ? <RefreshCw size={16} className="animate-spin"/> : <Lock size={16}/>}
                {authMode === 'login' ? 'MASUK KE DASHBOARD' : 'BUAT AKUN SEKARANG'}
              </button>
            </form>

            <div className="flex items-center my-5">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-3 text-xs text-gray-400 font-semibold">ATAU</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            <button type="button" onClick={handleGoogleLogin} disabled={isAuthLoading} className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 rounded-xl shadow-sm transition flex justify-center items-center gap-2 disabled:opacity-70">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Lanjutkan dengan Google
            </button>

          </div>
        </div>
        
        {/* Setup API Modal (Hanya muncul saat di halaman Login) */}
        {isApiSetupOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Database size={18}/> URL Web App (API)</h3>
              <p className="text-xs text-gray-500 mb-4">Aplikasi akan menggunakan URL ini untuk menyimpan & menarik data.</p>
              <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-200 outline-none font-mono text-[10px] sm:text-xs mb-4 bg-gray-50"/>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsApiSetupOpen(false)} className="bg-[#1f3a5f] text-white font-bold px-5 py-2.5 rounded-xl">Simpan & Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN APP (LOGGED IN)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans text-gray-800 pb-12">
      
      {/* HEADER MULTI-TENANT */}
      <header className="bg-[#1f3a5f] text-white py-3 px-4 sm:px-6 flex justify-between items-center shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-1.5 sm:p-2 rounded-lg text-[#1f3a5f] font-black text-sm sm:text-lg shadow-sm">💰</div>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-wide">FINANCE TRACKER</h1>
            <p className="text-[10px] text-blue-200 flex items-center gap-1"><User size={10}/> Hai, {authUser.nama}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sinkronisasi Manual Button */}
          <button onClick={() => fetchCloudData(authUser, apiUrl)} disabled={isSyncing} className={`text-white hover:bg-white/10 p-2 rounded-lg transition ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`} title="Sinkronisasi Data">
            <CloudDownload size={18} className={isSyncing ? 'animate-pulse' : ''} />
          </button>
          <button onClick={() => setIsApiSetupOpen(true)} className="text-white hover:bg-white/10 p-2 rounded-lg transition" title="Pengaturan Kategori & DB">
            <Settings2 size={18}/>
          </button>
          <button onClick={handleLogout} className="text-red-300 hover:bg-red-500/20 hover:text-red-100 p-2 rounded-lg transition" title="Keluar">
            <LogOut size={18}/>
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="max-w-7xl mx-auto px-4 mt-4 sm:mt-6">
        <div className="grid grid-cols-3 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200 gap-1 w-full max-w-2xl relative overflow-hidden">
          {isSyncing && <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-100"><div className="h-full bg-blue-500 w-1/3 animate-[slide_1s_ease-in-out_infinite]"></div></div>}
          <button onClick={() => setActiveTab('dashboard')} className={`py-2.5 px-2 rounded-lg font-bold text-xs sm:text-sm flex flex-col md:flex-row items-center justify-center gap-1.5 transition ${activeTab === 'dashboard' ? 'bg-[#1f3a5f] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}><LayoutDashboard size={15}/> <span>Dashboard & Input</span></button>
          <button onClick={() => setActiveTab('tracker')} className={`py-2.5 px-2 rounded-lg font-bold text-xs sm:text-sm flex flex-col md:flex-row items-center justify-center gap-1.5 transition ${activeTab === 'tracker' ? 'bg-[#1f3a5f] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}><History size={15}/> <span>Tracker & Filter</span></button>
          <button onClick={() => setActiveTab('strategy')} className={`py-2.5 px-2 rounded-lg font-bold text-xs sm:text-sm flex flex-col md:flex-row items-center justify-center gap-1.5 transition ${activeTab === 'strategy' ? 'bg-[#1f3a5f] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}><Sparkles size={15}/> <span>Strategi & AI</span></button>
        </div>
      </div>

      {syncStatus.message && (
        <div className="max-w-7xl mx-auto px-4 mt-3">
          <div className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 ${syncStatus.type === 'error' ? 'bg-red-100 text-red-700' : syncStatus.type === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {syncStatus.type === 'error' ? <AlertCircle size={16}/> : syncStatus.type === 'info' ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>}
            {syncStatus.message}
          </div>
        </div>
      )}

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-4 mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* INPUT FORM */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-[#434343] text-white px-4 sm:px-5 py-3 font-bold text-xs sm:text-sm flex items-center gap-2"><Save size={16}/> INPUT TRANSAKSI BARU</div>
              <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block font-bold mb-1 text-[11px] sm:text-xs text-gray-600">Tanggal</label><input type="date" name="tanggal" value={formData.tanggal} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" /></div>
                  <div><label className="block font-bold mb-1 text-[11px] sm:text-xs text-gray-600">Tipe</label><select name="tipe" value={formData.tipe} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white"><option value="Pemasukan">Pemasukan</option><option value="Pengeluaran">Pengeluaran</option><option value="Mutasi">Mutasi</option></select></div>
                </div>
                {formData.tipe !== 'Mutasi' && (
                  <div><label className="block font-bold mb-1 text-[11px] sm:text-xs text-gray-600">Kategori</label><select name="kategori" value={formData.kategori} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white">{(formData.tipe === 'Pemasukan' ? allIncomeCats : allExpenseCats).map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block font-bold mb-1 text-[11px] sm:text-xs text-gray-600">Dari Akun</label><select name="dariAkun" value={formData.dariAkun} onChange={handleChange} disabled={formData.tipe === 'Pemasukan'} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white disabled:bg-gray-100">{formData.tipe === 'Pemasukan' ? <option value="">-</option> : allAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}</select></div>
                  <div><label className="block font-bold mb-1 text-[11px] sm:text-xs text-gray-600">Ke Akun</label><select name="keAkun" value={formData.keAkun} onChange={handleChange} disabled={formData.tipe === 'Pengeluaran'} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none bg-white disabled:bg-gray-100">{formData.tipe === 'Pengeluaran' ? <option value="">-</option> : allAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}</select></div>
                </div>
                <div><label className="block font-bold mb-1 text-[11px] sm:text-xs text-gray-600">Nominal (Rp)</label><input type="text" name="nominal" value={formData.nominal ? new Intl.NumberFormat('id-ID').format(formData.nominal) : ''} onChange={handleChange} placeholder="Contoh: 1.500.000" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none font-semibold text-gray-800" /></div>
                <div><label className="block font-bold mb-1 text-[11px] sm:text-xs text-gray-600">Keterangan</label><input type="text" name="keterangan" value={formData.keterangan} onChange={handleChange} placeholder="Catatan transaksi..." className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" /></div>
                <button type="submit" disabled={isSubmitting || isSyncing} className="w-full bg-[#0f9d58] hover:bg-[#0a7e46] text-white font-bold py-3 px-4 rounded-xl shadow transition flex items-center justify-center gap-2 mt-2 disabled:opacity-70">
                  {isSubmitting ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                  {isSubmitting ? 'MENYIMPAN...' : 'SIMPAN TRANSAKSI'}
                </button>
              </form>
            </div>
          </div>
          {/* VISUAL & BALANCE */}
          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-5 sm:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
              {isSyncing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><RefreshCw className="animate-spin text-green-500" size={24}/></div>}
              <div className="bg-[#93c47d] text-gray-900 px-4 py-3 font-bold text-xs sm:text-sm flex items-center justify-between">
                <div className="flex items-center gap-2"><Wallet size={16}/> RINGKASAN SALDO</div>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div><div className="text-[10px] font-bold text-gray-500">[TOTAL ASET]</div><div className="text-sm sm:text-lg font-black text-gray-800">{formatRp(balances.total)}</div>
                </div>
                {allAccounts.map((acc, idx) => {
                  const colors = ['bg-blue-400', 'bg-blue-600', 'bg-sky-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-400'];
                  return (
                    <div key={acc} className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-full h-1 ${colors[idx % colors.length]}`}></div><div className="text-[10px] font-bold text-gray-500">[{acc.toUpperCase()}]</div><div className="text-sm sm:text-base font-bold text-gray-800">{formatRp(balances[acc] || 0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative">
                <h3 className="font-bold text-xs text-gray-700 mb-3 flex items-center gap-2"><BarChart3 size={16}/> Pemasukan vs Pengeluaran</h3>
                <div className="flex justify-between text-xs font-bold mb-1"><span className="text-green-600">Masuk: {formatRp(cashflowEval.totalIn)}</span><span className="text-red-600">Keluar: {formatRp(cashflowEval.totalOut)}</span></div>
                <div className="w-full bg-red-100 rounded-full h-3 overflow-hidden flex mt-2"><div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${cashflowEval.totalIn > 0 ? Math.min(100, ((cashflowEval.totalIn - cashflowEval.totalOut) / cashflowEval.totalIn) * 100) : 0}%` }}></div></div>
                <div className="text-[10px] text-gray-500 mt-2 text-right">Target Sisa: {cashflowEval.savingsRate.toFixed(1)}%</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative">
                <h3 className="font-bold text-xs text-gray-700 mb-3 flex items-center gap-2"><PieIcon size={16}/> Pengeluaran Terbesar</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {allExpenseCats.map((cat, idx) => {
                    const amt = cashflowEval.expenseByCategory[cat] || 0;
                    if (amt === 0) return null;
                    const pct = cashflowEval.totalOut > 0 ? (amt / cashflowEval.totalOut) * 100 : 0;
                    return (
                      <div key={cat} className="text-[10px]"><div className="flex justify-between font-semibold mb-0.5"><span>{cat}</span><span>{formatRp(amt)} ({pct.toFixed(0)}%)</span></div><div className="w-full bg-gray-100 rounded-full h-1.5"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div></div></div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRACKER */}
      {activeTab === 'tracker' && (
        <div className="max-w-7xl mx-auto px-4 mt-4 sm:mt-6 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
             {isSyncing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-2"><RefreshCw className="animate-spin text-[#1f3a5f]" size={32}/><span className="text-xs font-bold text-[#1f3a5f]">Mengambil data riwayat...</span></div>}
            <div className="bg-[#1f3a5f] text-white p-3.5 sm:p-4 font-bold text-xs sm:text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2"><History size={16}/> TRACKER & FILTER TRANSAKSI</div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/20"><span className="text-[10px] text-gray-300">Dari:</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-white cursor-pointer" /></div>
                <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/20"><span className="text-[10px] text-gray-300">Sampai:</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs font-semibold outline-none text-white cursor-pointer" /></div>
                <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/20"><ListFilter size={14} className="text-gray-300"/><select value={filterKategori} onChange={(e) => setFilterKategori(e.target.value)} className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-white"><option value="" className="text-gray-800">Semua Data</option><optgroup label="Tipe" className="text-gray-800"><option value="Pemasukan">Pemasukan</option><option value="Pengeluaran">Pengeluaran</option><option value="Mutasi">Mutasi</option></optgroup><optgroup label="Kategori" className="text-gray-800">{allExpenseCats.map(c => <option key={c} value={c}>{c}</option>)}</optgroup></select></div>
                <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/20"><ArrowUpDown size={14} className="text-gray-300"/><select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-transparent text-xs font-semibold outline-none cursor-pointer text-white"><option value="date-desc" className="text-gray-800">Terbaru</option><option value="date-asc" className="text-gray-800">Terlama</option><option value="nominal-desc" className="text-gray-800">Nominal Tertinggi</option><option value="nominal-asc" className="text-gray-800">Nominal Terendah</option></select></div>
              </div>
            </div>
            <div className="overflow-x-auto min-h-[200px]">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase font-bold text-[10px]">
                  <tr><th className="p-3">Tanggal</th><th className="p-3">Tipe</th><th className="p-3">Kategori</th><th className="p-3">Akun</th><th className="p-3 text-right">Nominal</th><th className="p-3">Keterangan</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 text-gray-400 italic">{isSyncing ? 'Mencari data di server...' : 'Belum ada transaksi di akun Anda.'}</td></tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 whitespace-nowrap">{t.tanggal}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.tipe === 'Pemasukan' ? 'bg-green-100 text-green-700' : t.tipe === 'Pengeluaran' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{t.tipe}</span></td>
                        <td className="p-3 font-semibold text-gray-800">{t.kategori || '-'}</td>
                        <td className="p-3 text-gray-600 text-[11px]">{t.tipe === 'Mutasi' ? `${t.dariAkun} ➔ ${t.keAkun}` : (t.tipe === 'Pemasukan' ? t.keAkun : t.dariAkun)}</td>
                        <td className={`p-3 text-right font-bold whitespace-nowrap ${t.tipe === 'Pemasukan' ? 'text-green-600' : t.tipe === 'Pengeluaran' ? 'text-red-600' : 'text-gray-800'}`}>{t.tipe === 'Pengeluaran' ? '-' : ''} {formatRp(t.nominal)}</td>
                        <td className="p-3 text-gray-500 text-[11px] max-w-[150px] truncate">{t.keterangan || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STRATEGI & AI */}
      {activeTab === 'strategy' && (
        <div className="max-w-7xl mx-auto px-4 mt-4 sm:mt-6 space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-blue-800 rounded-xl shadow-lg border border-blue-700 overflow-hidden">
            <div className="p-5 sm:p-6 text-white relative">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Bot size={120} /></div>
              <div className="relative z-10">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 mb-2"><Sparkles className="text-yellow-400" /> Robo-Advisor: AI Strategist untuk {authUser.nama}</h2>
                <p className="text-xs sm:text-sm text-blue-200 mb-5 max-w-2xl">Dapatkan wawasan mendalam dan strategi taktis yang dipersonalisasi berdasarkan pola pengeluaran Anda bulan ini.</p>
                {!aiAnalysis && !isAnalyzing ? (
                  <button onClick={handleGetAIAdvice} className="bg-white text-indigo-900 font-bold py-2.5 px-5 rounded-lg shadow-md hover:bg-gray-100 transition flex items-center gap-2 text-sm"><Bot size={18} /> Analisis Cashflow Saya Sekarang</button>
                ) : isAnalyzing ? (
                  <div className="bg-white/10 rounded-lg p-5 flex flex-col items-center justify-center space-y-3 animate-pulse border border-white/20"><RefreshCw className="animate-spin text-yellow-400" size={32} /><span className="text-sm font-semibold">AI Sedang Mengevaluasi Portofolio Anda...</span></div>
                ) : (
                  <div className="bg-white rounded-lg p-5 sm:p-6 text-gray-800 shadow-inner"><div className="text-xs sm:text-sm space-y-2">{formatMarkdown(aiAnalysis)}</div><button onClick={handleGetAIAdvice} className="mt-6 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded border border-indigo-100"><RefreshCw size={14} /> Minta Analisis Ulang</button></div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#1f3a5f] text-white p-4 font-bold text-xs sm:text-sm flex items-center gap-2"><Target size={16}/> TARGET BUDGET BULAN DEPAN (AUTO-HEMAT 10%)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 border-b border-gray-200 font-bold text-[10px] uppercase"><tr><th className="p-3">Kategori</th><th className="p-3">Realisasi Bulan Ini</th><th className="p-3 text-gray-400">Saran Sistem (Hemat 10%)</th><th className="p-3">Target Final Anda</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {allExpenseCats.map(cat => {
                    const realisasi = cashflowEval.expenseByCategory[cat] || 0;
                    const saranSys = realisasi * 0.9;
                    const manualVal = manualBudgets[cat] !== undefined ? manualBudgets[cat] : Math.round(saranSys);
                    return (
                      <tr key={cat} className="hover:bg-gray-50"><td className="p-3 font-bold text-gray-800">{cat}</td><td className="p-3 font-semibold">{formatRp(realisasi)}</td><td className="p-3 italic text-gray-400">{formatRp(saranSys)}</td><td className="p-3"><input type="number" value={manualVal} onChange={(e) => setManualBudgets({ ...manualBudgets, [cat]: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full max-w-[150px] p-2 border border-yellow-400 bg-yellow-50 rounded focus:ring-2 focus:ring-yellow-300 outline-none font-semibold text-gray-800" placeholder="Rp..."/></td></tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SETUP API & CATEGORY MODAL */}
      {isApiSetupOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-[#1f3a5f] text-white p-4 flex justify-between items-center font-bold"><h3 className="flex items-center gap-2"><Database size={18}/> Kategori & Koneksi</h3><button onClick={() => setIsApiSetupOpen(false)} className="hover:text-gray-300"><X size={20}/></button></div>
            <div className="p-5 space-y-6 overflow-y-auto text-xs sm:text-sm text-gray-700">
              <div className="space-y-3">
                <h4 className="font-bold flex items-center gap-1.5"><PlusCircle size={16}/> Tambah Kategori Kustom</h4>
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2"><input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nama kategori baru..." className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"/><select value={newCatType} onChange={(e) => setNewCatType(e.target.value)} className="p-2 border border-gray-300 rounded-lg outline-none"><option value="Pengeluaran">Pengeluaran</option><option value="Pemasukan">Pemasukan</option></select><button type="submit" className="bg-[#1f3a5f] text-white font-bold px-4 py-2 rounded-lg">Tambah</button></form>
                <div className="max-h-32 overflow-y-auto pr-1 space-y-1.5 mt-2">
                  {customIncomeCats.map(cat => (<div key={'inc-'+cat} className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-200"><span className="font-semibold text-green-800">{cat} (Masuk)</span><button onClick={() => handleDeleteCustomCat('Pemasukan', cat)} className="text-red-500"><Trash2 size={14}/></button></div>))}
                  {customExpenseCats.map(cat => (<div key={'exp-'+cat} className="flex justify-between items-center bg-red-50 p-2 rounded border border-red-200"><span className="font-semibold text-red-800">{cat} (Keluar)</span><button onClick={() => handleDeleteCustomCat('Pengeluaran', cat)} className="text-red-500"><Trash2 size={14}/></button></div>))}
                </div>
              </div>

              <hr className="my-2 border-gray-200" />
              
              <div className="space-y-3">
                <h4 className="font-bold flex items-center gap-1.5"><Wallet size={16}/> Tambah Akun Kustom</h4>
                <form onSubmit={handleAddAccount} className="flex flex-col sm:flex-row gap-2"><input type="text" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="Nama akun baru (e.g. Seabank)..." className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"/><button type="submit" className="bg-[#1f3a5f] text-white font-bold px-4 py-2 rounded-lg">Tambah</button></form>
                <div className="max-h-32 overflow-y-auto pr-1 space-y-1.5 mt-2">
                  {customAccounts.map(acc => (<div key={'acc-'+acc} className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-200"><span className="font-semibold text-blue-800">{acc}</span><button onClick={() => handleDeleteCustomAcc(acc)} className="text-red-500"><Trash2 size={14}/></button></div>))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end"><button onClick={() => setIsApiSetupOpen(false)} className="bg-[#1f3a5f] text-white font-bold px-5 py-2.5 rounded-xl">Tutup</button></div>
          </div>
        </div>
      )}
    </div>
  );
}