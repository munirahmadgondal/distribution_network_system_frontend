import { CrudPage } from '../CrudPage';

export function IncomePage() {
  const openLedger=()=>{window.history.pushState(null,'','/accounts/income/ledger');window.dispatchEvent(new PopStateEvent('popstate'));};
  return <CrudPage initialTable="income_main" title="Income" onHeaderLedger={openLedger} />;
}
