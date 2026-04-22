import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MonthlySummaryComponent } from './components/monthly-summary/monthly-summary.component';
import { RecurringPaymentsComponent } from './components/recurring-payments/recurring-payments.component';
import { SavingsComponent } from './components/savings/savings.component';
import { BudgetComponent } from './components/budget/budget.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'recurring-payments', component: RecurringPaymentsComponent },
  { path: 'monthly-summary', component: MonthlySummaryComponent },
  { path: 'savings', component: SavingsComponent },
  { path: 'budget', component: BudgetComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
