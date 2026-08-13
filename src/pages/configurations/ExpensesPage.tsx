import { CrudPage } from '../CrudPage';

export function ExpensesPage() {
  const openLedger=()=>{window.history.pushState(null,'','/accounts/expenses/ledger');window.dispatchEvent(new PopStateEvent('popstate'));};
  return <CrudPage initialTable="expense_main" title="Expenses" onHeaderLedger={openLedger} />;
}
