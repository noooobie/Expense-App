import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { AnalyticsService } from '../../services/analytics.service';
import { Chart } from 'chart.js';
import { FilterService } from 'src/app/filter.service';

interface Transaction {
  date: any;
  description: string;
  amount: number;
  category: string;
  location: string;
}

@Component({
  selector: 'app-savings',
  templateUrl: './savings.component.html',
  styleUrls: ['./savings.component.css']
})
export class SavingsComponent implements OnInit {

  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  budgets: { [key: string]: number } = {};

  availableBalance = 0;
  recommendedSavings = 0;
  savingsRate = 0;

  insights: string[] = [];

  categoryTransactions: { [key: string]: Transaction[] } = {};
  recurringBreakdown: any[] = [];

  barChart: any;
  pieChart: any;

  // FILTER STATE
  viewMode: 'month' | 'year' = 'month';
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

  months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  years: number[] = [];

  // =========================
// BUDGET SYSTEM
// =========================

budgetInsights: string[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private analyticsService: AnalyticsService,
    private filterService: FilterService
    
  ) {}

async ngOnInit() {

  this.transactions = await this.supabaseService.getTransactions();

  const budgetsData = await this.supabaseService.getBudgets();

  this.budgets = {};
  (budgetsData || []).forEach((b: any) => {
    this.budgets[b.category] = Number(b.amount);
  });

  this.generateYears();

  // 🔥 FIX: ensure selectedYear exists
  if (!this.years.includes(this.selectedYear)) {
    this.selectedYear = this.years[0]; // pick latest year
  }

  this.applyFilter();
}

async saveBudget(category: string) {
  const amount = this.budgets[category] || 0;

  await this.supabaseService.upsertBudget(category, amount);
}

  // =========================
  // FILTERING
  // =========================
generateYears() {

  const set = new Set<number>();

  this.transactions.forEach(t => {
    const year = new Date(t.date).getFullYear();
    if (!isNaN(year)) set.add(year);
  });

  this.years = Array.from(set).sort((a, b) => b - a);

  console.log('YEARS:', this.years);
console.log('SELECTED:', this.selectedYear);
}

  setView(mode: 'month' | 'year') {
    this.viewMode = mode;
      localStorage.setItem('month', this.selectedMonth.toString());
  localStorage.setItem('year', this.selectedYear.toString());

    this.applyFilter();
  }

  onFilterChange() {
    localStorage.setItem('month', this.selectedMonth.toString());
  localStorage.setItem('year', this.selectedYear.toString());

    this.applyFilter();
  }

  applyFilter() {

    if (this.viewMode === 'month') {
      this.filteredTransactions = this.transactions.filter(t => {
        const d = new Date(t.date);
        return (
          d.getMonth() === Number(this.selectedMonth) &&
          d.getFullYear() === Number(this.selectedYear)
        );
      });
    } else {
      this.filteredTransactions = this.transactions.filter(t => {
        return new Date(t.date).getFullYear() === Number(this.selectedYear);
      });
    }

    console.log('FILTERED:', this.filteredTransactions);

    this.calculate();
  }

  // =========================
  // CALCULATIONS
  // =========================
  calculate() {

    if (this.filteredTransactions.length === 0) {
      this.availableBalance = 0;
      this.recommendedSavings = 0;
      this.savingsRate = 0;
      this.insights = ['⚠️ No data available for selected period'];
      this.categoryTransactions = {};
      this.recurringBreakdown = [];

      if (this.barChart) this.barChart.destroy();
      if (this.pieChart) this.pieChart.destroy();
      return;
    }

    const income = this.filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const spent = this.filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    this.availableBalance = income - spent;

    this.recommendedSavings = Math.min(
      income * 0.2,
      this.availableBalance * 0.5
    );

    this.savingsRate = income > 0
      ? (this.recommendedSavings / income) * 100
      : 0;

    this.generateInsights(income, spent);
    this.buildCategoryBreakdown();
    this.recurringBreakdown = this.getRecurringBreakdown();

    setTimeout(() => this.generateCharts(), 0);
  }

  // =========================
  // INSIGHTS
  // =========================
 generateInsights(income: number, spent: number) {

  this.insights = [];
  this.budgetInsights = [];

  if (this.filteredTransactions.length === 0) {
    this.insights.push('⚠️ No data available');
    return;
  }

  // 🔥 Spending health
  const ratio = spent / income;

  if (ratio > 0.8) {
    this.insights.push('⚠️ High spending this period');
  } else if (ratio > 0.6) {
    this.insights.push('⚠️ Moderate spending');
  } else {
    this.insights.push('✅ Healthy spending');
  }

  // 🔥 Month comparison (SMART)
  if (this.viewMode === 'month') {
    const prev = this.getPreviousMonthSpending();
    const current = this.getCurrentSpending();

    if (prev > 0) {
      const diff = ((current - prev) / prev) * 100;

      if (diff > 10) {
        this.insights.push(`⚠️ Spending increased by ${Math.round(diff)}% vs last month`);
      } else if (diff < -10) {
        this.insights.push(`✅ Spending decreased by ${Math.abs(Math.round(diff))}%`);
      }
    }
  }

  // 🔥 Top category
  const categoryTotals = this.analyticsService.getCategoryTotals(this.filteredTransactions);

  const top = Object.keys(categoryTotals)
    .sort((a, b) => categoryTotals[b] - categoryTotals[a])[0];

  if (top) {
    this.insights.push(`💡 Highest spending on ${top}`);
  }

  // 🔥 Budget analysis
  this.generateBudgetInsights(categoryTotals);

  this.insights.push(`💰 Recommended saving: A$${this.recommendedSavings.toFixed(2)}`);
}

generateBudgetInsights(categoryTotals: any) {

  this.budgetInsights = [];

  for (const cat in this.budgets) {

    const budget = this.budgets[cat];
    const spent = categoryTotals[cat] || 0;

    if (spent > budget) {
      this.budgetInsights.push(`🔴 ${cat}: Over budget by A$${(spent - budget).toFixed(2)}`);
    } else if (spent > budget * 0.8) {
      this.budgetInsights.push(`🟡 ${cat}: Near budget limit`);
    } else {
      this.budgetInsights.push(`🟢 ${cat}: Within budget`);
    }
  }
}

  // =========================
  // CATEGORY
  // =========================
 buildCategoryBreakdown() {

  this.categoryTransactions = {};

  this.filteredTransactions.forEach(t => {

    let category = t.category;

    const desc = t.description.toLowerCase();

    // 🔥 Normalize categories
    if (
      desc.includes('aami') ||
      desc.includes('racv') ||
      desc.includes('internet') ||
      desc.includes('tpg') ||
      desc.includes('insurance')
    ) {
      category = 'Bills';
    }

    // 🔥 REMOVE unwanted categories
    if (
      category.toLowerCase() === 'income' ||
      category.toLowerCase() === 'fitness'
    ) {
      return;
    }

    if (!this.categoryTransactions[category]) {
      this.categoryTransactions[category] = [];
    }

    this.categoryTransactions[category].push(t);
  });
}

  getTotalBudget(): number {
  return Object.values(this.budgets || {})
    .reduce((sum, val) => sum + (Number(val) || 0), 0);
}

getTotalSpent(): number {

  let total = 0;

  Object.values(this.categoryTransactions).forEach((list: Transaction[]) => {
    list.forEach((t: Transaction) => {
      if (t.amount < 0) {
        total += Math.abs(t.amount);
      }
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

  getCategoryTotal(transactions: Transaction[]): number {
  return transactions
    .filter(t => t.amount < 0) // 🔥 ONLY expenses
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

getBudgetPercent(category: string, value: Transaction[]): number {
  const total = this.getCategoryTotal(value);
  const budget = this.budgets[category];

  if (!budget || budget === 0) return 0;

  return Math.min((total / budget) * 100, 100);
}

  // 🔥 IMPORTANT FIX (used in HTML)
  getCategoryArray(value: any): Transaction[] {
    return value as Transaction[];
  }

  // =========================
  // RECURRING
  // =========================
  getRecurringBreakdown() {

    const map: { [key: string]: Transaction[] } = {};

    this.filteredTransactions.forEach(t => {

      if (t.amount > 0) return;

      const key = t.description.toLowerCase().trim();

      if (!map[key]) map[key] = [];

      map[key].push(t);
    });

    const recurring: any[] = [];

    for (const key in map) {

      const list = map[key];

      if (list.length < 2) continue;

      const amounts = list.map((t: Transaction) => Math.abs(t.amount));

      const avg =
        amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;

      const consistent = amounts.every((a: number) =>
        Math.abs(a - avg) < avg * 0.05
      );

      if (!consistent) continue;

      recurring.push({
        name: key,
        avgAmount: Number(avg.toFixed(2)),
        transactions: list
      });
    }

    return recurring;
  }

  // =========================
  // CHARTS
  // =========================
 generateCharts() {

  const income = this.filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const spent = this.filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const recurringTotal = this.recurringBreakdown
    .reduce((sum, r) => sum + Number(r.avgAmount), 0);

  if (this.barChart) this.barChart.destroy();
  if (this.pieChart) this.pieChart.destroy();

  // =========================
  // BAR CHART (v2 SAFE)
  // =========================
  this.barChart = new Chart('savingsBarChart', {
    type: 'bar',
    data: {
      labels: ['Income', 'Spending', 'Recurring', 'Savings'],
      datasets: [{
        data: [income, spent, recurringTotal, this.recommendedSavings],
        backgroundColor: ['#16a34a','#dc2626','#f59e0b','#2563eb']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      legend: {
        display: false
      },

      scales: {
        xAxes: [{
          ticks: { fontColor: '#9ca3af' },
          gridLines: { display: false }
        }],
        yAxes: [{
          ticks: { fontColor: '#9ca3af' },
          gridLines: { color: '#1f2937' }
        }]
      }
    }
  });

  // =========================
  // DONUT CHART (🔥 FIXED)
  // =========================
  const categoryData = this.analyticsService.getCategoryTotals(this.filteredTransactions);

  this.pieChart = new Chart('categoryChart', {
    type: 'doughnut',
    data: {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData) as number[],
        backgroundColor: [
          '#ef4444','#3b82f6','#f59e0b','#10b981',
          '#8b5cf6','#14b8a6','#f97316','#6366f1',
          '#22c55e','#eab308','#f43f5e','#0ea5e9'
        ],
        borderWidth: 2,
        borderColor: '#000'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      cutoutPercentage: 65,   // ✅ CORRECT for v2

      legend: {
        display: false        // 🔥 CRITICAL (prevents shrinking)
      }
    }
  });
}


  // =========================
// PREVIOUS MONTH SPENDING
// =========================
getPreviousMonthSpending(): number {

  const prevMonth = this.selectedMonth === 0 ? 11 : this.selectedMonth - 1;
  const year = this.selectedMonth === 0 ? this.selectedYear - 1 : this.selectedYear;

  const prev = this.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === prevMonth && d.getFullYear() === year;
  });

  return prev
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

// =========================
// CURRENT SPENDING
// =========================
getCurrentSpending(): number {
  return this.filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}
}