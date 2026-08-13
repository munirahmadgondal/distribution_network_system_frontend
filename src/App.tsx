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

export default function App() {
  const [user, setUser] = useState(getStoredUser());
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
      setUser(getStoredUser());
    }} />;
  }

  const activePage = pageFromKey(activeKey);
  const ActiveConfigurationPage = configurationPageComponents[activeKey];
  const ActiveRbasPage = RbasPageComponents[activeKey];

  function selectPage(key: string) {
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

  return (
    <AppShell
      activeKey={activeKey === 'transaction:retailer_dispatch:add'
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
      {activeKey === 'accounts:expense_main:ledger' && canAccess(user,'accounts:expense_main') ? (
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
        <CrudPage initialTable="retailer_dispatch" title="Retailer Dispatch" onCreate={openRetailerDispatchAdd} />
      ) : activePage && canAccess(user, activePage.key) && ActiveRbasPage ? (
        <ActiveRbasPage />
      ) : activePage?.category === 'hr' && canAccess(user, activePage.key) ? (
        <CrudPage initialTable={activePage.table} title={activePage.title} />
      ) : activePage && canAccess(user, activePage.key) && ActiveConfigurationPage ? (
        <ActiveConfigurationPage />
      ) : canAccess(user, 'dashboard') ? (
        <DashboardPage />
      ) : (
        <div>You do not have permission to view this page.</div>
      )}
    </AppShell>
  );
}
