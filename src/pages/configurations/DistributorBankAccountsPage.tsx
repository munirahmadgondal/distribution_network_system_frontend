import { CrudPage } from '../CrudPage';

export function DistributorBankAccountsPage() {
  const openLedger = (account: Record<string, unknown>) => {
    const encoded = btoa(String(account.id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.history.pushState(null, '', `/configurations/distributor-bank-accounts/ledger?bankAccountId=${encodeURIComponent(encoded)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  return <CrudPage initialTable="distributor_bank_accounts" title="Bank Accounts" onLedger={openLedger} />;
}
