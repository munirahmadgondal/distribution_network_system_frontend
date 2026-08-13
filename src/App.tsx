import { useEffect, useState } from 'react';
import { AppShell } from './components/organisms/AppShell';
import { keyFromPath, pageFromKey } from './config/dbnmsTables';
import { configurationPageComponents } from './pages/configurations';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { canAccess, getStoredUser, logout } from './services/api';
import { RbasPageComponents } from './pages/rbas';
import { CrudPage } from './pages/CrudPage';
import { RetailerDispatchAddPage } from './pages/RetailerDispatchAddPage';
import { RetailerReceivingPage } from './pages/configurations/RetailerReceivingPage';
import { RetailerLedgerPage } from './pages/configurations/RetailerLedgerPage';
import { FactoryPlantReceivingPage } from './pages/configurations/FactoryPlantReceivingPage';
import { FactoryPlantLedgerPage } from './pages/configurations/FactoryPlantLedgerPage';
import { BankAccountLedgerPage } from './pages/configurations/BankAccountLedgerPage';
import { AccountsLedgerPage } from './pages/configurations/AccountsLedgerPage';
import { EntityLedgerReportPage } from './pages/reports/EntityLedgerReportPage';
import { SideTruckIcon } from './components/atoms/SideTruckIcon';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [showLoginTransition, setShowLoginTransition] = useState(false);
  const [activeKey, setActiveKey] = useState(() => keyFromPath(window.location.pathname));

  useEffect(() => {
    function handlePopState() {
      setActiveKey(keyFromPath(window.location.pathname));
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (!user) {
    return <LoginPage onAuthenticated={() => {
      window.history.replaceState(null, '', '/');
      setActiveKey('dashboard');
      setShowLoginTransition(true);
      setUser(getStoredUser());
      window.setTimeout(() => setShowLoginTransition(false), 1500);
    }} />;
  }

  const activePage = pageFromKey(activeKey);
  const ActiveConfigurationPage = configurationPageComponents[activeKey];
  const ActiveRbasPage = RbasPageComponents[activeKey];

  function selectPage(key: string) {
    const reportPaths: Record<string, string> = {
      'report:expenses': '/reports/expenses', 'report:income': '/reports/income',
      'report:retailers': '/reports/retailers', 'report:factory': '/reports/factory',
    };
    if (reportPaths[key]) {
      setActiveKey(key);
      window.history.pushState(null, '', reportPaths[key]);
      return;
    }
    const nextPage = pageFromKey(key);
    const nextPath = nextPage?.path || '/';
    setActiveKey(nextPage?.key || 'dashboard');
    window.history.pushState(null, '', nextPath);
  }

  function openRetailerDispatchAdd() {
    window.history.pushState(null, '', '/retailer-dispatches/add');
    setActiveKey('transaction:retailer_dispatch:add');
  }

  function closeRetailerDispatchAdd() {
    window.history.pushState(null, '', '/retailer-dispatches');
    setActiveKey('transaction:retailer_dispatch');
  }

  function openRetailerDispatchDetails(record: Record<string, unknown>) {
    const dispatchId = record.factory_dispatch_id;
    if (dispatchId == null) return;
    const encodedId = btoa(String(dispatchId)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.history.pushState(null, '', `/retailer-dispatches/${encodeURIComponent(encodedId)}`);
    setActiveKey('transaction:retailer_dispatch:view');
  }

  function retailerDispatchIdFromPath() {
    try {
      const encodedId = decodeURIComponent(window.location.pathname.split('/').pop() || '');
      const base64 = encodedId.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedId.length / 4) * 4, '=');
      const decodedId = atob(base64);
      return /^\d+$/.test(decodedId) ? decodedId : '';
    } catch {
      return '';
    }
  }

  return (
    <>
    <AppShell
      activeKey={['transaction:retailer_dispatch:add', 'transaction:retailer_dispatch:view'].includes(activeKey)
        ? 'transaction:retailer_dispatch'
        : ['config:retailers:receiving', 'config:retailers:ledger'].includes(activeKey)
          ? 'config:retailers'
          : ['config:factory_plant:receiving', 'config:factory_plant:ledger'].includes(activeKey)
            ? 'config:factory_plant'
          : activeKey === 'config:distributor_bank_accounts:ledger'
            ? 'config:distributor_bank_accounts'
          : activeKey === 'accounts:expense_main:ledger' ? 'accounts:expense_main'
          : activeKey === 'accounts:income_main:ledger' ? 'accounts:income_main'
          : activeKey}
      user={user}
      onSelect={selectPage}
      onLogout={() => {
        logout();
        setUser(null);
      }}
    >
      {activeKey === 'report:expenses' && canAccess(user, 'accounts:expense_main') ? (
        <AccountsLedgerPage kind="expenses" onBack={() => selectPage('dashboard')} />
      ) : activeKey === 'report:income' && canAccess(user, 'accounts:income_main') ? (
        <AccountsLedgerPage kind="income" onBack={() => selectPage('dashboard')} />
      ) : activeKey === 'report:retailers' && canAccess(user, 'config:retailers') ? (
        <EntityLedgerReportPage kind="retailer" />
      ) : activeKey === 'report:factory' && canAccess(user, 'config:factory_plant') ? (
        <EntityLedgerReportPage kind="factory" />
      ) : activeKey === 'transaction:retailer_dispatch:view' && canAccess(user, 'transaction:retailer_dispatch') ? (
        <RetailerDispatchAddPage viewDispatchId={retailerDispatchIdFromPath()} onBack={() => selectPage('transaction:retailer_dispatch')} />
      ) : activeKey === 'accounts:expense_main:ledger' && canAccess(user,'accounts:expense_main') ? (
        <AccountsLedgerPage kind="expenses" onBack={()=>selectPage('accounts:expense_main')}/>
      ) : activeKey === 'accounts:income_main:ledger' && canAccess(user,'accounts:income_main') ? (
        <AccountsLedgerPage kind="income" onBack={()=>selectPage('accounts:income_main')}/>
      ) : activeKey === 'config:distributor_bank_accounts:ledger' && canAccess(user, 'config:distributor_bank_accounts') ? (
        <BankAccountLedgerPage onBack={() => selectPage('config:distributor_bank_accounts')} />
      ) : activeKey === 'config:factory_plant:ledger' && canAccess(user, 'config:factory_plant') ? (
        <FactoryPlantLedgerPage onBack={() => selectPage('config:factory_plant')} />
      ) : activeKey === 'config:factory_plant:receiving' && canAccess(user, 'config:factory_plant', 'create') ? (
        <FactoryPlantReceivingPage onBack={() => selectPage('config:factory_plant')} />
      ) : activeKey === 'config:retailers:ledger' && canAccess(user, 'config:retailers') ? (
        <RetailerLedgerPage onBack={() => selectPage('config:retailers')} />
      ) : activeKey === 'config:retailers:receiving' && canAccess(user, 'config:retailers', 'create') ? (
        <RetailerReceivingPage onBack={() => selectPage('config:retailers')} />
      ) : activeKey === 'transaction:retailer_dispatch:add' && canAccess(user, 'transaction:retailer_dispatch', 'create') ? (
        <RetailerDispatchAddPage onBack={closeRetailerDispatchAdd} />
      ) : activePage?.table === 'retailer_dispatch' && canAccess(user, activePage.key) ? (
        <CrudPage initialTable="retailer_dispatch" title="Retailer Dispatch" onCreate={openRetailerDispatchAdd} onView={openRetailerDispatchDetails} />
      ) : activePage && canAccess(user, activePage.key) && ActiveRbasPage ? (
        <ActiveRbasPage />
      ) : activePage?.category === 'hr' && canAccess(user, activePage.key) ? (
        <CrudPage initialTable={activePage.table} title={activePage.title} />
      ) : activePage && canAccess(user, activePage.key) && ActiveConfigurationPage ? (
        <ActiveConfigurationPage />
      ) : canAccess(user, 'dashboard') ? (
        <DashboardPage onNavigate={selectPage} />
      ) : (
        <div>You do not have permission to view this page.</div>
      )}
    </AppShell>
    {showLoginTransition && (
      <div className="login-transition-overlay" role="status" aria-label="Opening distribution control center">
        <div className="login-transition-road">
          <div className="login-transition-truck"><SideTruckIcon /></div>
        </div>
        <div className="login-transition-text">Preparing your distribution workspace...</div>
      </div>
    )}
    </>
  );
}
