import { Card, Tabs } from 'antd';
import { CrudPage } from '../CrudPage';

export function IncomeConfigurationPage() {
  return <Card><Tabs defaultActiveKey="heads" items={[
    { key: 'heads', label: 'Heads', children: <CrudPage embedded initialTable="income_heads" title="Income Heads" /> },
  ]} /></Card>;
}
