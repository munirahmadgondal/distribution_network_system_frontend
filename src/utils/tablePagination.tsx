import type { TablePaginationConfig } from 'antd';

export const ALL_ROWS_PAGE_SIZE = 2147483647;

export const defaultTablePagination: TablePaginationConfig = {
  defaultCurrent: 1,
  defaultPageSize: 10,
  pageSizeOptions: ['10', '20', '50', '100', String(ALL_ROWS_PAGE_SIZE)],
  showSizeChanger: {
    optionRender: (option) => Number(option.value) === ALL_ROWS_PAGE_SIZE ? 'All' : option.label,
    labelRender: (label) => Number(label.value) === ALL_ROWS_PAGE_SIZE ? 'All / page' : label.label,
  },
  showTotal: (total) => `${total} records`,
  onChange: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
};
