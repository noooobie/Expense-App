import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-recurring-payments',
  templateUrl: './recurring-payments.component.html',
  styleUrls: ['./recurring-payments.component.css']
})
export class RecurringPaymentsComponent implements OnInit {

  payments: any[] = [];
  totalMonthly: number = 0;
  upcomingPayments: any[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.loadPayments();
  }

async loadPayments() {

  const transactions = await this.supabaseService.getTransactions();

  this.payments = this.getRecurringPayments(transactions);

  this.totalMonthly = this.payments.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0
  );

  // 🔥 NEW
  this.upcomingPayments = this.getUpcomingPayments(this.payments);
}

  getRecurringPayments(transactions: any[]) {

    const map: { [key: string]: any[] } = {};

    // ✅ Step 1: Group ONLY expenses
    transactions.forEach((t: any) => {

      if (t.amount > 0) return; // ignore income

      const key = t.description.toLowerCase().trim();

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(t);
    });

    const recurring: any[] = [];

    // ✅ Step 2: Detect recurring
    for (const key in map) {

      const list = map[key];

      if (list.length < 2) continue;

      // 🔹 Amount consistency
      const amounts: number[] = list.map((t: any) =>
        Math.abs(Number(t.amount))
      );

      const avgAmount: number =
        amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length;

      // stricter: 5% tolerance
      const consistentAmount: boolean = amounts.every((a: number) =>
        Math.abs(a - avgAmount) < avgAmount * 0.05
      );

      if (!consistentAmount) continue;

      // 🔹 Billing day consistency
      const days: number[] = list.map((t: any) =>
        new Date(t.date).getDate()
      );

      const avgDay: number =
        Math.round(days.reduce((a: number, b: number) => a + b, 0) / days.length);

      const consistentDay: boolean = days.every((d: number) =>
        Math.abs(d - avgDay) <= 3
      );

      if (!consistentDay) continue;

      // 🔹 Month repetition
      const months: number[] = list.map((t: any) =>
        new Date(t.date).getMonth()
      );

      const uniqueMonths = new Set<number>(months);

      // require at least 2 different months
      if (uniqueMonths.size < 2) continue;

      // ✅ Final push
      recurring.push({
        name: this.capitalize(key),
        amount: Number(avgAmount.toFixed(2)),
        billingDay: avgDay,
        occurrences: list.length
      });
    }

    return recurring;
  }

  capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  getUpcomingPayments(payments: any[]) {

  const today = new Date();
  const currentDay = today.getDate();

  const upcoming: any[] = [];

  payments.forEach((p: any) => {

    let daysLeft = p.billingDay - currentDay;

    // if already passed → next month
    if (daysLeft < 0) {
      const daysInMonth = new Date(
  today.getFullYear(),
  today.getMonth() + 1,
  0
).getDate();

if (daysLeft < 0) {
  daysLeft = daysInMonth + daysLeft;
}
    }

    upcoming.push({
      ...p,
      daysLeft
    });
  });

  // sort by nearest
  return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
}
}