import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  private rules: { keyword: string; category: string }[] = [
    { keyword: 'coles', category: 'Shopping' },
    { keyword: 'woolworths', category: 'Shopping' },
    { keyword: 'woolies', category: 'Shopping' },
    { keyword: 'uber', category: 'Transport' },
    { keyword: 'fuel', category: 'Transport' },
    { keyword: 'netflix', category: 'Entertainment' },
    { keyword: 'spotify', category: 'Entertainment' },
    { keyword: 'gym', category: 'Health' },
    { keyword: 'pharmacy', category: 'Health' },
    { keyword: 'amazon', category: 'Shopping' },
    { keyword: 'clothing', category: 'Shopping' },
    { keyword: 'salary', category: 'Income' }
  ];

  assignCategory(transaction: Transaction): string {
    const desc = transaction.description.toLowerCase();

    for (let rule of this.rules) {
      if (desc.includes(rule.keyword)) {
        return rule.category;
      }
    }

    return 'Other';
  }

  assignCategories(transactions: Transaction[]): Transaction[] {
    return transactions.map(t => ({
      ...t,
      category: this.assignCategory(t)
    }));
  }
}
