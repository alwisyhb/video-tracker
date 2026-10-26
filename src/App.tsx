import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clapperboard,
  Cloud,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Plus,
  Wallet
} from 'lucide-react';
import { AlertsSettingsView } from './components/AlertsSettingsView';
import { CalendarView } from './components/CalendarView';
import { CloudSyncModal } from './components/CloudSyncModal';
import { DashboardView } from './components/DashboardView';
import { ExitVerificationModal } from './components/ExitVerificationModal';
import { FinanceView } from './components/FinanceView';
import { ProjectDetailModal } from './components/ProjectDetailModal';
import { ProjectFormModal } from './components/ProjectFormModal';
import { ProjectsView } from './components/ProjectsView';
import { SplashScreen } from './components/SplashScreen';
import {
  DEFAULT_CLIENTS,
  DEFAULT_PAYMENT_PROFILE,
  EDITING_STAGES,
  calculateDueStatus
} from './constants';
import seedProjectsData from './data/seedProjects.json';
import {
  loadCloudSyncConfig,
  pullFromGoogleSheets,
  pushToGoogleSheets,
  saveCloudSyncConfig,
  type CloudSyncConfig
} from './services/googleSheetsSync';
import type {
  FinanceTransaction,
  PaymentProfile,
  SavingsGoal,
  VideoProject
} from './types';

type ActiveTab = 'dashboard' | 'projects' | 'calendar' | 'finance' | 'alerts';

const STORAGE_KEYS = {
  PROJECTS: 'alwi_tracker_projects_v1',
  CLIENTS: 'alwi_tracker_clients_v1',
  TRANSACTIONS: 'alwi_tracker_transactions_v2',
  GOALS: 'alwi_tracker_goals_v1',
  PROFILE: 'alwi_tracker_profile_v1'
};

const DEFAULT_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'tx-default-1',
    title: 'Langganan CapCut Pro / Tools Editing',
    type: 'expense',
    category: 'Software / Langganan',
    wallet: 'Wondr By BNI',
    amount: 75000,
    date: '2026-10-05',
    notes: 'Langganan bulanan aplikasi editing'
  },
  {
    id: 'tx-default-2',
    title: 'Paket Internet & Listrik Render',
    type: 'expense',
    category: 'Internet & Listrik',
    wallet: 'Wondr By BNI',
    amount: 100000,
    date: '2026-10-12',
    notes: 'Kuota upload & download footage'
  },
  {
    id: 'tx-default-3',
    title: 'Bonus Tip Klien Video',
    type: 'income',
    category: 'Bonus / Tip Klien',
    wallet: 'Wondr By BNI',
    amount: 50000,
    date: '2026-10-18',
    notes: 'Bonus pengerjaan cepat'
  }
];

const DEFAULT_GOALS: SavingsGoal[] = [
  {
    id: 'goal-1',
    title: 'Upgrade Storage SSD / RAM Laptop',
    targetAmount: 1500000,
    savedAmount: 450000
  },
  {
    id: 'goal-2',
    title: 'Dana Darurat Pribadi',
    targetAmount: 3000000,
    savedAmount: 750000
  }
];

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAppExited, setIsAppExited] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [projects, setProjects] = useState<VideoProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return seedProjectsData as VideoProject[];
  });

  const [clientsList, setClientsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    const merged = new Set<string>(DEFAULT_CLIENTS);
    (seedProjectsData as VideoProject[]).forEach((p) => {
      if (p.client && p.client.trim()) merged.add(p.client.trim());
    });
    return Array.from(merged);
  });

  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_TRANSACTIONS;
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_GOALS;
  });

  const [paymentProfile, setPaymentProfile] = useState<PaymentProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { ...DEFAULT_PAYMENT_PROFILE, monthlyBudgetLimit: 1000000 };
  });

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<VideoProject | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Cloud Sync state
  const [cloudConfig, setCloudConfig] = useState<CloudSyncConfig>(() =>
    loadCloudSyncConfig()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');

  // Keep refs for back button handler
  const stateRef = useRef({
    activeTab,
    isFormModalOpen,
    selectedDetailId,
    isCloudModalOpen,
    isExitModalOpen
  });
  stateRef.current = {
    activeTab,
    isFormModalOpen,
    selectedDetailId,
    isCloudModalOpen,
    isExitModalOpen
  };

  // Navigate to tab and push history state so phone Back button works naturally
  const navigateToTab = useCallback((nextTab: ActiveTab) => {
    setActiveTab((prev) => {
      if (prev !== nextTab) {
        try {
          window.history.pushState({ tab: nextTab }, '', `#${nextTab}`);
        } catch {
          // ignore
        }
      }
      return nextTab;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Intercept browser/Android hardware Back button
  useEffect(() => {
    // Seed initial history guard entry so pressing Back on Home triggers popstate instead of leaving immediately
    try {
      window.history.replaceState({ tab: 'dashboard', guard: true }, '', '#dashboard');
      window.history.pushState({ tab: 'dashboard' }, '', '#dashboard');
    } catch {
      // ignore
    }

    const handleBackAction = () => {
      const cur = stateRef.current;

      // 1. If any modal is open, close the modal first
      if (cur.isFormModalOpen) {
        setIsFormModalOpen(false);
        return;
      }
      if (cur.selectedDetailId) {
        setSelectedDetailId(null);
        return;
      }
      if (cur.isCloudModalOpen) {
        setIsCloudModalOpen(false);
        return;
      }
      if (cur.isExitModalOpen) {
        setIsExitModalOpen(false);
        return;
      }

      // 2. If on DB Proyek, DB Keuangan, Kalender, or Pengingat -> Return to Menu Awal (dashboard)
      if (cur.activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        try {
          window.history.pushState({ tab: 'dashboard' }, '', '#dashboard');
        } catch {
          // ignore
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 3. If already on Menu Awal (dashboard) -> Open 2-Step Exit Verification Modal!
      setIsExitModalOpen(true);
      try {
        window.history.pushState({ tab: 'dashboard' }, '', '#dashboard');
      } catch {
        // ignore
      }
    };

    const onPopState = () => {
      handleBackAction();
    };

    const onHardwareBack = (e: Event) => {
      e.preventDefault();
      handleBackAction();
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('backbutton', onHardwareBack);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('backbutton', onHardwareBack);
    };
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clientsList));
    } catch {
      // ignore
    }
  }, [clientsList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch {
      // ignore
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(savingsGoals));
    } catch {
      // ignore
    }
  }, [savingsGoals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(paymentProfile));
    } catch {
      // ignore
    }
  }, [paymentProfile]);

  // Auto-sync to Google Sheets when data changes (if scriptUrl & autoSync are enabled)
  useEffect(() => {
    if (!cloudConfig.autoSync || !cloudConfig.scriptUrl.trim()) return;
    const timer = setTimeout(async () => {
      const res = await pushToGoogleSheets(cloudConfig, {
        updatedAt: new Date().toISOString(),
        projects,
        clientsList,
        transactions,
        savingsGoals,
        paymentProfile
      });
      if (res.ok) {
        const updated = { ...cloudConfig, lastSyncedAt: new Date().toISOString() };
        saveCloudSyncConfig(updated);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [projects, clientsList, transactions, savingsGoals, paymentProfile, cloudConfig]);

  const handleManualPushCloud = async () => {
    setIsSyncing(true);
    setSyncStatusMessage('🔄 Menyimpan seluruh data ke Google Sheets...');
    const res = await pushToGoogleSheets(cloudConfig, {
      updatedAt: new Date().toISOString(),
      projects,
      clientsList,
      transactions,
      savingsGoals,
      paymentProfile
    });
    setIsSyncing(false);
    setSyncStatusMessage(res.ok ? `✅ ${res.message}` : `⚠️ ${res.message}`);
    if (res.ok) {
      const nextCfg = { ...cloudConfig, lastSyncedAt: new Date().toISOString() };
      setCloudConfig(nextCfg);
      saveCloudSyncConfig(nextCfg);
    }
  };

  const handleManualPullCloud = async () => {
    setIsSyncing(true);
    setSyncStatusMessage('🔄 Menarik data terbaru dari Google Sheets...');
    const res = await pullFromGoogleSheets(cloudConfig);
    setIsSyncing(false);
    setSyncStatusMessage(res.ok ? `✅ ${res.message}` : `⚠️ ${res.message}`);

    if (res.ok && res.data) {
      if (res.data.projects && res.data.projects.length > 0) {
        setProjects(res.data.projects);
      }
      if (res.data.clientsList && res.data.clientsList.length > 0) {
        setClientsList(res.data.clientsList);
      }
      if (res.data.transactions && res.data.transactions.length > 0) {
        setTransactions(res.data.transactions);
      }
      if (res.data.savingsGoals && res.data.savingsGoals.length > 0) {
        setSavingsGoals(res.data.savingsGoals);
      }
      if (res.data.paymentProfile) {
        setPaymentProfile(res.data.paymentProfile);
      }
      const nextCfg = { ...cloudConfig, lastSyncedAt: new Date().toISOString() };
      setCloudConfig(nextCfg);
      saveCloudSyncConfig(nextCfg);
    }
  };

  const handleSaveCloudConfig = (newCfg: CloudSyncConfig) => {
    setCloudConfig(newCfg);
    saveCloudSyncConfig(newCfg);
    setSyncStatusMessage('✅ Pengaturan Auto-Sync Google Sheets berhasil disimpan!');
  };

  const urgentCount = projects.filter(
    (p) => p.status !== 'Selesai' && calculateDueStatus(p).daysLeft <= 3
  ).length;

  const selectedDetailProject =
    projects.find((p) => p.id === selectedDetailId) || null;

  const handleAddNewClient = (clientName: string) => {
    const cleaned = clientName.trim();
    if (!cleaned) return;
    setClientsList((prev) => {
      if (prev.some((c) => c.toLowerCase() === cleaned.toLowerCase())) return prev;
      return [cleaned, ...prev];
    });
  };

  const handleRemoveClient = (clientName: string) => {
    setClientsList((prev) => prev.filter((c) => c !== clientName));
  };

  const handleOpenAddModal = () => {
    setEditingProject(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (project: VideoProject) => {
    setEditingProject(project);
    setIsFormModalOpen(true);
  };

  const handleSaveProject = (project: VideoProject) => {
    if (project.client) {
      handleAddNewClient(project.client);
    }
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      if (exists) {
        return prev.map((p) => (p.id === project.id ? project : p));
      }
      return [project, ...prev];
    });
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleQuickStatusChange = (id: string, newStatus: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          status: newStatus,
          stage: newStatus === 'Selesai' ? '6. Final Export' : p.stage
        };
      })
    );
  };

  const handleQuickStageSelect = (id: string, newStage: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          stage: newStage,
          status: newStage === '6. Final Export' ? 'Selesai' : 'Dalam Proses'
        };
      })
    );
  };

  const handleQuickPaymentToggle = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextStatus =
          p.paymentStatus === 'Sudah Diterima' ? 'Belum Diterima' : 'Sudah Diterima';
        return { ...p, paymentStatus: nextStatus };
      })
    );
  };

  const handleQuickAdvanceStage = (project: VideoProject) => {
    const idx = EDITING_STAGES.findIndex((s) => s === project.stage);
    const nextIdx = idx < EDITING_STAGES.length - 1 ? idx + 1 : idx;
    const nextStage = EDITING_STAGES[nextIdx] || '6. Final Export';
    const nextStatus = nextStage === '6. Final Export' ? 'Selesai' : 'Dalam Proses';

    setProjects((prev) =>
      prev.map((p) =>
        p.id === project.id
          ? {
              ...p,
              stage: nextStage,
              status: nextStatus
            }
          : p
      )
    );
  };

  const handleMarkClientPaid = (clientName: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.client === clientName ? { ...p, paymentStatus: 'Sudah Diterima' } : p
      )
    );
  };

  const handleAddTransaction = (tx: FinanceTransaction) => {
    setTransactions((prev) => [tx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddSavingsGoal = (goal: SavingsGoal) => {
    setSavingsGoals((prev) => [...prev, goal]);
  };

  const handleUpdateSavingsGoal = (id: string, addAmount: number) => {
    setSavingsGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, savedAmount: g.savedAmount + addAmount } : g
      )
    );
  };

  const handleDeleteSavingsGoal = (id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleToggleReminder = (id: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, reminderEnabled: p.reminderEnabled === false } : p
      )
    );
  };

  const handleImportBackup = (data: {
    projects?: VideoProject[];
    expenses?: FinanceTransaction[];
    profile?: PaymentProfile;
  }) => {
    if (data.projects) setProjects(data.projects);
    if (data.expenses) setTransactions(data.expenses);
    if (data.profile) setPaymentProfile(data.profile);
  };

  const handleResetToSeed = () => {
    setProjects(seedProjectsData as VideoProject[]);
    setTransactions(DEFAULT_TRANSACTIONS);
    setSavingsGoals(DEFAULT_GOALS);
    setClientsList(DEFAULT_CLIENTS);
    setPaymentProfile({ ...DEFAULT_PAYMENT_PROFILE, monthlyBudgetLimit: 1000000 });
  };

  const handleConfirmExitApp = () => {
    setIsExitModalOpen(false);
    setIsAppExited(true);
    try {
      window.close();
    } catch {
      // ignore
    }
  };

  // Screen shown after completing 2-step exit verification
  if (isAppExited) {
    return (
      <div className="splash-overlay">
        <div className="splash-card">
          <div className="splash-logo-core">
            <Clapperboard size={36} aria-hidden="true" />
          </div>
          <h1 className="splash-title">Sampai Jumpa, Alwi! 👋</h1>
          <p className="splash-subtitle">
            Seluruh data proyek dan catatan keuangan Anda telah dikunci & disimpan dengan aman.
          </p>
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => {
              setIsAppExited(false);
              setShowSplash(true);
            }}
          >
            Buka Kembali Aplikasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {showSplash && (
        <SplashScreen
          projectCount={projects.length}
          onFinish={() => setShowSplash(false)}
        />
      )}

      {/* Top App Header */}
      <header className="app-header">
        <div
          className="brand-area"
          onClick={() => navigateToTab('dashboard')}
          onDoubleClick={() => setShowSplash(true)}
          title="Ketuk untuk ke Menu Utama"
        >
          <div className="brand-logo">
            <Clapperboard size={22} aria-hidden="true" />
          </div>
          <div>
            <span className="brand-title">Alwi Studio & Finance</span>
            <span className="brand-sub">Project • Timeline • Personal Finance</span>
          </div>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsCloudModalOpen(true)}
            title="Sinkronisasi Google Sheets Cloud"
          >
            <Cloud size={16} aria-hidden="true" />
            <span>Cloud Sync</span>
          </button>

          <button
            type="button"
            className="notif-pill-btn"
            onClick={() => navigateToTab('alerts')}
            aria-label={`Peringatan deadline mendesak: ${urgentCount} proyek`}
          >
            <Bell size={16} aria-hidden="true" />
            <span>{urgentCount}</span>
          </button>

          {activeTab === 'dashboard' && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setIsExitModalOpen(true)}
              title="Keluar Aplikasi (Verifikasi 2 Langkah)"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {/* Tombol Kembali ke Menu Awal saat berada di halaman selain Dashboard Utama */}
        {activeTab !== 'dashboard' && (
          <div className="back-to-home-bar">
            <button
              type="button"
              className="back-home-btn"
              onClick={() => navigateToTab('dashboard')}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Kembali ke Menu Awal</span>
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            projects={projects}
            transactions={transactions}
            onOpenAddModal={handleOpenAddModal}
            onSelectProject={(p) => setSelectedDetailId(p.id)}
            onNavigateTab={navigateToTab}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            clientsList={clientsList}
            onAddNewClient={handleAddNewClient}
            onRemoveClient={handleRemoveClient}
            onOpenAddModal={handleOpenAddModal}
            onSelectProject={(p) => setSelectedDetailId(p.id)}
            onQuickAdvanceStage={handleQuickAdvanceStage}
          />
        )}

        {activeTab === 'finance' && (
          <FinanceView
            projects={projects}
            transactions={transactions}
            savingsGoals={savingsGoals}
            paymentProfile={paymentProfile}
            onUpdatePaymentProfile={setPaymentProfile}
            onQuickPaymentToggle={handleQuickPaymentToggle}
            onMarkClientPaid={handleMarkClientPaid}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddSavingsGoal={handleAddSavingsGoal}
            onUpdateSavingsGoal={handleUpdateSavingsGoal}
            onDeleteSavingsGoal={handleDeleteSavingsGoal}
            onSelectProject={(p) => setSelectedDetailId(p.id)}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            projects={projects}
            onSelectProject={(p) => setSelectedDetailId(p.id)}
            onOpenAddModal={handleOpenAddModal}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsSettingsView
            projects={projects}
            expenses={transactions}
            paymentProfile={paymentProfile}
            onEditProject={(p) => setSelectedDetailId(p.id)}
            onToggleReminder={handleToggleReminder}
            onImportBackup={handleImportBackup}
            onResetToSeed={handleResetToSeed}
          />
        )}
      </main>

      {/* Floating Action Button for Mobile Quick Add */}
      <button
        type="button"
        className="mobile-fab"
        onClick={handleOpenAddModal}
        aria-label="Tambah pekerjaan baru"
      >
        <Plus size={24} aria-hidden="true" />
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="bottom-nav" aria-label="Navigasi Utama Aplikasi">
        <button
          type="button"
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigateToTab('dashboard')}
        >
          <LayoutDashboard size={20} aria-hidden="true" />
          <span>Menu Utama</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => navigateToTab('projects')}
        >
          <FolderKanban size={20} aria-hidden="true" />
          <span>DB Proyek</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`}
          onClick={() => navigateToTab('finance')}
        >
          <Wallet size={20} aria-hidden="true" />
          <span>DB Keuangan</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => navigateToTab('calendar')}
        >
          <Calendar size={20} aria-hidden="true" />
          <span>Kalender</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => navigateToTab('alerts')}
        >
          <div className="nav-icon-badge-wrap">
            <Bell size={20} aria-hidden="true" />
            {urgentCount > 0 && <span className="nav-badge">{urgentCount}</span>}
          </div>
          <span>Pengingat</span>
        </button>
      </nav>

      {/* Modal Detail Proyek */}
      <ProjectDetailModal
        project={selectedDetailProject}
        open={Boolean(selectedDetailProject)}
        onClose={() => setSelectedDetailId(null)}
        onEditProject={handleOpenEditModal}
        onQuickStatusChange={handleQuickStatusChange}
        onQuickStageSelect={handleQuickStageSelect}
        onQuickPaymentToggle={handleQuickPaymentToggle}
        onDeleteProject={handleDeleteProject}
      />

      {/* Modal Tambah / Edit Pekerjaan + Tambah Klien Baru */}
      <ProjectFormModal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
        initialProject={editingProject}
        existingProjects={projects}
        clientsList={clientsList}
        onAddNewClient={handleAddNewClient}
      />

      {/* Modal Cloud Sync Google Sheets (Opsi 2) */}
      <CloudSyncModal
        open={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        config={cloudConfig}
        onSaveConfig={handleSaveCloudConfig}
        onTriggerPush={handleManualPushCloud}
        onTriggerPull={handleManualPullCloud}
        syncStatusMessage={syncStatusMessage}
        isSyncing={isSyncing}
      />

      {/* Modal Verifikasi 2 Langkah Saat Keluar Aplikasi */}
      <ExitVerificationModal
        open={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirmExit={handleConfirmExitApp}
        onSyncAndExit={handleManualPushCloud}
        hasCloudUrl={Boolean(cloudConfig.scriptUrl.trim())}
      />
    </div>
  );
};
