import { CrudPage } from '../CrudPage';

export function RetailersPage() {
  return <CrudPage initialTable="retailers" title="Retailers" onReceive={(retailer) => {
    const encodedRetailerId = btoa(String(retailer.id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.history.pushState(null, '', `/configurations/retailers/receiving?retailerId=${encodeURIComponent(encodedRetailerId)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }} onLedger={(retailer) => {
    const encodedRetailerId = btoa(String(retailer.id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.history.pushState(null, '', `/configurations/retailers/ledger?retailerId=${encodeURIComponent(encodedRetailerId)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }} />;
}
