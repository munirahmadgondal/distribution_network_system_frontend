export interface DataRecord {
  id?: number | string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface ModuleConfig {
  key: string;
  title: string;
  endpoint: string;
}
