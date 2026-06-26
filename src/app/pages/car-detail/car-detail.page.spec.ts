import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarDetailPage } from './car-detail.page';

describe('CarDetailPage', () => {
  let component: CarDetailPage;
  let fixture: ComponentFixture<CarDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CarDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
