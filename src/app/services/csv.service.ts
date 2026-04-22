import { Injectable } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class CsvService {
// parseCSV(file: File): Promise<Transaction[]> {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();

//       reader.onload = () => {
//         const text = reader.result as string;
//         const rows = text.split('\n').slice(1); // skip header

//         const transactions: Transaction[] = rows.map(row => {
//           const cols = row.split(',');

//           return {
//             date: new Date(cols[0]),
//             description: cols[1],
//             amount: parseFloat(cols[2]),
//           };
//         }).filter(t => !isNaN(t.amount));

//         resolve(transactions);
//       };

//       reader.onerror = reject;
//       reader.readAsText(file);
//     });
//   }

  parseExcel(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(sheet);

      const transactions: Transaction[] = jsonData.map((row: any) => ({
        date: new Date(row.Date),
        description: row.description,
        location: row.Location,
        amount: Number(row.Amount)
      }));

      resolve(transactions);
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
}
