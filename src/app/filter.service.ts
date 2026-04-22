import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FilterService {

  selectedMonth: number = new Date().getMonth();
  selectedYear: number = new Date().getFullYear();

}