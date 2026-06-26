import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RentalService {

  private API_URL = 'https://sewamobilyuk-api.exponic.site/api';

  constructor(private http: HttpClient) { }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private getFileHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ==========================================
  // RESERVATION
  // ==========================================

  addReservation(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/add-reservation`, data, { headers: this.getHeaders() });
  }

  getHistory(): Observable<any> {
    return this.http.get(`${this.API_URL}/history-reservation`, { headers: this.getHeaders() });
  }

  getDetailReservation(id: string | number): Observable<any> {
    return this.http.get(`${this.API_URL}/detail-reservation/${id}`, { headers: this.getHeaders() });
  }

  cancelReservation(id: string | number): Observable<any> {
    return this.http.patch(`${this.API_URL}/cancel-reserv/${id}`, {}, { headers: this.getHeaders() });
  }

  // ==========================================
  // PAYMENTS
  // ==========================================

  uploadPembayaran(paymentId: string | number, formData: FormData): Observable<any> {
    return this.http.post(`${this.API_URL}/upload_pembayaran/${paymentId}`, formData, { headers: this.getFileHeaders() });
  }

}
