export interface Transaction {
  date: Date;
  description: string;
  location: string;
  amount: number;
  category?: string;
}