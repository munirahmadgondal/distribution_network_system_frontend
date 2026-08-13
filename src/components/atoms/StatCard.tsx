import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
}

export function StatCard({ title, value, prefix }: StatCardProps) {
  return (
    <Card className="stat-card">
      <Statistic title={title} value={value} prefix={prefix} />
    </Card>
  );
}
