import { CrudPage } from '../CrudPage';

export function FactoryPlantPage() {
  const open = (path: string, id: unknown) => {
    const encoded = btoa(String(id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.history.pushState(null, '', `${path}?factoryPlantId=${encodeURIComponent(encoded)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  return <CrudPage initialTable="factory_plant" title="Factory Plants"
    onReceive={(plant) => open('/configurations/factory-plants/receiving', plant.id)}
    onLedger={(plant) => open('/configurations/factory-plants/ledger', plant.id)} />;
}
