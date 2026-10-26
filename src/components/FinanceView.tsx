import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  FileSpreadsheet,
  PiggyBank,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { formatRupiah, formatShortDate } from '../constants';
import {
  generateWhatsAppInvoiceText,
  printClientInvoicePDF
} from '../services/exportService';
import type {
  FinanceTransaction,
  PaymentProfile,
  SavingsGoal,
  TransactionType,
  VideoProject,
  WalletType
} from '../types';
import { LightDismissDialog } from './LightDismissDialog';

interface FinanceViewProps {
  projects: VideoProject[];
  transactions: FinanceTransaction[];
  savingsGoals: SavingsGoal[];
  paymentProfile: PaymentProfile;
  onUpdatePaymentProfile: (profile: PaymentProfile) => void;
  onQuickPaymentToggle: (id: string) => void;
  onMarkClientPaid: (clientName: string) => void;
  onAddTransaction: (tx: FinanceTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddSavingsGoal: (goal: SavingsGoal) => void;
  onUpdateSavingsGoal: (id: string, addAmount: number) => void;
  onDeleteSavingsGoal: (id: string) => void;
  onSelectProject: (project: VideoProject) => void;
}

const WALLETS: WalletType[] = [
  'Wondr By BNI',
  'Cash / Tunai',
  'E-Wallet (GoPay/Dana/Shopee)',
  'Tabungan'
];

const EXPENSE_CATEGORIES = [
  'Makan & Minum',
  'Transportasi / Bensin',
  'Internet & Listrik',
  'Belanja / Kebutuhan Harian',
  'Software / Langganan',
  'Aset / Alat Kerja',
  'Hiburan / Nongkrong',
  'Tabungan / Investasi',
  'Lainnya'
];

const INCOME_CATEGORIES = [
  'Bonus / Tip Klien',
  'Freelance Luar / Syuting',
  'Gaji / Uang Saku',
  'Penjualan Aset / Template',
  'Transfer Masuk Lainnya'
];

export const FinanceView: React.FC<FinanceViewProps> = ({
  projects,
  transactions,
  savingsGoals,
  paymentProfile,
  onUpdatePaymentProfile,
  onQuickPaymentToggle,
  onMarkClientPaid,
  onAddTransaction,
  onDeleteTransaction,
  onAddSavingsGoal,
  onUpdateSavingsGoal,
  onDeleteSavingsGoal
}) => {
  // Active feature modals
  const [activeModal, setActiveModal] = useState<
    null | 'add-tx' | 'wallets' | 'budget-goals' | 'unpaid' | 'paid' | 'invoice'
  >(null);
  const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);

  // Minimal finance-only popup when clicking an editan project inside DB Keuangan
  const [selectedFinanceProjectId, setSelectedFinanceProjectId] = useState<string | null>(null);
  const selectedFinanceProject = useMemo(
    () => projects.find((p) => p.id === selectedFinanceProjectId) || null,
    [projects, selectedFinanceProjectId]
  );

  // Add transaction form state
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txTitle, setTxTitle] = useState('');
  const [txCategory, setTxCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [txWallet, setTxWallet] = useState<string>('Wondr By BNI');
  const [txAmount, setTxAmount] = useState<number>(25000);
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txNotes, setTxNotes] = useState('');

  // Savings goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState<number>(1500000);

  // Invoice generator state (editable items + confirmation step before OK/Print)
  const [selectedClient, setSelectedClient] = useState<string>('Jasaedit');
  const [invoiceFilterMode, setInvoiceFilterMode] = useState<'UNPAID' | 'PAID' | 'ALL'>('UNPAID');
  const [invoiceItems, setInvoiceItems] = useState<VideoProject[]>([]);
  const [newInvCode, setNewInvCode] = useState('');
  const [newInvName, setNewInvName] = useState('');
  const [newInvDate, setNewInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [newInvFee, setNewInvFee] = useState<number>(50000);
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);
  const [copiedWA, setCopiedWA] = useState(false);

  // Strictly separated Paid vs Unpaid editing projects
  const unpaidProjects = useMemo(
    () =>
      projects
        .filter((p) => p.paymentStatus !== 'Sudah Diterima' && (p.fee || 0) > 0)
        .sort((a, b) => {
          const aDone = a.status === 'Selesai' ? 0 : 1;
          const bDone = b.status === 'Selesai' ? 0 : 1;
          return aDone - bDone;
        }),
    [projects]
  );

  const paidProjects = useMemo(
    () => projects.filter((p) => p.paymentStatus === 'Sudah Diterima' && (p.fee || 0) > 0),
    [projects]
  );

  // Core numbers
  const paidEditFee = paidProjects.reduce((sum, p) => sum + (p.fee || 0), 0);
  const unpaidEditFee = unpaidProjects.reduce((sum, p) => sum + (p.fee || 0), 0);

  const personalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCashIn = paidEditFee + personalIncome;
  const netBalance = totalCashIn - totalExpenses;

  const monthlyBudget = paymentProfile.monthlyBudgetLimit || 1000000;
  const budgetUsedPct =
    monthlyBudget > 0 ? Math.min(100, Math.round((totalExpenses / monthlyBudget) * 100)) : 0;

  // Wallet breakdown
  const walletBalances = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    WALLETS.forEach((w) => map.set(w, { income: 0, expense: 0 }));
    const primaryWallet = map.get('Wondr By BNI')!;
    primaryWallet.income += paidEditFee;

    transactions.forEach((t) => {
      const w = t.wallet || 'Wondr By BNI';
      const cur = map.get(w) || { income: 0, expense: 0 };
      if (t.type === 'income') cur.income += t.amount || 0;
      else cur.expense += t.amount || 0;
      map.set(w, cur);
    });

    return Array.from(map.entries()).map(([name, val]) => ({
      name,
      income: val.income,
      expense: val.expense,
      balance: val.income - val.expense
    }));
  }, [paidEditFee, transactions]);

  const uniqueClients = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => {
      if (p.client && p.fee > 0) s.add(p.client);
    });
    return Array.from(s);
  }, [projects]);

  // Compute source projects for invoice when client or filter mode changes
  const sourceInvoiceProjects = useMemo(() => {
    return projects.filter((p) => {
      if ((p.fee || 0) <= 0) return false;
      if (selectedClient !== 'ALL' && p.client !== selectedClient) return false;
      if (invoiceFilterMode === 'UNPAID' && p.paymentStatus === 'Sudah Diterima') return false;
      if (invoiceFilterMode === 'PAID' && p.paymentStatus !== 'Sudah Diterima') return false;
      return true;
    });
  }, [projects, selectedClient, invoiceFilterMode]);

  useEffect(() => {
    setInvoiceItems(sourceInvoiceProjects);
  }, [sourceInvoiceProjects]);

  const invoiceTotalFee = invoiceItems.reduce((sum, p) => sum + (p.fee || 0), 0);

  const handleAddCustomInvoiceItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName.trim() || newInvFee <= 0) return;
    const item: VideoProject = {
      id: `inv-custom-${Date.now()}`,
      code: newInvCode.trim() || `INV-${invoiceItems.length + 1}`,
      name: newInvName.trim(),
      client: selectedClient === 'ALL' ? 'Umum' : selectedClient,
      platform: 'TikTok / Reels (9:16)',
      stage: '6. Final Export',
      startDate: newInvDate,
      deadline: newInvDate,
      deadlineTime: '',
      status: 'Selesai',
      priority: 'Sedang',
      duration: '-',
      fee: Number(newInvFee),
      videoType: 'Shorts / Reels / TikTok',
      paymentStatus: 'Belum Diterima',
      notes: ''
    };
    setInvoiceItems((prev) => [...prev, item]);
    setNewInvCode('');
    setNewInvName('');
    setNewInvFee(50000);
  };

  const handleRemoveInvoiceItem = (id: string) => {
    setInvoiceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenAddTx = (type: TransactionType) => {
    setTxType(type);
    setTxCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
    setTxTitle('');
    setTxNotes('');
    setActiveModal('add-tx');
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTitle.trim() || txAmount <= 0) return;
    onAddTransaction({
      id: `tx-${Date.now()}`,
      title: txTitle.trim(),
      type: txType,
      category: txCategory,
      wallet: txWallet,
      amount: Number(txAmount),
      date: txDate,
      notes: txNotes.trim()
    });
    setActiveModal(null);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || goalTarget <= 0) return;
    onAddSavingsGoal({
      id: `goal-${Date.now()}`,
      title: goalTitle.trim(),
      targetAmount: Number(goalTarget),
      savedAmount: 0
    });
    setGoalTitle('');
  };

  const handleCopyWA = async () => {
    const text = generateWhatsAppInvoiceText(
      selectedClient === 'ALL' ? 'Semua Klien' : selectedClient,
      invoiceItems,
      paymentProfile
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWA(true);
      setTimeout(() => setCopiedWA(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="view-container">
      {/* Header Dashboard Keuangan */}
      <div className="section-top-bar">
        <div>
          <h1 className="page-title">💰 DB Keuangan</h1>
          <p className="page-subtitle">
            Kelola pembayaran editan (Belum Dibayar vs Sudah Dibayar), dompet, dan cetak invoice
          </p>
        </div>

        <div className="top-bar-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleOpenAddTx('income')}
          >
            <ArrowUpRight size={16} aria-hidden="true" />
            <span>+ Pemasukan</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => handleOpenAddTx('expense')}
          >
            <ArrowDownRight size={16} aria-hidden="true" />
            <span>+ Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* 4 Kartu Ringkasan Keuangan (Dipisahkan Jelas antara Belum Dibayar & Sudah Dibayar) */}
      <section aria-label="Ringkasan Keuangan" className="kpi-grid">
        <button
          type="button"
          className="kpi-card kpi-amber"
          onClick={() => setActiveModal('unpaid')}
        >
          <div className="kpi-icon">
            <Wallet size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">EDITAN BELUM DIBAYAR</span>
            <strong className="kpi-value">{formatRupiah(unpaidEditFee)}</strong>
            <span className="kpi-caption">{unpaidProjects.length} editan belum dibayar →</span>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card kpi-emerald"
          onClick={() => setActiveModal('paid')}
        >
          <div className="kpi-icon">
            <CheckCircle2 size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">EDITAN SUDAH DIBAYAR</span>
            <strong className="kpi-value">{formatRupiah(paidEditFee)}</strong>
            <span className="kpi-caption">{paidProjects.length} editan sudah lunas →</span>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card kpi-teal"
          onClick={() => setActiveModal('wallets')}
        >
          <div className="kpi-icon">
            <CreditCard size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">SALDO BERSIH SAAT INI</span>
            <strong className="kpi-value">{formatRupiah(netBalance)}</strong>
            <span className="kpi-caption">Ketuk untuk rincian dompet →</span>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card kpi-rose"
          onClick={() => setActiveModal('budget-goals')}
        >
          <div className="kpi-icon">
            <TrendingDown size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">TOTAL PENGELUARAN</span>
            <strong className="kpi-value">{formatRupiah(totalExpenses)}</strong>
            <span className="kpi-caption">Terpakai {budgetUsedPct}% dari anggaran →</span>
          </div>
        </button>
      </section>

      {/* Menu Navigasi Fitur Keuangan */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Menu Pengelolaan Keuangan</h2>
            <p className="panel-subtitle">Pilih kategori pembayaran atau cetak invoice</p>
          </div>
        </div>

        <div className="nav-menu-grid">
          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => setActiveModal('unpaid')}
          >
            <div className="tile-icon rose">
              <Wallet size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Editan Belum Dibayar ({unpaidProjects.length})</strong>
              <span>Daftar piutang editan yang belum ditransfer</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => setActiveModal('paid')}
          >
            <div className="tile-icon emerald">
              <CheckCircle2 size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Editan Sudah Dibayar ({paidProjects.length})</strong>
              <span>Daftar editan yang pembayarannya sudah lunas</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => setActiveModal('invoice')}
          >
            <div className="tile-icon blue">
              <FileSpreadsheet size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Cetak Invoice Tagihan</strong>
              <span>Input/hapus item tagihan & cetak PDF / WA</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => setActiveModal('wallets')}
          >
            <div className="tile-icon indigo">
              <CreditCard size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Dompet & Rekening</strong>
              <span>Wondr By BNI, Cash, E-Wallet & Tabungan</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>
        </div>
      </section>

      {/* Riwayat Transaksi Pribadi & Operasional */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Catatan Pemasukan & Pengeluaran ({transactions.length})</h2>
            <p className="panel-subtitle">Ketuk baris untuk melihat nominal atau menghapus</p>
          </div>
          <button
            type="button"
            className="link-btn"
            onClick={() => handleOpenAddTx('expense')}
          >
            <Plus size={15} aria-hidden="true" />
            <span>Catat Baru</span>
          </button>
        </div>

        <div className="compact-nav-list">
          {transactions.map((tx) => {
            const isIncome = tx.type === 'income';
            return (
              <button
                key={tx.id}
                type="button"
                className="compact-row-btn"
                onClick={() => setSelectedTx(tx)}
              >
                <div className="compact-row-left">
                  <span className={`tx-type-badge ${isIncome ? 'inc' : 'exp'}`}>
                    {isIncome ? 'MASUK' : 'KELUAR'}
                  </span>
                  <div className="compact-row-titles">
                    <strong>{tx.title}</strong>
                    <span>
                      {tx.category} • {formatShortDate(tx.date)}
                    </span>
                  </div>
                </div>
                <div className="compact-row-right">
                  <strong className={isIncome ? 'text-success' : 'text-danger'}>
                    {isIncome ? '+' : '-'}
                    {formatRupiah(tx.amount)}
                  </strong>
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          MODAL 1: Catat Transaksi Baru (Pemasukan / Pengeluaran)
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'add-tx'}
        onClose={() => setActiveModal(null)}
        title={txType === 'income' ? '➕ Catat Pemasukan Baru' : '💸 Catat Pengeluaran Baru'}
        subtitle="Simpan catatan arus kas pribadi maupun operasional"
      >
        <form onSubmit={handleSaveTransaction} className="project-form">
          <div className="segmented-control" style={{ width: '100%' }}>
            <button
              type="button"
              className={`seg-btn ${txType === 'expense' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setTxType('expense');
                setTxCategory(EXPENSE_CATEGORIES[0]);
              }}
            >
              💸 Pengeluaran
            </button>
            <button
              type="button"
              className={`seg-btn ${txType === 'income' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setTxType('income');
                setTxCategory(INCOME_CATEGORIES[0]);
              }}
            >
              💰 Pemasukan
            </button>
          </div>

          <div className="form-field">
            <label htmlFor="tx-title">Judul / Keperluan</label>
            <input
              id="tx-title"
              type="text"
              value={txTitle}
              onChange={(e) => setTxTitle(e.target.value)}
              placeholder={
                txType === 'expense'
                  ? 'Contoh: Makan Siang / Kuota Internet / CapCut Pro'
                  : 'Contoh: Bonus Klien / Syuting Freelance'
              }
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="tx-cat">Kategori</label>
              <select
                id="tx-cat"
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
              >
                {(txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="tx-wallet">Sumber Dompet / Rekening</label>
              <select
                id="tx-wallet"
                value={txWallet}
                onChange={(e) => setTxWallet(e.target.value)}
              >
                {WALLETS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="tx-amount">Nominal (Rp)</label>
              <input
                id="tx-amount"
                type="number"
                min={500}
                step={1000}
                value={txAmount}
                onChange={(e) => setTxAmount(Number(e.target.value))}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="tx-date">Tanggal</label>
              <input
                id="tx-date"
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="tx-notes">Catatan Tambahan (Opsional)</label>
            <input
              id="tx-notes"
              type="text"
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Keterangan singkat..."
            />
          </div>

          <div className="dialog-actions">
            <div className="dialog-actions-right">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveModal(null)}
              >
                Batal
              </button>
              <button type="submit" className="btn-primary">
                <Check size={16} aria-hidden="true" />
                <span>Simpan Transaksi</span>
              </button>
            </div>
          </div>
        </form>
      </LightDismissDialog>

      {/* =====================================================================
          MODAL 2: Dompet & Rekening
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'wallets'}
        onClose={() => setActiveModal(null)}
        title="🏦 Rincian Dompet & Rekening"
        subtitle="Posisi saldo berdasarkan fee editan yang cair dan transaksi harian"
      >
        <div className="compact-nav-list" style={{ marginBottom: 18 }}>
          {walletBalances.map((w) => (
            <div key={w.name} className="compact-row-btn">
              <div className="compact-row-left">
                <div className="compact-row-titles">
                  <strong>{w.name}</strong>
                  <span>
                    Masuk: {formatRupiah(w.income)} • Keluar: {formatRupiah(w.expense)}
                  </span>
                </div>
              </div>
              <strong className={w.balance >= 0 ? 'text-success' : 'text-danger'}>
                {formatRupiah(w.balance)}
              </strong>
            </div>
          ))}
        </div>

        <div className="bank-rekening-card">
          <div className="bank-rekening-header">
            <CreditCard size={18} aria-hidden="true" />
            <strong>Profil Rekening Utama (Untuk Invoice)</strong>
          </div>
          <div className="form-grid-3">
            <div className="form-field">
              <label htmlFor="w-bank">Nama Bank</label>
              <input
                id="w-bank"
                type="text"
                value={paymentProfile.bankName}
                onChange={(e) =>
                  onUpdatePaymentProfile({ ...paymentProfile, bankName: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="w-acc">No. Rekening</label>
              <input
                id="w-acc"
                type="text"
                value={paymentProfile.accountNumber}
                onChange={(e) =>
                  onUpdatePaymentProfile({
                    ...paymentProfile,
                    accountNumber: e.target.value
                  })
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="w-holder">Atas Nama</label>
              <input
                id="w-holder"
                type="text"
                value={paymentProfile.accountHolder}
                onChange={(e) =>
                  onUpdatePaymentProfile({
                    ...paymentProfile,
                    accountHolder: e.target.value,
                    editorName: e.target.value
                  })
                }
              />
            </div>
          </div>
        </div>
      </LightDismissDialog>

      {/* =====================================================================
          MODAL 3: Anggaran Bulanan & Target Tabungan
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'budget-goals'}
        onClose={() => setActiveModal(null)}
        title="🎯 Anggaran Bulanan & Target Tabungan"
        subtitle="Kontrol batas pengeluaran dan wujudkan target tabunganmu"
      >
        <div className="detail-section-box" style={{ marginBottom: 16 }}>
          <div className="stage-progress-label" style={{ marginBottom: 6 }}>
            <span>
              Pemakaian Anggaran: <strong>{formatRupiah(totalExpenses)}</strong> dari{' '}
              <strong>{formatRupiah(monthlyBudget)}</strong>
            </span>
            <strong>{budgetUsedPct}%</strong>
          </div>
          <div className="progress-track" style={{ marginBottom: 10 }}>
            <div
              className="progress-fill"
              style={{
                width: `${budgetUsedPct}%`,
                background: budgetUsedPct > 85 ? '#f43f5e' : undefined
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="budget-limit">Atur Batas Anggaran Pengeluaran Bulanan (Rp)</label>
            <input
              id="budget-limit"
              type="number"
              step={50000}
              value={monthlyBudget}
              onChange={(e) =>
                onUpdatePaymentProfile({
                  ...paymentProfile,
                  monthlyBudgetLimit: Number(e.target.value)
                })
              }
            />
          </div>
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: 15 }}>Celengan & Target Tabungan</h3>
        <div className="compact-nav-list" style={{ marginBottom: 14 }}>
          {savingsGoals.map((g) => {
            const pct =
              g.targetAmount > 0
                ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100))
                : 0;
            return (
              <div key={g.id} className="detail-section-box">
                <div className="stage-bar-top">
                  <strong>🎯 {g.title}</strong>
                  <span>
                    {formatRupiah(g.savedAmount)} / {formatRupiah(g.targetAmount)} ({pct}%)
                  </span>
                </div>
                <div className="progress-track" style={{ margin: '6px 0 10px 0' }}>
                  <div className="progress-fill progress-emerald" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="chip-btn chip-success"
                    onClick={() => onUpdateSavingsGoal(g.id, 50000)}
                  >
                    + Tabung 50rb
                  </button>
                  <button
                    type="button"
                    className="chip-btn chip-success"
                    onClick={() => onUpdateSavingsGoal(g.id, 100000)}
                  >
                    + Tabung 100rb
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => onDeleteSavingsGoal(g.id)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleCreateGoal} className="new-client-inline-box">
          <label htmlFor="goal-title">Buat Target Tabungan Baru</label>
          <div className="form-grid-2" style={{ marginBottom: 8 }}>
            <input
              id="goal-title"
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Mis: Upgrade RAM / Kamera"
              required
            />
            <input
              type="number"
              step={50000}
              value={goalTarget}
              onChange={(e) => setGoalTarget(Number(e.target.value))}
              placeholder="Target Rp"
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            <Plus size={15} aria-hidden="true" />
            <span>Tambah Target Tabungan</span>
          </button>
        </form>
      </LightDismissDialog>

      {/* =====================================================================
          MODAL 4A & 4B: Daftar Editan Belum Dibayar (Piutang) vs Sudah Dibayar
          (Dipisahkan dengan tegas & saat item diklik hanya tampil status bayar)
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'unpaid' || activeModal === 'paid'}
        onClose={() => setActiveModal(null)}
        title={
          activeModal === 'unpaid'
            ? `⏳ Editan Belum Dibayar (${unpaidProjects.length})`
            : `✅ Editan Sudah Dibayar (${paidProjects.length})`
        }
        subtitle={
          activeModal === 'unpaid'
            ? `Total piutang belum dibayar: ${formatRupiah(unpaidEditFee)}`
            : `Total pembayaran editan diterima: ${formatRupiah(paidEditFee)}`
        }
      >
        {/* Tab Pemisah Tegas: Belum Dibayar vs Sudah Dibayar */}
        <div className="segmented-control" style={{ width: '100%', marginBottom: 14 }}>
          <button
            type="button"
            className={`seg-btn ${activeModal === 'unpaid' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setActiveModal('unpaid')}
          >
            ⏳ Belum Dibayar ({unpaidProjects.length})
          </button>
          <button
            type="button"
            className={`seg-btn ${activeModal === 'paid' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setActiveModal('paid')}
          >
            ✅ Sudah Dibayar ({paidProjects.length})
          </button>
        </div>

        <div className="compact-nav-list">
          {(activeModal === 'unpaid' ? unpaidProjects : paidProjects).map((p) => {
            const isPaid = p.paymentStatus === 'Sudah Diterima';
            return (
              <div
                key={p.id}
                className="compact-row-btn"
                onClick={() => setSelectedFinanceProjectId(p.id)}
              >
                <div className="compact-row-left">
                  <span className="code-pill">{p.code}</span>
                  <div className="compact-row-titles">
                    <strong>{p.name}</strong>
                    <span>
                      {p.client} • {isPaid ? '✅ Sudah Dibayar' : '⏳ Belum Dibayar'}
                    </span>
                  </div>
                </div>
                <div className="compact-row-right">
                  <strong>{formatRupiah(p.fee)}</strong>
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </LightDismissDialog>

      {/* =====================================================================
          POPUP RINGKAS KEUANGAN SAAT ITEM EDITAN DIKLIK
          (Hanya menampilkan sudah dibayar atau belum — tanpa data tahap editing!)
         ===================================================================== */}
      <LightDismissDialog
        open={Boolean(selectedFinanceProject)}
        onClose={() => setSelectedFinanceProjectId(null)}
        title={selectedFinanceProject ? `[${selectedFinanceProject.code}] ${selectedFinanceProject.name}` : 'Status Pembayaran'}
        subtitle={selectedFinanceProject ? `Klien: ${selectedFinanceProject.client}` : ''}
      >
        {selectedFinanceProject && (() => {
          const isPaid = selectedFinanceProject.paymentStatus === 'Sudah Diterima';
          return (
            <div className="detail-modal-content">
              <div className="detail-info-grid">
                <div className="detail-info-cell">
                  <span className="detail-cell-label">Nominal Fee</span>
                  <strong style={{ fontSize: 18 }}>{formatRupiah(selectedFinanceProject.fee)}</strong>
                </div>
                <div className="detail-info-cell">
                  <span className="detail-cell-label">Status Pembayaran</span>
                  <strong className={isPaid ? 'text-success' : 'text-danger'} style={{ fontSize: 16 }}>
                    {isPaid ? '✅ Sudah Dibayar' : '⏳ Belum Dibayar'}
                  </strong>
                </div>
              </div>

              <div className="detail-section-box">
                <span className="detail-cell-label" style={{ display: 'block', marginBottom: 10 }}>
                  Ubah Status Pembayaran:
                </span>
                <div className="form-grid-2">
                  <button
                    type="button"
                    className={isPaid ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => {
                      if (isPaid) onQuickPaymentToggle(selectedFinanceProject.id);
                      setSelectedFinanceProjectId(null);
                    }}
                  >
                    <span>⏳ Belum Dibayar</span>
                  </button>
                  <button
                    type="button"
                    className={isPaid ? 'btn-primary' : 'btn-secondary'}
                    onClick={() => {
                      if (!isPaid) onQuickPaymentToggle(selectedFinanceProject.id);
                      setSelectedFinanceProjectId(null);
                    }}
                  >
                    <Check size={16} aria-hidden="true" />
                    <span>✅ Sudah Dibayar</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </LightDismissDialog>

      {/* =====================================================================
          MODAL 5: Generator Invoice Klien (Bisa Input & Hapus Data + Konfirmasi OK)
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'invoice'}
        onClose={() => {
          setShowInvoiceConfirm(false);
          setActiveModal(null);
        }}
        title="🧾 Cetak Invoice Pembayaran"
        subtitle={`Rekening: ${paymentProfile.accountNumber} (${paymentProfile.bankName}) a/n ${paymentProfile.accountHolder}`}
      >
        <div className="invoice-controls">
          <div className="form-field">
            <label htmlFor="inv-client">Pilih Klien Tagihan</label>
            <select
              id="inv-client"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="ALL">Semua Klien</option>
              {uniqueClients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="inv-status">Sumber Data Awal</label>
            <select
              id="inv-status"
              value={invoiceFilterMode}
              onChange={(e) =>
                setInvoiceFilterMode(e.target.value as 'UNPAID' | 'PAID' | 'ALL')
              }
            >
              <option value="UNPAID">⏳ Hanya yang Belum Dibayar</option>
              <option value="PAID">✅ Hanya yang Sudah Dibayar</option>
              <option value="ALL">Semua Proyek Berbayar</option>
            </select>
          </div>
        </div>

        {/* Form Input Tambah Baris Data ke Invoice */}
        <form onSubmit={handleAddCustomInvoiceItem} className="new-client-inline-box" style={{ marginBottom: 14 }}>
          <label htmlFor="inv-new-name">➕ Input / Tambah Data Baru ke Daftar Invoice</label>
          <div className="form-grid-2" style={{ marginBottom: 8 }}>
            <input
              id="inv-new-code"
              type="text"
              value={newInvCode}
              onChange={(e) => setNewInvCode(e.target.value)}
              placeholder="Kode (mis. JE999)"
            />
            <input
              id="inv-new-name"
              type="text"
              value={newInvName}
              onChange={(e) => setNewInvName(e.target.value)}
              placeholder="Nama Video / Deskripsi Tagihan *"
              required
            />
          </div>
          <div className="form-grid-2" style={{ marginBottom: 8 }}>
            <input
              type="date"
              value={newInvDate}
              onChange={(e) => setNewInvDate(e.target.value)}
            />
            <input
              type="number"
              min={1000}
              step={5000}
              value={newInvFee}
              onChange={(e) => setNewInvFee(Number(e.target.value))}
              placeholder="Fee (Rp)"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn-secondary" style={{ flex: 1 }}>
              <Plus size={15} aria-hidden="true" />
              <span>+ Tambah Baris ke Invoice</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setInvoiceItems(sourceInvoiceProjects)}
              title="Muat ulang daftar awal"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </form>

        {/* Tabel Daftar Data Invoice (Bisa Hapus Baris) */}
        <div className="invoice-table-wrapper" style={{ marginBottom: 14 }}>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Kode</th>
                <th>Proyek / Item</th>
                <th style={{ textAlign: 'right' }}>Fee</th>
                <th style={{ textAlign: 'center' }}>Hapus</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 18 }}>
                    Belum ada data di invoice. Silakan input data di atas atau pilih klien lain.
                  </td>
                </tr>
              ) : (
                invoiceItems.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td>
                      <span className="code-pill">{p.code}</span>
                    </td>
                    <td>{p.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(p.fee)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => handleRemoveInvoiceItem(p.id)}
                        title="Hapus baris ini dari invoice"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  <strong>Total Tagihan ({invoiceItems.length} data)</strong>
                </td>
                <td colSpan={2} style={{ textAlign: 'right' }}>
                  <strong className="invoice-grand-total">{formatRupiah(invoiceTotalFee)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Tombol OK dengan Konfirmasi Terlebih Dahulu */}
        <div className="invoice-action-buttons">
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={invoiceItems.length === 0}
            onClick={() => setShowInvoiceConfirm(true)}
          >
            <Check size={16} aria-hidden="true" />
            <span>OK — Lanjut Cetak / Bagikan Invoice ({invoiceItems.length} Data)</span>
          </button>
        </div>
      </LightDismissDialog>

      {/* =====================================================================
          MODAL KONFIRMASI SEBELUM CETAK / OK INVOICE
         ===================================================================== */}
      <LightDismissDialog
        open={showInvoiceConfirm}
        onClose={() => setShowInvoiceConfirm(false)}
        title="⚠️ Konfirmasi Cetak Invoice"
        subtitle="Pastikan seluruh data tagihan sudah benar sebelum mencetak"
      >
        <div className="detail-modal-content">
          <div className="project-note-banner" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} aria-hidden="true" />
            <span>
              Apakah Anda yakin data invoice untuk <strong>{selectedClient === 'ALL' ? 'Semua Klien' : selectedClient}</strong> sudah benar?
            </span>
          </div>

          <div className="detail-info-grid">
            <div className="detail-info-cell">
              <span className="detail-cell-label">Klien Tagihan</span>
              <strong>{selectedClient === 'ALL' ? 'Semua Klien' : selectedClient}</strong>
            </div>
            <div className="detail-info-cell">
              <span className="detail-cell-label">Jumlah Data</span>
              <strong>{invoiceItems.length} Item Video</strong>
            </div>
            <div className="detail-info-cell">
              <span className="detail-cell-label">Total Tagihan</span>
              <strong className="text-success" style={{ fontSize: 17 }}>
                {formatRupiah(invoiceTotalFee)}
              </strong>
            </div>
            <div className="detail-info-cell">
              <span className="detail-cell-label">Rekening Tujuan</span>
              <strong>{paymentProfile.bankName} ({paymentProfile.accountNumber})</strong>
            </div>
          </div>

          <div className="invoice-action-buttons" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setShowInvoiceConfirm(false);
                printClientInvoicePDF(
                  selectedClient === 'ALL' ? 'Semua Klien' : selectedClient,
                  invoiceItems,
                  paymentProfile
                );
              }}
            >
              <Printer size={16} aria-hidden="true" />
              <span>Ya, OK Cetak PDF Invoice</span>
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                handleCopyWA();
              }}
            >
              {copiedWA ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  <span>Teks WA Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  <span>Ya, Salin Teks WA</span>
                </>
              )}
            </button>

            {selectedClient !== 'ALL' && (
              <button
                type="button"
                className="chip-btn chip-success"
                onClick={() => {
                  onMarkClientPaid(selectedClient);
                  setShowInvoiceConfirm(false);
                }}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>Tandai Semua {selectedClient} Sudah Dibayar</span>
              </button>
            )}

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowInvoiceConfirm(false)}
            >
              Batal / Periksa Lagi
            </button>
          </div>
        </div>
      </LightDismissDialog>

      {/* =====================================================================
          MODAL 6: Detail Transaksi Saat Baris Diklik
         ===================================================================== */}
      <LightDismissDialog
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={selectedTx?.title || 'Detail Transaksi'}
        subtitle={
          selectedTx
            ? `${selectedTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} • ${formatShortDate(
                selectedTx.date
              )}`
            : ''
        }
      >
        {selectedTx && (
          <div className="detail-modal-content">
            <div className="detail-info-grid">
              <div className="detail-info-cell">
                <span className="detail-cell-label">Nominal</span>
                <strong
                  className={selectedTx.type === 'income' ? 'text-success' : 'text-danger'}
                >
                  {selectedTx.type === 'income' ? '+' : '-'}
                  {formatRupiah(selectedTx.amount)}
                </strong>
              </div>
              <div className="detail-info-cell">
                <span className="detail-cell-label">Status / Jenis</span>
                <strong>{selectedTx.type === 'income' ? '✅ Uang Masuk' : '💸 Uang Keluar'}</strong>
              </div>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  onDeleteTransaction(selectedTx.id);
                  setSelectedTx(null);
                }}
              >
                <Trash2 size={15} aria-hidden="true" />
                <span>Hapus Transaksi Ini</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedTx(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </LightDismissDialog>
    </div>
  );
};
