import type { ComponentType } from 'react';
import { BankRetailerReceiptsPage } from './BankRetailerReceiptsPage';
import { BanksPage } from './BanksPage';
import { BranchBankPage } from './BranchBankPage';
import { CityPage } from './CityPage';
import { CityAreaPage } from './CityAreaPage';
import { DistributorBankAccountsPage } from './DistributorBankAccountsPage';
import { FactoryDispatchesPage } from './FactoryDispatchesPage';
import { FactoryDestinationPage } from './FactoryDestinationPage';
import { FactoryPage } from './FactoryPage';
import { FactoryPlantPage } from './FactoryPlantPage';
import { RetailerDispatchesPage } from './RetailerDispatchesPage';
import { RetailersPage } from './RetailersPage';
import { UsersPage } from './UsersPage';
import { VehiclesPage } from './VehiclesPage';
import { ExpensePage } from './ExpensePage';
import { ExpensesPage } from './ExpensesPage';
import { IncomePage } from './IncomePage';
import { IncomeConfigurationPage } from './IncomeConfigurationPage';
import { AdjustmentConfigurationPage } from './AdjustmentConfigurationPage';
import { AdjustmentsPage } from './AdjustmentsPage';

export const configurationPageComponents: Record<string, ComponentType> = {
  'config:city': CityPage,
  'config:city_area': CityAreaPage,
  'config:banks': BanksPage,
  'config:branch_bank': BranchBankPage,
  'config:distributor_bank_accounts': DistributorBankAccountsPage,
  'config:factory': FactoryPage,
  'config:factory_plant': FactoryPlantPage,
  'config:factory_destination': FactoryDestinationPage,
  'config:retailers': RetailersPage,
  'config:users': UsersPage,
  'config:vehicles': VehiclesPage,
  'config:expense': ExpensePage,
  'accounts:expense_main': ExpensesPage,
  'accounts:income_main': IncomePage,
  'config:income': IncomeConfigurationPage,
  'config:adjustment': AdjustmentConfigurationPage,
  'accounts:adjustment_main': AdjustmentsPage,
  'transaction:t_bank_retailer_receipts': BankRetailerReceiptsPage,
  'transaction:t_factory_dispatch': FactoryDispatchesPage,
  'transaction:retailer_dispatch': RetailerDispatchesPage,
};
