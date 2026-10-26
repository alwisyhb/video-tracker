export type EditingStage =
  | '1. Ingest & Assembly'
  | '2. Rough Cut'
  | '3. Fine Cut & Pacing'
  | '4. Color & Audio'
  | '5. VFX & Motion'
  | '6. Final Export';

export type ProjectStatus = 'Belum Mulai' | 'Dalam Proses' | 'Revisi' | 'Selesai';

export type PriorityLevel = 'Tinggi' | 'Sedang' | 'Rendah';

export type PaymentStatus = 'Sudah Diterima' | 'DP / Termin' | 'Belum Diterima';

export type DueBadgeType = 'done' | 'overdue' | 'urgent' | 'soon' | 'scheduled';

export interface DueStatusInfo {
  daysLeft: number;
  label: string;
  type: DueBadgeType;
}

export interface VideoProject {
  id: string;
  code: string;
  name: string;
  client: string;
  platform: string;
  stage: EditingStage | string;
  startDate: string;
  deadline: string;
  deadlineTime: string;
  status: ProjectStatus | string;
  priority: PriorityLevel | string;
  duration: string;
  fee: number;
  videoType: string;
  paymentStatus: PaymentStatus | string;
  notes: string;
  reminderEnabled?: boolean;
}

export type TransactionType = 'income' | 'expense';

export type WalletType = 'Wondr By BNI' | 'Cash / Tunai' | 'E-Wallet (GoPay/Dana/Shopee)' | 'Tabungan';

export interface FinanceTransaction {
  id: string;
  title: string;
  type: TransactionType;
  category: string;
  wallet: WalletType | string;
  amount: number;
  date: string;
  notes?: string;
}

// Keep ExpenseRecord alias for backward compatibility with exportService
export type ExpenseRecord = FinanceTransaction;

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  icon?: string;
}

export interface PaymentProfile {
  editorName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  monthlyBudgetLimit?: number;
}
