import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef
} from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';
import { SupabaseService } from '../../services/supabase.service';
import { Transaction } from '../../models/transaction.model';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-monthly-summary',
  templateUrl: './monthly-summary.component.html',
  styleUrls: ['./monthly-summary.component.css']
})
export class MonthlySummaryComponent implements OnInit, AfterViewInit {

  transactions: Transaction[] = [];
  groupedTransactions: any = {};

  months: string[] = [];
  selectedMonthIndex = 0;

  categoryChart: any;
  incomeChart: any;

  @ViewChild('categoryChart') categoryChartRef!: ElementRef;
  @ViewChild('incomeChart') incomeChartRef!: ElementRef;

  constructor(
    private analyticsService: AnalyticsService,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    console.log('Loading transactions...');

    this.transactions = await this.supabaseService.getTransactions();

    console.log('Transactions:', this.transactions);

    this.groupedTransactions =
      this.analyticsService.getTransactionsByMonth(this.transactions);

    this.months = Object.keys(this.groupedTransactions).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    this.selectedMonthIndex = this.months.length - 1;
  }

  ngAfterViewInit() {
    // ⛔ DO NOT load charts here directly anymore
    // We wait until data is ready
    setTimeout(() => {
      this.safeLoadCharts();
    }, 300);
  }

  // 🔁 Navigation
  prevMonth() {
    if (this.selectedMonthIndex > 0) {
      this.selectedMonthIndex--;
      this.safeLoadCharts();
    }
  }

  nextMonth() {
    if (this.selectedMonthIndex < this.months.length - 1) {
      this.selectedMonthIndex++;
      this.safeLoadCharts();
    }
  }

  getSelectedMonth(): string {
    return this.months[this.selectedMonthIndex];
  }

  getCurrentMonthTransactions(): Transaction[] {
    const month = this.getSelectedMonth();
    return this.groupedTransactions[month] || [];
  }

  // 🔥 SAFE CHART LOADER
  safeLoadCharts() {
    const data = this.getCurrentMonthTransactions();

    console.log('Current month data:', data);

    if (!data || data.length === 0) {
      console.warn('No data for chart');
      return;
    }

    if (!this.categoryChartRef || !this.incomeChartRef) {
      console.warn('Canvas not ready');
      return;
    }

    this.loadCategoryChart(data);
    this.loadIncomeChart(data);
  }

  // 🥧 CATEGORY CHART
loadCategoryChart(transactions: Transaction[]) {

  const map: any = {};

  transactions.forEach(t => {
    if (t.amount < 0) {
      const cat = t.category || 'Other';

      if (!map[cat]) map[cat] = 0;
      map[cat] += Math.abs(t.amount);
    }
  });

  const labels = Object.keys(map);
  const values = Object.values(map) as number[];

  if (this.categoryChart) {
    this.categoryChart.destroy();
  }

  const ctx = this.categoryChartRef.nativeElement.getContext('2d');

  this.categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#FF6384', // pink
            '#36A2EB', // blue
            '#FFCE56', // yellow
            '#4BC0C0', // teal
            '#9966FF', // purple
            '#FF9F40'  // orange
          ]
        }
      ]
    },
    options: {
    responsive: true,
    maintainAspectRatio: true, // ✅ IMPORTANT
    aspectRatio: 1             // ✅ forces square
}
  });
}

  // 📊 INCOME CHART
  loadIncomeChart(transactions: Transaction[]) {

  const stats = this.analyticsService.getMonthStats(transactions);

  if (this.incomeChart) {
    this.incomeChart.destroy();
  }

  const ctx = this.incomeChartRef.nativeElement.getContext('2d');

  this.incomeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Spending'],
      datasets: [
        {
          data: [stats.income, stats.spent],
          backgroundColor: [
            '#4CAF50', // green
            '#F44336'  // red
          ]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      legend: {
        display: false
      }
    }
  });
}

  getCurrentMonthStats() {
  return this.analyticsService.getMonthStats(
    this.getCurrentMonthTransactions()
  );
}

getTopCategory() {
  return this.analyticsService.getTopCategory(
    this.getCurrentMonthTransactions()
  );
}

formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month);

  return date.toLocaleString('default', {
    month: 'long',
    year: 'numeric'
  });
}

getSavingsRate() {
  return this.analyticsService.getSavingsRate(
    this.getCurrentMonthTransactions()
  );
}
}