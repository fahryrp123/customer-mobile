import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  // URL API Backend (Sesuai dengan ketentuan yang kamu berikan)
  private API_URL = 'https://sewamobilyuk-api.exponic.site/api';

  // State Manajemen Token & Profil
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));
  public currentToken = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Header dengan Token
  private getHeaders() {
    const token = this.tokenSubject.value;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Header untuk upload file (form-data)
  private getFileHeaders() {
    const token = this.tokenSubject.value;
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
      // Jangan set Content-Type untuk form-data, browser akan otomatis men-set boundary
    });
  }

  // ==========================================
  // AUTHENTICATION & OTP
  // ==========================================
  
  register(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/login`, data);
  }

  verifyOtp(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/verify-otp-account`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
  }

  setToken(token: string, user: any) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.tokenSubject.next(token);
  }

  // ==========================================
  // CAR CATALOG
  // ==========================================
  
  getCars(): Observable<any> {
    // API hardcodes per_page=10. Fetch page 1 first, then remaining pages.
    return this.http.get(`${this.API_URL}/show`).pipe(
      switchMap((res: any) => {
        const page1Data = res.data?.data || res.data || [];
        const lastPage = res.data?.last_page || 1;

        if (lastPage <= 1) {
          return of({ data: { data: page1Data, total: res.data?.total } });
        }

        // Build requests for remaining pages
        const pageRequests: Observable<any>[] = [];
        for (let p = 2; p <= lastPage; p++) {
          pageRequests.push(this.http.get(`${this.API_URL}/show?page=${p}`));
        }

        return forkJoin(pageRequests).pipe(
          map((pages: any[]) => {
            let allCars = [...page1Data];
            pages.forEach(pageRes => {
              const pageCars = pageRes.data?.data || pageRes.data || [];
              allCars = allCars.concat(pageCars);
            });
            return { data: { data: allCars, total: allCars.length } };
          })
        );
      })
    );
  }

  getCarById(id: string | number): Observable<any> {
    return this.http.get(`${this.API_URL}/show/${id}`);
  }

  // ==========================================
  // FORGOT PASSWORD
  // ==========================================
  
  forgetPassword(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/forget-password`, data);
  }

  verifyOtpForgetPassword(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/verify-otp-forget-password`, data);
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/reset-password`, data);
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  getNotifications(): Observable<any> {
    return this.http.get(`${this.API_URL}/notifications`, { headers: this.getHeaders() });
  }

  getNotificationsUnreadCount(): Observable<any> {
    return this.http.get(`${this.API_URL}/notifications/unread-count`, { headers: this.getHeaders() });
  }

  markNotificationAsRead(id: string | number): Observable<any> {
    return this.http.patch(`${this.API_URL}/notifications/${id}/read`, {}, { headers: this.getHeaders() });
  }

  getHistory(): Observable<any> {
    return this.http.get(`${this.API_URL}/history-reservation`, { headers: this.getHeaders() });
  }

  cancelReservation(id: string | number): Observable<any> {
    // API endpoint for cancelling reservation
    return this.http.post(`${this.API_URL}/cancel-reserv/${id}`, { _method: 'PUT' }, { headers: this.getHeaders() });
  }

  requestRefund(id: string | number): Observable<any> {
    return this.http.post(`${this.API_URL}/request-refund/${id}`, { _method: 'PATCH' }, { headers: this.getHeaders() });
  }

  // ==========================================
  // BRANCHES
  // ==========================================

  getBranches(): Observable<any> {
    // Some endpoints might require auth, pass headers just in case
    return this.http.get(`${this.API_URL}/branch`, { headers: this.tokenSubject.value ? this.getHeaders() : undefined });
  }

  // ==========================================
  // USER PROFILE
  // ==========================================

  getProfile(): Observable<any> {
    return this.http.get(`${this.API_URL}/showProfile`, { headers: this.getHeaders() });
  }

  updateProfile(data: any): Observable<any> {
    // Jika update menggunakan File/Gambar KTP, gunakan getFileHeaders
    const isFormData = data instanceof FormData;
    const headers = isFormData ? this.getFileHeaders() : this.getHeaders();
    return this.http.post(`${this.API_URL}/updateProfile`, data, { headers });
  }

  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.API_URL}/deleteAccount`, { headers: this.getHeaders() });
  }
}
