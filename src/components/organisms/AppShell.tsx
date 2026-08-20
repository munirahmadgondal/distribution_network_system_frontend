import {
  ApartmentOutlined,
  BankOutlined,
  ControlOutlined,
  BarChartOutlined,
  CarOutlined,
  CreditCardOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  RiseOutlined,
  IdcardOutlined,
  LogoutOutlined,
  TruckOutlined,
  ShopOutlined,
  ShoppingOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { accountsPages, configurationTablePages, hrPages, rbasPages, transactionTablePages } from '../../config/dbnmsTables';
import { canAccess, LoginResponse } from '../../services/api';
import { BrandMark } from '../atoms/BrandMark';

const { Header, Sider, Content } = Layout;

const transactionIcons: Record<string, ReactNode> = {
  t_factory_dispatch: <TruckOutlined />,
  retailer_dispatch: <SwapOutlined />,
  receipt_payment: <CreditCardOutlined />,
  t_factory_order_payment: <DollarOutlined />,
  t_bank_retailer_receipts: <CreditCardOutlined />,
};

const configurationIcons: Record<string, ReactNode> = {
  city: <EnvironmentOutlined />,
  city_area: <EnvironmentOutlined />,
  banks: <BankOutlined />,
  branch_bank: <ApartmentOutlined />,
  distributor_bank_accounts: <CreditCardOutlined />,
  factory: <ShopOutlined />,
  factory_plant: <ApartmentOutlined />,
  factory_destination: <EnvironmentOutlined />,
  retailers: <ShoppingOutlined />,
  vehicles: <CarOutlined />,
  expense: <DollarOutlined />,
  income: <RiseOutlined />,
  adjustment: <SwapOutlined />,
};

interface AppShellProps {
  activeKey: string;
  children: ReactNode;
  onSelect: (key: string) => void;
  onLogout: () => void;
  user: LoginResponse['user'];
}

function menuItems(user: LoginResponse['user']): MenuProps['items'] { return [
  ...(canAccess(user, 'dashboard') ? [{ key: 'dashboard', icon: <BarChartOutlined />, label: 'Dashboard' }] : []),
  ...transactionTablePages.filter((page) => page.table !== 't_bank_retailer_receipts' && canAccess(user, page.table === 'receipt_payment' ? 'transaction:retailer_dispatch' : page.key)).map((page) => ({ key: page.key, icon: transactionIcons[page.table], label: page.title })),
  {
    key: 'accounts-menu', icon: <DollarOutlined />, label: 'Accounts',
    children: accountsPages.filter((page) => canAccess(user, page.key)).map((page) => ({ key: page.key, icon: <DollarOutlined />, label: page.title })),
  },
  {
    key: 'configurations-menu',
    icon: <ControlOutlined />,
    label: 'Configurations',
    children: configurationTablePages.filter((page) => canAccess(user, page.key)).map((page) => ({ key: page.key, icon: configurationIcons[page.table], label: page.title })),
  },
  {
    key: 'hr-menu', icon: <TeamOutlined />, label: 'HR',
    children: hrPages.filter((page) => canAccess(user, page.key)).map((page) => ({
      key: page.key, icon: page.table === 'users' ? <UserOutlined /> : <IdcardOutlined />, label: page.title,
    })),
  },
  {
    key: 'reports-menu', icon: <FileTextOutlined />, label: 'Reports',
    children: [
      ...(canAccess(user, 'accounts:expense_main') ? [{ key: 'report:expenses', icon: <DollarOutlined />, label: 'Expense' }] : []),
      ...(canAccess(user, 'accounts:expense_main') ? [{ key: 'report:vehicle-expenses', icon: <CarOutlined />, label: 'Vehicle Expense' }] : []),
      ...(canAccess(user, 'accounts:income_main') ? [{ key: 'report:income', icon: <RiseOutlined />, label: 'Income' }] : []),
      ...(canAccess(user, 'config:retailers') ? [{ key: 'report:retailers', icon: <ShoppingOutlined />, label: 'Retailer' }] : []),
      ...(canAccess(user, 'config:factory_plant') ? [{ key: 'report:factory', icon: <ShopOutlined />, label: 'Factory' }] : []),
    ],
  },
  {
    key: 'rbas-menu', icon: <SafetyCertificateOutlined />, label: 'RBAS',
    children: rbasPages.filter((page) => canAccess(user, page.key)).map((page) => ({
      key: page.key,
      icon: page.table === 'roles' ? <SafetyCertificateOutlined /> : <TeamOutlined />,
      label: page.title,
    })),
  },
].filter((item: any) => !item.children || item.children.length > 0); }

const submenuKeys = ['accounts-menu', 'configurations-menu', 'hr-menu', 'reports-menu', 'rbas-menu'];

function submenuForActiveKey(activeKey: string): string | undefined {
  if (activeKey.startsWith('accounts:')) return 'accounts-menu';
  if (activeKey.startsWith('config:')) return 'configurations-menu';
  if (activeKey === 'rbas:users' || activeKey.startsWith('hr:')) return 'hr-menu';
  if (activeKey.startsWith('report:')) return 'reports-menu';
  if (activeKey.startsWith('rbas:')) return 'rbas-menu';
  return undefined;
}

export function AppShell({ activeKey, children, onSelect, onLogout, user }: AppShellProps) {
  const [openKeys, setOpenKeys] = useState<string[]>(() => {
    const submenu = submenuForActiveKey(activeKey);
    return submenu ? [submenu] : [];
  });

  useEffect(() => {
    const submenu = submenuForActiveKey(activeKey);
    setOpenKeys(submenu ? [submenu] : []);
  }, [activeKey]);

  function handleOpenChange(keys: string[]) {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));
    setOpenKeys(latestOpenKey && submenuKeys.includes(latestOpenKey) ? [latestOpenKey] : []);
  }

  return (
    <Layout className="app-shell">
      <Sider width={260} className="sidebar" breakpoint="lg" collapsedWidth="0">
        <BrandMark />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey]}
          openKeys={openKeys}
          onOpenChange={(keys) => handleOpenChange(keys.map(String))}
          items={menuItems(user)}
          onClick={({ key }) => onSelect(key)}
        />
      </Sider>
      <Layout>
        <Header className="topbar">
          <div className="topbar-heading">
            <div className="topbar-eyebrow">MK Traders</div>
            <div className="topbar-title">Distribution Control Center</div>
            <div className="topbar-subtitle">Operations, finance and logistics</div>
          </div>
          {/* Header page-navigation truck animation is intentionally disabled. */}
          <div className="topbar-actions">
            <Button danger icon={<LogoutOutlined />} onClick={onLogout}>
              Logout
            </Button>
          </div>
        </Header>
        <Content className="content">{children}</Content>
      </Layout>
    </Layout>
  );
}
