import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {

  private storedTransactions: Transaction[] = [];

setTransactions(data: Transaction[]) {
  this.storedTransactions = data;
}

getTransactions(): Transaction[] {
  return this.storedTransactions;
}

getTotalSpent(transactions: Transaction[]): number {
    return transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }

  getTotalIncome(transactions: Transaction[]): number {
    return transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getDailySpending(transactions: Transaction[]) {
    const map: any = {};

    transactions.forEach(t => {
      const day = t.date.toISOString().split('T')[0];

      if (!map[day]) map[day] = 0;

      if (t.amount < 0) {
        map[day] += Math.abs(t.amount);
      }
    });

    return map;
  }

  getTransactionsByMonth(transactions: Transaction[]) {
  const grouped: any = {};

  transactions.forEach(t => {
    const month = `${t.date.getFullYear()}-${t.date.getMonth()}`;

    if (!grouped[month]) {
      grouped[month] = [];
    }

    grouped[month].push(t);
  });

  return grouped;
}

getMonthlySummary(transactions: Transaction[]) {
  const summary: any = {};

  transactions.forEach(t => {
    const month = `${t.date.getFullYear()}-${t.date.getMonth()}`;

    if (!summary[month]) {
      summary[month] = {
        income: 0,
        spent: 0
      };
    }

    if (t.amount > 0) {
      summary[month].income += t.amount;
    } else {
      summary[month].spent += Math.abs(t.amount);
    }
  });

  return summary;
}

getMonthStats(transactions: Transaction[]) {
  let income = 0;
  let spent = 0;

  transactions.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else spent += Math.abs(t.amount);
  });

  return {
    income,
    spent,
    savings: income - spent
  };
}

getTopCategory(transactions: Transaction[]) {
  const map: any = {};

  transactions.forEach(t => {
    if (t.amount < 0) {
      const cat = t.category || 'Other';

      if (!map[cat]) map[cat] = 0;

      map[cat] += Math.abs(t.amount);
    }
  });

  let top = '';
  let max = 0;

  for (let key in map) {
    if (map[key] > max) {
      max = map[key];
      top = key;
    }
  }

  return { category: top, amount: max };
}

getSavingsRate(transactions: any[]): number {

  let income = 0;
  let spent = 0;

  transactions.forEach(t => {
    if (t.amount > 0) income += t.amount;
    else spent += Math.abs(t.amount);
  });

  if (income === 0) return 0;

  const savings = income - spent;

  return (savings / income) * 100;
}

getRecurringPayments(transactions: any[]) {

  const map: any = {};

  transactions.forEach((t: any) => {

    // ❌ ignore income
    if (t.amount > 0) return;

    const key = t.description.toLowerCase();

    if (!map[key]) {
      map[key] = [];
    }

    map[key].push(t);
  });

  const recurring: any[] = [];

  for (let key in map) {

    const list = map[key];

    if (list.length >= 2) {

      const months = list.map((t: any) =>
        new Date(t.date).getMonth()
      );

      const uniqueMonths = new Set(months);

      if (uniqueMonths.size >= 2) {
        recurring.push({
          name: key,
          amount: Math.abs(list[0].amount),
          occurrences: list.length
        });
      }
    }
  }

  return recurring;
}

getCategoryTotals(transactions: any[]): { [key: string]: number } {

  const totals: { [key: string]: number } = {};

  for (let t of transactions) {

    const category = t.category || 'Other';

    if (!totals[category]) {
      totals[category] = 0;
    }

    if (t.amount < 0) {
      totals[category] += Math.abs(t.amount);
    }
  }

  return totals;
}

getMonthlySpending(transactions: any[]): { [key: string]: number } {

  const monthly: { [key: string]: number } = {};

  for (let t of transactions) {

    if (t.amount < 0) {

      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      if (!monthly[key]) monthly[key] = 0;

      monthly[key] += Math.abs(t.amount);
    }
  }

  return monthly;
}


}
