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
  {
    path: 'collections/:handle',
    loadComponent: () => import('./features/collection/collection').then((m) => m.Collection),
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./features/collection/collection').then((m) => m.Collection),
  },
  {
    path: 'contacto',
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
  },
];
