import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  {
    path: 'products/:handle',
    loadComponent: () => import('./features/product/product').then((m) => m.Product),
  },
  {
    path: 'politicas/:handle',
    loadComponent: () => import('./features/policy/policy').then((m) => m.Policy),
  },
];
