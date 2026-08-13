export interface DbnmsTablePage {
  key: string;
  path: string;
  table: string;
  title: string;
  category: 'configuration' | 'transaction' | 'accounts' | 'hr' | 'rbas';
}

export const dbnmsTablePages: DbnmsTablePage[] = [
  { key: 'config:city', path: '/configurations/city', table: 'city', title: 'Cities', category: 'configuration' },
  { key: 'config:city_area', path: '/configurations/city-areas', table: 'city_area', title: 'City Area', category: 'configuration' },
  { key: 'config:banks', path: '/configurations/banks', table: 'banks', title: 'Banks', category: 'configuration' },
  { key: 'config:branch_bank', path: '/configurations/branch-bank', table: 'branch_bank', title: 'Bank Branches', category: 'configuration' },
  { key: 'config:distributor_bank_accounts', path: '/configurations/distributor-bank-accounts', table: 'distributor_bank_accounts', title: 'Bank Accounts', category: 'configuration' },
  { key: 'config:factory', path: '/configurations/factories', table: 'factory', title: 'Factories', category: 'configuration' },
  { key: 'config:factory_plant', path: '/configurations/factory-plants', table: 'factory_plant', title: 'Factory Plants', category: 'configuration' },
  // { key: 'config:factory_destination', path: '/configurations/factory-destinations', table: 'factory_destination', title: 'Factory Destination', category: 'configuration' },
  { key: 'config:retailers', path: '/configurations/retailers', table: 'retailers', title: 'Retailers', category: 'configuration' },
  // { key: 'config:users', path: '/configurations/users', table: 'users', title: 'Users', category: 'configuration' },
  { key: 'config:vehicles', path: '/configurations/vehicles', table: 'vehicles', title: 'Vehicles', category: 'configuration' },
  { key: 'config:expense', path: '/configurations/expense', table: 'expense', title: 'Expense', category: 'configuration' },
  { key: 'config:income', path: '/configurations/income', table: 'income', title: 'Income', category: 'configuration' },
  { key: 'config:adjustment', path: '/configurations/adjustment', table: 'adjustment', title: 'Adjustment', category: 'configuration' },
  { key: 'accounts:expense_main', path: '/accounts/expenses', table: 'expense_main', title: 'Expenses', category: 'accounts' },
  { key: 'accounts:income_main', path: '/accounts/income', table: 'income_main', title: 'Income', category: 'accounts' },
  { key: 'accounts:adjustment_main', path: '/accounts/adjustments', table: 'adjustment_main', title: 'Adjustments', category: 'accounts' },
  { key: 'transaction:t_factory_dispatch', path: '/factory-dispatches', table: 't_factory_dispatch', title: 'Factory Dispatch', category: 'transaction' },
  { key: 'transaction:retailer_dispatch', path: '/retailer-dispatches', table: 'retailer_dispatch', title: 'Retailer Dispatch', category: 'transaction' },
  { key: 'transaction:t_bank_retailer_receipts', path: '/bank-retailer-receipts', table: 't_bank_retailer_receipts', title: 'Bank Retailer Receipts', category: 'transaction' },
];

export const rbasPages: DbnmsTablePage[] = [
  { key: 'rbas:roles', path: '/rbas/roles', table: 'roles', title: 'Roles', category: 'rbas' },
  { key: 'rbas:assignments', path: '/rbas/assignments', table: 'assignments', title: 'Assignment', category: 'rbas' },
];

export const hrPages: DbnmsTablePage[] = [
  { key: 'rbas:users', path: '/hr/employees', table: 'users', title: 'Employee', category: 'hr' },
  { key: 'hr:designation', path: '/hr/designations', table: 'designation', title: 'Designation', category: 'hr' },
];

dbnmsTablePages.push(...hrPages, ...rbasPages);

export const configurationTablePages = dbnmsTablePages.filter((page) => page.category === 'configuration');
export const transactionTablePages = dbnmsTablePages.filter((page) => page.category === 'transaction');
export const accountsPages = dbnmsTablePages.filter((page) => page.category === 'accounts');

export function pageFromKey(key: string) {
  return dbnmsTablePages.find((page) => page.key === key);
}

export function keyFromPath(pathname: string) {
  if (pathname === '/retailer-dispatches/add') return 'transaction:retailer_dispatch:add';
  if (['/configurations/retailers/receiving', '/retailers/receiving'].includes(pathname)) return 'config:retailers:receiving';
  if (['/configurations/retailers/ledger', '/retailers/ledger'].includes(pathname)) return 'config:retailers:ledger';
  if (pathname === '/configurations/factory-plants/receiving') return 'config:factory_plant:receiving';
  if (pathname === '/configurations/factory-plants/ledger') return 'config:factory_plant:ledger';
  if (pathname === '/configurations/distributor-bank-accounts/ledger') return 'config:distributor_bank_accounts:ledger';
  if (pathname === '/accounts/expenses/ledger') return 'accounts:expense_main:ledger';
  if (pathname === '/accounts/income/ledger') return 'accounts:income_main:ledger';
  return dbnmsTablePages.find((page) => page.path === pathname)?.key || 'dashboard';
}
