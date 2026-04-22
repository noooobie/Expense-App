import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-transaction-dialog',
  templateUrl: './add-transaction-dialog.component.html',
  styleUrls: ['./add-transaction-dialog.component.css']
})
export class AddTransactionDialogComponent {

  transaction: any = {
    description: '',
    amount: 0,
    location: '',
    date: this.formatDate(new Date())
  };

  constructor(private dialogRef: MatDialogRef<AddTransactionDialogComponent>) {}

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  save() {
    this.dialogRef.close(this.transaction);
  }

  close() {
    this.dialogRef.close();
  }
}