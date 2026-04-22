import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://zkjfgapgwayxxwiouzwa.supabase.co',
      'sb_publishable_MAxo91fDTXXtF8fk_bHGaQ_IoanazGR'
    );
  }

  async getTransactions() {

    const { data, error } = await this.supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    if (!data) return [];

    return data.map((t: any) => ({
      ...t,
      date: new Date(t.date)
    }));
  }

  async addTransaction(transaction: any) {

    const { data, error } = await this.supabase
      .from('transactions')
      .insert([transaction]);

    if (error) {
      console.error('Insert error:', error);
    }

    return data;
  }

  async getRecurringPayments() {

  const { data, error } = await this.supabase
    .from('recurring_payments')
    .select('*');

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

async addRecurringPayment(payment: any) {

  const { error } = await this.supabase
    .from('recurring_payments')
    .insert([payment]);

  if (error) {
    console.error(error);
  }
}

// =======================
// BUDGETS
// =======================

private userId = 'user_1'; // ✅ stable ID (required until auth added)

async getBudgets() {

  const { data, error } = await this.supabase
    .from('budgets')
    .select('*')
    .eq('user_id', this.userId);

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

async upsertBudget(category: string, amount: number) {

  const { error } = await this.supabase
    .from('budgets')
    .upsert(
      {
        user_id: this.userId,   // ✅ FIXED VALUE
        category,
        amount
      },
      {
        onConflict: 'user_id,category'
      }
    );

  if (error) {
    console.error(error);
    throw error;
  }
}
}