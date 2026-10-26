import React, { useMemo, useState } from 'react';
import {
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
  Trash2,
  TrendingDown,
  TrendingUp,
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
  onDeleteSavingsGoal,
  onSelectProject
}) => {
  // Active feature modals (Progressive disclosure so the dashboard stays clean)
  const [activeModal, setActiveModal] = useState<
    null | 'add-tx' | 'wallets' | 'budget-goals' | 'unpaid' | 'invoice'
  >(null);
  const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);

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

  // Invoice generator state
  const [selectedClient, setSelectedClient] = useState<string>('Jasaedit');
  const [invoiceFilterMode, setInvoiceFilterMode] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [copiedWA, setCopiedWA] = useState(false);

  // Core numbers
  const paidEditFee = projects
    .filter((p) => p.paymentStatus === 'Sudah Diterima')
    .reduce((sum, p) => sum + (p.fee || 0), 0);
  const unpaidEditFee = projects
    .filter((p) => p.paymentStatus !== 'Sudah Diterima')
    .reduce((sum, p) => sum + (p.fee || 0), 0);

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
    // Editing fees go to primary bank (Wondr By BNI)
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

  const unpaidProjects = useMemo(
    () => projects.filter((p) => p.paymentStatus !== 'Sudah Diterima' && p.fee > 0),
    [projects]
  );

  const uniqueClients = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => {
      if (p.client && p.fee > 0) s.add(p.client);
    });
    return Array.from(s);
  }, [projects]);

  const invoiceProjects = useMemo(() => {
    return projects.filter((p) => {
      if (p.fee <= 0) return false;
      if (selectedClient !== 'ALL' && p.client !== selectedClient) return false;
      if (invoiceFilterMode === 'UNPAID' && p.paymentStatus === 'Sudah Diterima') return false;
      if (invoiceFilterMode === 'PAID' && p.paymentStatus !== 'Sudah Diterima') return false;
      return true;
    });
  }, [projects, selectedClient, invoiceFilterMode]);

  const invoiceTotalFee = invoiceProjects.reduce((sum, p) => sum + (p.fee || 0), 0);

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
      invoiceProjects,
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
          <h1 className="page-title">💰 Dashboard Keuanganku</h1>
          <p className="page-subtitle">
            Kelola uang pribadi, dompet, anggaran bulanan, piutang editan, dan invoice klien
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

      {/* 4 Kartu Ringkasan Keuangan (Klik untuk buka detail popup) */}
      <section aria-label="Ringkasan Keuangan" className="kpi-grid">
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
          className="kpi-card kpi-emerald"
          onClick={() => handleOpenAddTx('income')}
        >
          <div className="kpi-icon">
            <TrendingUp size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">TOTAL UANG MASUK CAIR</span>
            <strong className="kpi-value">{formatRupiah(totalCashIn)}</strong>
            <span className="kpi-caption">
              Editan: {formatRupiah(paidEditFee)} • Lain: {formatRupiah(personalIncome)}
            </span>
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
            <span className="kpi-label">TOTAL PENGELUARANKU</span>
            <strong className="kpi-value">{formatRupiah(totalExpenses)}</strong>
            <span className="kpi-caption">Terpakai {budgetUsedPct}% dari anggaran →</span>
          </div>
        </button>

        <button
          type="button"
          className="kpi-card kpi-amber"
          onClick={() => setActiveModal('unpaid')}
        >
          <div className="kpi-icon">
            <Wallet size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">PIUTANG EDITAN KLIEN</span>
            <strong className="kpi-value">{formatRupiah(unpaidEditFee)}</strong>
            <span className="kpi-caption">{unpaidProjects.length} video belum cair →</span>
          </div>
        </button>
      </section>

      {/* Menu Navigasi Fitur Keuangan (Ketuk untuk membuka detail modul) */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Menu Pengelolaan Keuanganku</h2>
            <p className="panel-subtitle">Ketuk menu untuk membuka rincian dan pengaturan</p>
          </div>
        </div>

        <div className="nav-menu-grid">
          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => setActiveModal('wallets')}
          >
            <div className="tile-icon indigo">
              <CreditCard size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Dompet & Rekeningku</strong>
              <span>Wondr By BNI, Cash, E-Wallet & Tabungan</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => setActiveModal('budget-goals')}
          >
            <div className="tile-icon emerald">
              <PiggyBank size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Anggaran & Target Tabungan</strong>
              <span>Batas belanja bulanan & celengan impian</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => setActiveModal('unpaid')}
          >
            <div className="tile-icon rose">
              <Wallet size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Piutang Editan ({unpaidProjects.length})</strong>
              <span>Daftar fee klien yang belum ditransfer</span>
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
              <strong>Generator Invoice (Sheet 2)</strong>
              <span>Cetak PDF tagihan & salin teks WA</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>
        </div>
      </section>

      {/* Riwayat Transaksi Pribadi & Operasional (Ringkas, klik untuk detail) */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Riwayat Catatan Keuanganku ({transactions.length})</h2>
            <p className="panel-subtitle">Ketuk baris transaksi untuk melihat detail atau menghapus</p>
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
                      {tx.category} • {tx.wallet || 'Wondr By BNI'} • {formatShortDate(tx.date)}
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
        subtitle="Simpan catatan arus kas pribadi maupun operasional editing"
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
          MODAL 2: Dompet & Rekeningku
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'wallets'}
        onClose={() => setActiveModal(null)}
        title="🏦 Rincian Dompet & Rekeningku"
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
            <strong>Profil Rekening Utama (Untuk Invoice Sheet 2)</strong>
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

        <h3 style={{ margin: '0 0 10px 0', fontSize: 15 }}>Celengan & Target Tabunganku</h3>
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
          MODAL 4: Daftar Piutang Editan Klien
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'unpaid'}
        onClose={() => setActiveModal(null)}
        title={`⏳ Piutang Editan Belum Cair (${unpaidProjects.length})`}
        subtitle={`Total menunggu pembayaran: ${formatRupiah(unpaidEditFee)}`}
      >
        <div className="compact-nav-list">
          {unpaidProjects.map((p) => (
            <div key={p.id} className="compact-row-btn">
              <div
                className="compact-row-left"
                onClick={() => {
                  setActiveModal(null);
                  onSelectProject(p);
                }}
              >
                <span className="code-pill">{p.code}</span>
                <div className="compact-row-titles">
                  <strong>{p.name}</strong>
                  <span>
                    {p.client} • Status: {p.status}
                  </span>
                </div>
              </div>
              <div className="compact-row-right">
                <strong>{formatRupiah(p.fee)}</strong>
                <button
                  type="button"
                  className="chip-btn chip-success"
                  onClick={() => onQuickPaymentToggle(p.id)}
                >
                  <Check size={14} aria-hidden="true" />
                  <span>Lunas</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </LightDismissDialog>

      {/* =====================================================================
          MODAL 5: Generator Invoice Klien (Sheet 2)
         ===================================================================== */}
      <LightDismissDialog
        open={activeModal === 'invoice'}
        onClose={() => setActiveModal(null)}
        title="🧾 Generator Invoice & Rekap Pembayaran"
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
            <label htmlFor="inv-status">Filter Status Pembayaran</label>
            <select
              id="inv-status"
              value={invoiceFilterMode}
              onChange={(e) =>
                setInvoiceFilterMode(e.target.value as 'ALL' | 'UNPAID' | 'PAID')
              }
            >
              <option value="ALL">Semua Proyek Berbayar</option>
              <option value="UNPAID">⏳ Hanya yang Belum Dibayar</option>
              <option value="PAID">✅ Hanya yang Sudah Lunas</option>
            </select>
          </div>
        </div>

        <div className="invoice-action-buttons">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              printClientInvoicePDF(
                selectedClient === 'ALL' ? 'Semua Klien' : selectedClient,
                invoiceProjects,
                paymentProfile
              )
            }
          >
            <Printer size={16} aria-hidden="true" />
            <span>Cetak / PDF Invoice</span>
          </button>

          <button type="button" className="btn-secondary" onClick={handleCopyWA}>
            {copiedWA ? (
              <>
                <Check size={16} aria-hidden="true" />
                <span>Tersalin!</span>
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden="true" />
                <span>Salin Teks WA</span>
              </>
            )}
          </button>

          {selectedClient !== 'ALL' && (
            <button
              type="button"
              className="chip-btn chip-success"
              onClick={() => onMarkClientPaid(selectedClient)}
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Lunasi Semua {selectedClient}</span>
            </button>
          )}
        </div>

        <div className="invoice-table-wrapper">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tgl Take</th>
                <th>Kode</th>
                <th>Proyek</th>
                <th style={{ textAlign: 'right' }}>Fee</th>
              </tr>
            </thead>
            <tbody>
              {invoiceProjects.map((p, idx) => (
                <tr key={p.id}>
                  <td>{idx + 1}</td>
                  <td>{p.startDate || '-'}</td>
                  <td>
                    <span className="code-pill">{p.code}</span>
                  </td>
                  <td>{p.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatRupiah(p.fee)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>
                  <strong>Total Fee ({invoiceProjects.length} video)</strong>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <strong className="invoice-grand-total">{formatRupiah(invoiceTotalFee)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
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
                <span className="detail-cell-label">Dompet / Rekening</span>
                <strong>{selectedTx.wallet || 'Wondr By BNI'}</strong>
              </div>
              <div className="detail-info-cell">
                <span className="detail-cell-label">Kategori</span>
                <strong>{selectedTx.category}</strong>
              </div>
              <div className="detail-info-cell">
                <span className="detail-cell-label">Tanggal</span>
                <strong>{formatShortDate(selectedTx.date)}</strong>
              </div>
            </div>
            {selectedTx.notes && (
              <div className="project-note-banner">📝 Catatan: {selectedTx.notes}</div>
            )}
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
