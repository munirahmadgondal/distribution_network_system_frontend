import { Empty, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataRecord } from '../../types/table';
import { defaultTablePagination } from '../../utils/tablePagination';

interface DataTableProps {
  rows: DataRecord[];
  loading: boolean;
}

function titleFromKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function DataTable({ rows, loading }: DataTableProps) {
  const keys = rows[0] ? Object.keys(rows[0]).slice(0, 8) : [];
  const columns: ColumnsType<DataRecord> = keys.map((key) => ({
    title: titleFromKey(key),
    dataIndex: key,
    key,
    ellipsis: true,
    render: (value) => {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return value ?? '-';
    },
  }));

  return (
    <Table
      rowKey={(record, index) => String(record.id ?? index)}
      columns={columns}
      dataSource={rows}
      loading={loading}
      locale={{ emptyText: <Empty description="No records found" /> }}
      pagination={defaultTablePagination}
      scroll={{ x: true }}
      size="middle"
    />
  );
}
