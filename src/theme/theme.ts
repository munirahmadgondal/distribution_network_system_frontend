import type { ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#16803c',
    colorSuccess: '#16803c',
    colorInfo: '#167a4a',
    colorBgLayout: '#f4faf6',
    colorBgContainer: '#ffffff',
    colorText: '#173526',
    colorTextSecondary: '#5f7568',
    borderRadius: 8,
    fontSize: 12,
    fontSizeSM: 10,
    fontSizeLG: 14,
    fontSizeXL: 18,
    fontSizeHeading1: 36,
    fontSizeHeading2: 28,
    fontSizeHeading3: 22,
    fontSizeHeading4: 18,
    fontSizeHeading5: 14,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#0f4d2c',
    },
    Menu: {
      fontSize: 12,
      itemSelectedBg: '#e8f6ee',
      itemSelectedColor: '#16803c',
      darkItemBg: '#0f4d2c',
      darkSubMenuItemBg: '#0b3d23',
      darkItemColor: '#dcefe3',
      darkItemHoverBg: '#176b3d',
      darkItemHoverColor: '#ffffff',
      darkItemSelectedBg: '#ffffff',
      darkItemSelectedColor: '#0f4d2c',
    },
    Button: {
      primaryShadow: 'none',
    },
    Card: {
      borderRadiusLG: 8,
    },
    Table: {
      headerSplitColor: '#dbeee2',
      cellPaddingBlock: 8,
      cellPaddingInline: 12,
    },
  },
};
