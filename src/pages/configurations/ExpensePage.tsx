import { Card, Tabs } from 'antd';
import { CrudPage } from '../CrudPage';

export function ExpensePage() {
  return (
    <Card>
      <Tabs
        defaultActiveKey="head"
        destroyInactiveTabPane={false}
        items={[
          {
            key: 'head',
            label: 'Head',
            children: <CrudPage embedded initialTable="expense_head" title="Expense Heads" />,
          },
          {
            key: 'sub-head',
            label: 'Sub Head',
            children: <CrudPage embedded initialTable="expense_sub_head" title="Expense Sub Heads" />,
          },
        ]}
      />
    </Card>
  );
}
