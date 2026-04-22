import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';
import { MatDialog } from '@angular/material/dialog';
import { AddTransactionDialogComponent } from '../add-transaction-dialog/add-transaction-dialog.component';
import * as XLSX from 'xlsx';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  transactions: any[] = [];
  filteredTransactions: any[] = [];

  totalIncome = 0;
  totalSpent = 0;

  sortDescending = true;
  showQuickActions = false;

  searchTerm: string = '';

  monthlySpent = 0;
  savingsPreview = 0;
  recurringTotal = 0;

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private supabaseService: SupabaseService,
    private analyticsService: AnalyticsService,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    await this.loadTransactions();
  }

  async loadTransactions() {

    this.transactions = await this.supabaseService.getTransactions();

    this.filteredTransactions = [...this.transactions];

    // 🔥 stats use FULL data
    this.totalIncome = this.analyticsService.getTotalIncome(this.transactions);
    this.totalSpent = this.analyticsService.getTotalSpent(this.transactions);

    this.calculatePreviewTiles();
  }

  @HostListener('document:click', ['$event'])
onClickOutside(event: Event) {

  const target = event.target as HTMLElement;

  // If click is NOT inside FAB or quick-actions → close
  if (
    !target.closest('.fab') &&
    !target.closest('.quick-actions')
  ) {
    this.showQuickActions = false;
  }
}

  // =========================
  // 🔍 SEARCH
  // =========================
  onSearchChange() {

    const term = this.searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredTransactions = [...this.transactions];
      return;
    }

    this.filteredTransactions = this.transactions.filter(t =>
      t.description?.toLowerCase().includes(term) ||
      t.location?.toLowerCase().includes(term) ||
      t.category?.toLowerCase().includes(term)
    );
  }

  // =========================
  // 🔥 GROUP FILTERED DATA
  // =========================
  getFilteredGroupedTransactions() {

    const grouped: any = {};

    this.filteredTransactions.forEach(t => {

      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    return grouped;
  }

  getSortedMonths(): string[] {

    const grouped = this.getFilteredGroupedTransactions();

    return Object.keys(grouped)
      .sort((a, b) => {

        const [yA, mA] = a.split('-').map(Number);
        const [yB, mB] = b.split('-').map(Number);

        const diff =
          new Date(yB, mB).getTime() -
          new Date(yA, mA).getTime();

        return this.sortDescending ? diff : -diff;
      });
  }

  // =========================
  // PREVIEW TILES (FULL DATA)
  // =========================
  calculatePreviewTiles() {

    const now = new Date();

    const currentMonthTransactions = this.transactions.filter(t => {
      const d = new Date(t.date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });

    this.monthlySpent = currentMonthTransactions
      .filter(t => t.amount < 0)
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

    this.savingsPreview = monthlyIncome - this.monthlySpent;

    // recurring
    const map: { [key: string]: any[] } = {};

    this.transactions.forEach(t => {

      if (t.amount > 0) return;

      const key = t.description?.toLowerCase()?.trim();
      if (!key) return;

      if (!map[key]) map[key] = [];
      map[key].push(t);
    });

    let recurring = 0;

    for (const key in map) {

      const list = map[key];
      if (list.length < 2) continue;

      const amounts = list.map(t => Math.abs(t.amount));
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      const consistent = amounts.every(a =>
        Math.abs(a - avg) < avg * 0.05
      );

      if (consistent) recurring += avg;
    }

    this.recurringTotal = Number(recurring.toFixed(2));
  }

  getCurrentBalance(): number {
    return this.totalIncome - this.totalSpent;
  }

  // =========================
  // HELPERS
  // =========================
  formatMonth(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month).toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });
  }

  toggleQuickActions() {
    this.showQuickActions = !this.showQuickActions;
  }

  closeQuickActions() {
    this.showQuickActions = false;
  }

  handleQuickAction(action: string) {
    this.closeQuickActions();

    if (action === 'add') this.openAddTransactionDialog();
    if (action === 'upload') this.triggerFileUpload();
  }

  openAddTransactionDialog() {

    const dialogRef = this.dialog.open(AddTransactionDialogComponent, {
      width: '95%',
  maxWidth: '420px',
  panelClass: 'custom-dialog'
    });

    dialogRef.afterClosed().subscribe(async (result) => {

      if (result) {

        result.category = this.autoCategorize(result.description);
        result.date = new Date(result.date);

        await this.supabaseService.addTransaction(result);
        await this.loadTransactions();
      }
    });
  }

  clearSearch() {
  this.searchTerm = '';
  this.filteredTransactions = [...this.transactions];
}

  triggerFileUpload() {
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: any) {

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e: any) => {

      const workbook = XLSX.read(e.target.result, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      for (let row of data as any[]) {

        const transaction = {
          date: new Date(row.Date),
          description: row.description,
          amount: Number(row.Amount),
          location: row.Location,
          category: this.autoCategorize(row.description || '')
        };

        await this.supabaseService.addTransaction(transaction);
      }

      await this.loadTransactions();
    };

    reader.readAsBinaryString(file);
  }

  autoCategorize(desc: string): string {

    if (!desc) return 'Other';

    const d = desc.toLowerCase();

    if (d.includes('woolworths') || d.includes('coles')) return 'Groceries';
    if (d.includes('bp') || d.includes('uber')) return 'Transport';
    if (d.includes('netflix')) return 'Entertainment';
    if (d.includes('tpg')) return 'Utilities';
    if (d.includes('salary')) return 'Income';
    if (d.includes('amazon') || d.includes('kmart')) return 'Shopping';

    return 'Other';
  }
}