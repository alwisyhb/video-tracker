import React, { useEffect, useState } from 'react';
import {
  Bell,
  Calendar,
  Clapperboard,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Wallet
} from 'lucide-react';
import { AlertsSettingsView } from './components/AlertsSettingsView';
import { CalendarView } from './components/CalendarView';
import { DashboardView } from './components/DashboardView';
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

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<VideoProject | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

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
          onClick={() => setActiveTab('dashboard')}
          onDoubleClick={() => setShowSplash(true)}
          title="Ketuk untuk ke Menu Utama (Ketuk 2x untuk putar ulang animasi loading)"
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
            className="notif-pill-btn"
            onClick={() => setActiveTab('alerts')}
            aria-label={`Peringatan deadline mendesak: ${urgentCount} proyek`}
          >
            <Bell size={16} aria-hidden="true" />
            <span>{urgentCount} Mendesak</span>
          </button>

          <button
            type="button"
            className="btn-primary header-add-btn"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Tambah Pekerjaan</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <DashboardView
            projects={projects}
            transactions={transactions}
            onOpenAddModal={handleOpenAddModal}
            onSelectProject={(p) => setSelectedDetailId(p.id)}
            onNavigateTab={setActiveTab}
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
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={20} aria-hidden="true" />
          <span>Menu Utama</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <FolderKanban size={20} aria-hidden="true" />
          <span>DB Proyek</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'finance' ? 'active' : ''}`}
          onClick={() => setActiveTab('finance')}
        >
          <Wallet size={20} aria-hidden="true" />
          <span>DB Keuangan</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          <Calendar size={20} aria-hidden="true" />
          <span>Kalender</span>
        </button>

        <button
          type="button"
          className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <div className="nav-icon-badge-wrap">
            <Bell size={20} aria-hidden="true" />
            {urgentCount > 0 && <span className="nav-badge">{urgentCount}</span>}
          </div>
          <span>Pengingat</span>
        </button>
      </nav>

      {/* Modal Detail Proyek (Muncul saat baris proyek diklik) */}
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
    </div>
  );
};
