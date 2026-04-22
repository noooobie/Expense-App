import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { FilterService } from 'src/app/filter.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';


interface Transaction {
  date: any;
  description: string;
  amount: number;
  category: string;
  location: string;
}

@Component({
  selector: 'app-budget',
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.css']
})
export class BudgetComponent implements OnInit {

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];

  budgets: { [key: string]: number } = {};
  categoryTransactions: { [key: string]: Transaction[] } = {};

  get selectedMonth() {
  return this.filterService.selectedMonth;
}

set selectedMonth(val: number) {
  this.filterService.selectedMonth = val;
}

get selectedYear() {
  return this.filterService.selectedYear;
}

set selectedYear(val: number) {
  this.filterService.selectedYear = val;
}

  constructor(private supabaseService: SupabaseService,
    private filterService: FilterService,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {

    // 🔥 LOAD FILTER FROM SAVINGS
    const savedMonth = localStorage.getItem('month');
    const savedYear = localStorage.getItem('year');

    if (savedMonth !== null) this.selectedMonth = Number(savedMonth);
    if (savedYear !== null) this.selectedYear = Number(savedYear);

    await this.loadData();
  }

  // =========================
  // LOAD DATA
  // =========================
  async loadData() {

    this.transactions = await this.supabaseService.getTransactions();

    const budgetsData = await this.supabaseService.getBudgets();

    this.budgets = {};
    (budgetsData || []).forEach((b: any) => {
      this.budgets[b.category] = Number(b.amount);
    });

    this.applyFilter();
  }

  // =========================
  // FILTER
  // =========================
  applyFilter() {

    this.filteredTransactions = this.transactions.filter(t => {
      const d = new Date(t.date);

      return (
        d.getMonth() === this.selectedMonth &&
        d.getFullYear() === this.selectedYear
      );
    });

    this.buildCategoryBreakdown();
  }

  // =========================
  // CATEGORY (FILTERED)
  // =========================
  buildCategoryBreakdown() {

    this.categoryTransactions = {};

    this.filteredTransactions.forEach(t => {

      if (t.amount > 0) return;

      let category = t.category;
      const desc = t.description?.toLowerCase() || '';

      if (
        desc.includes('aami') ||
        desc.includes('racv') ||
        desc.includes('internet') ||
        desc.includes('tpg') ||
        desc.includes('insurance')
      ) {
        category = 'Bills';
      }

      if (!this.categoryTransactions[category]) {
        this.categoryTransactions[category] = [];
      }

      this.categoryTransactions[category].push(t);
    });
  }

  // =========================
  // 🔥 SHOW ALL CATEGORIES (FIX)
  // =========================
  getAllCategories(): string[] {

    const fromTransactions = Object.keys(this.categoryTransactions);
    const fromBudgets = Object.keys(this.budgets);

    return Array.from(new Set([...fromTransactions, ...fromBudgets]));
  }

  // =========================
  // CALCULATIONS
  // =========================
  getCategoryTotal(transactions: Transaction[]): number {
    return transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  getBudgetPercent(category: string, value: Transaction[]): number {

    const spent = this.getCategoryTotal(value);
    const budget = this.budgets[category];

    if (!budget) return 5;

    return Math.min((spent / budget) * 100, 100);
  }

  getTotalBudget(): number {
    return Object.values(this.budgets || {})
      .reduce((sum, val) => sum + (Number(val) || 0), 0);
  }

  getTotalSpent(): number {

    let total = 0;

    Object.values(this.categoryTransactions).forEach((list: Transaction[]) => {
      list.forEach((t: Transaction) => {
        total += Math.abs(t.amount);
      });
    });

    return total;
  }

  getTotalPercent(): number {

    const budget = this.getTotalBudget();
    const spent = this.getTotalSpent();

    if (!budget) return 0;

    return Math.min((spent / budget) * 100, 100);
  }

  // =========================
  // SAVE
  // =========================
  async saveAllBudgets() {

    try {

      const promises = [];

      for (const category in this.budgets) {

        promises.push(
          this.supabaseService.upsertBudget(
            category,
            Number(this.budgets[category]) || 0
          )
        );
      }

      await Promise.all(promises);

      this.dialog.open(ConfirmDialogComponent, {
  width: '280px',
  panelClass: 'custom-dialog',
  data: {
    title: 'Success',
    message: 'Budget saved successfully'
  }
});

    } catch (err) {
      console.error(err);
      this.dialog.open(ConfirmDialogComponent, {
  width: '280px',
  panelClass: 'custom-dialog',
  data: {
    title: 'Error',
    message: 'Error saving budget'
  }
});
    }
  }
}