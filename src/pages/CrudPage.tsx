import { BookOutlined, DeleteOutlined, EditOutlined, ExportOutlined, EyeOutlined, FormOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, DatePicker, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Radio, Result, Select, Space, Spin, Switch, Table, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { canAccess, deleteData, getData, getStoredUser, patchData, postData } from '../services/api';
import type { DataRecord } from '../types/table';

const { Title, Text } = Typography;
interface TableInfo { table: string; module: string; title: string; category: 'configuration' | 'transaction' | 'accounts' | 'hr' }
interface ColumnMeta {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  is_generated: string;
  enum_values: string[] | null;
  foreign_table: string | null;
  foreign_column: string | null;
}
interface TableMeta extends TableInfo { primaryKey: string; columns: ColumnMeta[] }
interface CrudResponse { page: number; limit: number; total: number; primaryKey: string; rows: DataRecord[] }
interface CrudPageProps { initialTable: string; title?: string; description?: string; embedded?: boolean; onCreate?: () => void; onView?: (record: DataRecord) => void; onHeaderLedger?: () => void; onReceive?: (record: DataRecord) => void; onLedger?: (record: DataRecord) => void }
interface SelectOption { value: string; label: string }
interface FactoryDispatchWeight { weight_in_tons: number | string; remaining_bags: number | string; factory_plant_id: number | string }
interface VehicleCapacity { loading_capacity: number | string; loading_capacity_unit: string }
interface FactoryPlantBalance { remaining_amount: number | string }
interface RetailerLocation { city_id: number | string }
interface FactoryDestinationFare { total_fare_rate: number | string }
interface RetailerBalance { remaining_amount: number | string; current_balance: number | string }
interface PendingBuilty {
  id: string;
  builty_number: string;
  date: string;
  fare_receivable: number | string;
  cement_receivable: number | string;
  cleared: boolean;
  newlyCleared?: boolean;
}
interface FactoryDispatchDetail {
  dispatch: DataRecord;
  retailers: DataRecord[];
}
interface RetailerLedger {
  retailer: { id: string; name: string };
  entries: Array<{ cashflow_type: string; date: string | null; receivable: number | string; payable: number | string; current_balance: number | string }>;
}
interface AuditInfo { created_at: string | null; created_by: string; updated_at: string | null; updated_by: string }

const systemFields = new Set(['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'version', 'is_deleted']);
const foreignTableLabels: Record<string, string> = {
  city: 'City',
  city_area: 'City Area',
  banks: 'Bank',
  branch_bank: 'Bank Branch',
  distributor_bank_accounts: 'Bank Account',
  income_heads: 'Income Head',
  adjustment_heads: 'Adjustment',
  factory: 'Factory',
  factory_plant: 'Factory Plant',
  retailers: 'Retailer',
  vehicles: 'Vehicle',
  t_factory_dispatch: 'Bilty Number',
};
const vehicleOwnerFields = new Set(['owner_name', 'owner_contact', 'owner_city', 'owner_address']);
const label = (key: string, column?: ColumnMeta): string => {
  if (key === 'builty_number') return 'Bilty Number';
  if (column?.foreign_table) {
    return foreignTableLabels[column.foreign_table] || label(column.foreign_table);
  }

  const normalized = key.endsWith('_id') ? key.slice(0, -3) : key;
  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};
const enumOptions = (values: ColumnMeta['enum_values']) => {
  if (Array.isArray(values)) return values;
  return [];
};
const enumOptionLabel = (column: ColumnMeta, value: string) => {
  if (column.column_name === 'owner_type' && value === 'OTHER') return 'Owner';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};
const numericDataTypes = new Set(['integer', 'bigint', 'smallint', 'numeric', 'decimal', 'real', 'double precision']);
const formatTableDate = (value: unknown, dataType: string) => {
  const raw = String(value);
  if (dataType === 'date') {
    const localDate = dayjs(raw);
    return localDate.isValid() ? localDate.format('YYYY-MM-DD') : raw.slice(0, 10);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
function errorText(error: unknown) {
  const detail = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
  return Array.isArray(detail) ? detail.join(', ') : detail || 'The operation could not be completed.';
}

export function CrudPage({ initialTable, title = 'Administration', description, embedded = false, onCreate, onView, onHeaderLedger, onReceive, onLedger }: CrudPageProps) {
  const currentUser = getStoredUser();
  const [activeTable, setActiveTable] = useState(initialTable);
  const [meta, setMeta] = useState<TableMeta>();
  const [rows, setRows] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DataRecord | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [relationOptions, setRelationOptions] = useState<Record<string, SelectOption[]>>({});
  const [destinationPlantOptions, setDestinationPlantOptions] = useState<SelectOption[]>([]);
  const [vehicleCapacityTons, setVehicleCapacityTons] = useState<number | null>(null);
  const [factoryDispatchMaxBags, setFactoryDispatchMaxBags] = useState<number | null>(null);
  const [factoryPlantAvailableAmount, setFactoryPlantAvailableAmount] = useState<number | null>(null);
  const [factoryDestinationFare, setFactoryDestinationFare] = useState<number | null>(null);
  const [retailerAvailableBalance, setRetailerAvailableBalance] = useState<number | null>(null);
  const [bankReceiptFareAvailable, setBankReceiptFareAvailable] = useState<number | null>(null);
  const [bankReceiptCementAvailable, setBankReceiptCementAvailable] = useState<number | null>(null);
  const [pendingBuiltyRows, setPendingBuiltyRows] = useState<PendingBuilty[]>([]);
  const [pendingBuiltyLoading, setPendingBuiltyLoading] = useState(false);
  const [dispatchDetail, setDispatchDetail] = useState<FactoryDispatchDetail | null>(null);
  const [dispatchDetailLoading, setDispatchDetailLoading] = useState(false);
  const [retailerLedger, setRetailerLedger] = useState<RetailerLedger | null>(null);
  const [retailerLedgerLoading, setRetailerLedgerLoading] = useState(false);
  const [releaseRecord, setReleaseRecord] = useState<DataRecord | null>(null);
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [auditInfo, setAuditInfo] = useState<AuditInfo | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [form] = Form.useForm<Record<string, any>>();
  const [releaseForm] = Form.useForm<{ released_at: dayjs.Dayjs }>();
  const ownerType = Form.useWatch('owner_type', form);
  const bankAccountType = Form.useWatch('type', form);
  const adjustmentReleased = Form.useWatch('is_released', form);
  const selectedVehicleId = Form.useWatch('vehicle_id', form);
  const selectedFactoryDispatchId = Form.useWatch('factory_dispatch_id', form);
  const selectedFactoryPlantId = Form.useWatch('factory_plant_id', form);
  const selectedRetailerCityId = Form.useWatch('city_id', form);
  const selectedDestinationFactoryId = Form.useWatch('destination_factory_id', form);
  const selectedDestinationPlantId = activeTable === 'factory_destination' ? selectedFactoryPlantId : undefined;
  const weightInTons = Form.useWatch('weight_in_tons', form);
  const retailerDispatchBags = Form.useWatch('no_of_bags', form);
  const selectedRetailerId = Form.useWatch('retailer_id', form);
  const retailerDispatchRatePerBag = Form.useWatch('rate_per_bag', form);
  const retailerDispatchFarePerBag = Form.useWatch('fare_per_bag', form);
  const retailerDispatchFareReceived = Form.useWatch('fare_received', form);
  const factoryDispatchRatePerTon = Form.useWatch('rate_per_ton', form);
  const factoryDispatchAmount = Form.useWatch('amount', form);
  const bankReceiptAmount = Form.useWatch('amount', form);
  const bankReceiptFareAmount = Form.useWatch('fare_amount', form);
  const bankReceiptCementAmount = Form.useWatch('cement_amount', form);
  const bankReceiptPaymentMode = Form.useWatch('payment_mode', form);
  const isThirdPartyPayment = Form.useWatch('is_third_party_payment', form);
  const bankReceiptReceivingEnd = Form.useWatch('receiving_end', form);
  const bankReceiptCityId = Form.useWatch('bank_receipt_city_id', form);
  const bankReceiptAreaId = Form.useWatch('bank_receipt_area_id', form);
  const selectedExpenseHeadId = Form.useWatch('head_id', form);
  const selectedExpenseSubHeadId = Form.useWatch('subhead_id', form);
  const expensePaymentMode = Form.useWatch('payment_mode', form);
  const calculatedBags = weightInTons !== undefined && weightInTons !== null && weightInTons !== '' && Number.isFinite(Number(weightInTons))
    ? Number(weightInTons) * 20
    : undefined;
  const factoryPlantProjectedRemaining = factoryPlantAvailableAmount == null
    ? null
    : factoryPlantAvailableAmount - (Number(factoryDispatchAmount) || 0);
  const projectedBuiltyState = useMemo(() => {
    const enteredAmount = Number(bankReceiptAmount) || 0;
    let balance = (retailerAvailableBalance || 0) + enteredAmount;
    const projectedRows = pendingBuiltyRows.map((row) => {
      if (row.cleared) return { ...row, newlyCleared: false };
      const due = (Number(row.fare_receivable) || 0) + (Number(row.cement_receivable) || 0);
      if (due <= balance) {
        balance -= due;
        return { ...row, cleared: true, newlyCleared: true };
      }
      return { ...row, newlyCleared: false };
    });
    return { rows: projectedRows, remainingBalance: balance };
  }, [bankReceiptAmount, pendingBuiltyRows, retailerAvailableBalance]);
  const retailerProjectedBalance = retailerAvailableBalance == null ? null : projectedBuiltyState.remainingBalance;
  const projectedClearanceTotals = useMemo(() => projectedBuiltyState.rows.reduce(
    (totals, row) => ({
      fare: totals.fare + (row.cleared ? Number(row.fare_receivable) || 0 : 0),
      cement: totals.cement + (row.cleared ? Number(row.cement_receivable) || 0 : 0),
    }),
    { fare: 0, cement: 0 },
  ), [projectedBuiltyState.rows]);
  const bankReceiptFareRemaining = bankReceiptFareAvailable == null ? null : bankReceiptFareAvailable - (Number(bankReceiptFareAmount) || 0);
  const bankReceiptCementRemaining = bankReceiptCementAvailable == null ? null : bankReceiptCementAvailable - (Number(bankReceiptCementAmount) || 0);
  const pendingBuiltyTotals = useMemo(() => projectedBuiltyState.rows.reduce(
    (totals, row) => ({
      fare: totals.fare + (row.cleared ? 0 : Number(row.fare_receivable) || 0),
      cement: totals.cement + (row.cleared ? 0 : Number(row.cement_receivable) || 0),
    }),
    { fare: 0, cement: 0 },
  ), [projectedBuiltyState.rows]);

  useEffect(() => {
    if (activeTable !== 't_bank_retailer_receipts' || isThirdPartyPayment || !selectedRetailerId) return;
    form.setFieldValue('paid_by_retailer_id', selectedRetailerId);
  }, [activeTable, form, isThirdPartyPayment, selectedRetailerId]);

  useEffect(() => {
    if (activeTable !== 't_bank_retailer_receipts' || !selectedRetailerId) return;
    form.setFieldsValue({
      fare_amount: projectedClearanceTotals.fare,
      cement_amount: projectedClearanceTotals.cement,
    });
  }, [activeTable, form, projectedClearanceTotals.cement, projectedClearanceTotals.fare, selectedRetailerId]);
  useEffect(() => {
    if (activeTable !== 'expense_main' || !selectedExpenseHeadId) {
      if (activeTable === 'expense_main') setRelationOptions((current) => ({ ...current, subhead_id: [] }));
      return;
    }
    getData<SelectOption[]>(`/crud/expense-sub-head-options?expenseHeadId=${encodeURIComponent(String(selectedExpenseHeadId))}`)
      .then((options) => setRelationOptions((current) => ({ ...current, subhead_id: options })))
      .catch((error) => message.error(errorText(error)));
  }, [activeTable, selectedExpenseHeadId]);

  useEffect(() => {
    setActiveTable(initialTable);
    setSearch('');
  }, [initialTable]);

  async function loadRows(table = activeTable, requestedPage = page, query = search) {
    if (!table) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(requestedPage), limit: '20' });
      if (query.trim()) params.set('search', query.trim());
      const data = await getData<CrudResponse>(`/crud/${table}?${params}`);
      setRows(data.rows); setTotal(data.total);
    } catch (error) {
      setRows([]); setTotal(0); message.error(errorText(error));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!activeTable) return;
    setPage(1); setMeta(undefined); setRelationOptions({});
    getData<TableMeta>(`/crud/${activeTable}/meta`).then((data) => {
      setMeta(data);
      loadRelationOptions(data.columns);
    }).catch((error) => message.error(errorText(error)));
    loadRows(activeTable, 1);
  }, [activeTable]);

  useEffect(() => {
    if (activeTable !== 'factory_destination') return;
    getData<SelectOption[]>('/crud/factory/options').then((options) => {
      setRelationOptions((current) => ({ ...current, destination_factory_id: options }));
    }).catch(() => {
      setRelationOptions((current) => ({ ...current, destination_factory_id: [] }));
    });
  }, [activeTable]);

  useEffect(() => {
    if (activeTable !== 'retailer_dispatch') return;
    getData<SelectOption[]>('/crud/city/options').then((options) => {
      setRelationOptions((current) => ({ ...current, retailer_dispatch_cities: options }));
    }).catch(() => {
      setRelationOptions((current) => ({ ...current, retailer_dispatch_cities: [] }));
    });
  }, [activeTable]);

  useEffect(() => {
    if (activeTable !== 'retailers') return;
    if (!selectedRetailerCityId) {
      setRelationOptions((current) => ({ ...current, city_area_id: [] }));
      return;
    }
    getData<SelectOption[]>(`/crud/city-area-options?cityId=${encodeURIComponent(String(selectedRetailerCityId))}`).then((options) => {
      setRelationOptions((current) => ({ ...current, city_area_id: options }));
    }).catch(() => {
      setRelationOptions((current) => ({ ...current, city_area_id: [] }));
    });
  }, [activeTable, selectedRetailerCityId]);

  useEffect(() => {
    if (activeTable !== 't_bank_retailer_receipts') return;
    if (bankReceiptPaymentMode !== 'BANK' || !bankReceiptReceivingEnd) {
      setRelationOptions((current) => ({ ...current, distributor_bank_account_id: [] }));
      return;
    }
    getData<SelectOption[]>(`/crud/bank-account-options?receivingEnd=${encodeURIComponent(String(bankReceiptReceivingEnd))}`).then((options) => {
      setRelationOptions((current) => ({ ...current, distributor_bank_account_id: options }));
    }).catch(() => setRelationOptions((current) => ({ ...current, distributor_bank_account_id: [] })));
  }, [activeTable, bankReceiptPaymentMode, bankReceiptReceivingEnd]);

  useEffect(() => {
    if (activeTable !== 't_bank_retailer_receipts') return;
    getData<SelectOption[]>('/crud/city/options').then((options) => {
      setRelationOptions((current) => ({ ...current, bank_receipt_cities: options }));
    }).catch(() => setRelationOptions((current) => ({ ...current, bank_receipt_cities: [] })));
  }, [activeTable]);

  useEffect(() => {
    if (activeTable !== 't_bank_retailer_receipts') return;
    if (!bankReceiptCityId) {
      setRelationOptions((current) => ({ ...current, bank_receipt_areas: [], retailer_id: [] }));
      return;
    }
    getData<SelectOption[]>(`/crud/city-area-options?cityId=${encodeURIComponent(String(bankReceiptCityId))}`).then((options) => {
      setRelationOptions((current) => ({ ...current, bank_receipt_areas: options }));
    }).catch(() => setRelationOptions((current) => ({ ...current, bank_receipt_areas: [] })));
  }, [activeTable, bankReceiptCityId]);

  useEffect(() => {
    if (activeTable !== 't_bank_retailer_receipts') return;
    if (!bankReceiptCityId || !bankReceiptAreaId) {
      setRelationOptions((current) => ({ ...current, retailer_id: [] }));
      return;
    }
    getData<SelectOption[]>(`/crud/retailer-options?cityId=${encodeURIComponent(String(bankReceiptCityId))}&areaId=${encodeURIComponent(String(bankReceiptAreaId))}`).then((options) => {
      setRelationOptions((current) => ({ ...current, retailer_id: options }));
    }).catch(() => setRelationOptions((current) => ({ ...current, retailer_id: [] })));
  }, [activeTable, bankReceiptAreaId, bankReceiptCityId]);

  useEffect(() => {
    if (activeTable !== 'factory_destination') return;
    if (!selectedDestinationFactoryId) {
      setDestinationPlantOptions([]);
      return;
    }

    getData<CrudResponse>('/crud/factory_plant?page=1&limit=200').then((response) => {
      const plants = response.rows
        .filter((plant) => String(plant.factory_id) === String(selectedDestinationFactoryId))
        .map((plant) => ({ value: String(plant.id), label: String(plant.plant_name || plant.id) }));
      setDestinationPlantOptions(plants);
      const currentPlant = form.getFieldValue('factory_plant_id');
      if (currentPlant && !plants.some((plant) => plant.value === String(currentPlant))) {
        form.setFieldValue('factory_plant_id', undefined);
      }
    }).catch(() => {
      setDestinationPlantOptions([]);
    });
  }, [activeTable, form, selectedDestinationFactoryId]);

  useEffect(() => {
    if (activeTable !== 'factory_destination' || !selectedDestinationPlantId) {
      form.setFieldValue('destination_source_city_id', undefined);
      return;
    }
    getData<DataRecord>(`/crud/factory_plant/${selectedDestinationPlantId}`).then((plant) => {
      form.setFieldValue('destination_source_city_id', plant.city_id);
    }).catch(() => form.setFieldValue('destination_source_city_id', undefined));
  }, [activeTable, form, selectedDestinationPlantId]);

  useEffect(() => {
    if (activeTable === 'vehicles' && ownerType !== 'OTHER') {
      form.setFieldsValue({
        owner_name: undefined,
        owner_contact: undefined,
        owner_city: undefined,
        owner_address: undefined,
      });
    }
  }, [activeTable, form, ownerType]);

  useEffect(() => {
    let cancelled = false;
    if (activeTable !== 't_factory_dispatch' || !selectedFactoryPlantId) {
      setFactoryPlantAvailableAmount(null);
      return () => { cancelled = true; };
    }

    getData<FactoryPlantBalance>(`/crud/factory_plant/${selectedFactoryPlantId}`).then((plant) => {
      if (cancelled) return;
      const currentRecordAmount = editing && String(editing.factory_plant_id) === String(selectedFactoryPlantId)
        ? Number(editing.amount) || 0
        : 0;
      const availableAmount = Number(plant.remaining_amount) + currentRecordAmount;
      setFactoryPlantAvailableAmount(Number.isFinite(availableAmount) ? availableAmount : null);
    }).catch(() => {
      if (!cancelled) setFactoryPlantAvailableAmount(null);
    });

    return () => { cancelled = true; };
  }, [activeTable, editing, selectedFactoryPlantId]);

  useEffect(() => {
    let cancelled = false;
    if (activeTable !== 't_factory_dispatch' || !selectedVehicleId) {
      setVehicleCapacityTons(null);
      return () => { cancelled = true; };
    }

    getData<VehicleCapacity>(`/crud/vehicles/${selectedVehicleId}`).then((vehicle) => {
      if (cancelled) return;
      const capacity = Number(vehicle.loading_capacity);
      const capacityInTons = vehicle.loading_capacity_unit.toUpperCase() === 'KG' ? Math.ceil(capacity / 1000) : capacity;
      setVehicleCapacityTons(Number.isFinite(capacityInTons) ? capacityInTons : null);
    }).catch(() => {
      if (!cancelled) setVehicleCapacityTons(null);
    });

    return () => { cancelled = true; };
  }, [activeTable, selectedVehicleId]);

  useEffect(() => {
    let cancelled = false;
    if (activeTable !== 'retailer_dispatch' || !selectedFactoryDispatchId) {
      setFactoryDispatchMaxBags(null);
      return () => { cancelled = true; };
    }

    getData<FactoryDispatchWeight>(`/crud/t_factory_dispatch/${selectedFactoryDispatchId}`).then((dispatch) => {
      if (cancelled) return;
      const currentRecordBags = editing && String(editing.factory_dispatch_id) === String(selectedFactoryDispatchId)
        ? Number(editing.no_of_bags) || 0
        : 0;
      const maximumBags = Number(dispatch.remaining_bags) + currentRecordBags;
      setFactoryDispatchMaxBags(Number.isFinite(maximumBags) ? maximumBags : null);
    }).catch(() => {
      if (!cancelled) setFactoryDispatchMaxBags(null);
    });

    return () => { cancelled = true; };
  }, [activeTable, editing, selectedFactoryDispatchId]);

  useEffect(() => {
    if (activeTable !== 'retailer_dispatch') return;

    const bags = Number(retailerDispatchBags) || 0;
    const ratePerBag = Number(retailerDispatchRatePerBag) || 0;
    const farePerBag = Number(retailerDispatchFarePerBag) || 0;
    const fareReceived = Number(retailerDispatchFareReceived) || 0;
    const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
    const totalCementAmount = money(bags * ratePerBag);
    const totalFareAmount = factoryDestinationFare ?? money(bags * farePerBag);

    form.setFieldsValue({
      total_cement_amount: totalCementAmount,
      total_fare_amount: totalFareAmount,
      fare_balance: money(totalFareAmount - fareReceived),
      grand_total: money(totalCementAmount + (totalFareAmount - fareReceived)),
    });
  }, [activeTable, factoryDestinationFare, form, retailerDispatchBags, retailerDispatchRatePerBag, retailerDispatchFarePerBag, retailerDispatchFareReceived]);

  useEffect(() => {
    if (activeTable !== 'retailer_dispatch' || factoryDestinationFare == null) return;
    const bags = Number(retailerDispatchBags) || 0;
    const farePerBag = bags > 0
      ? Math.round(((factoryDestinationFare / bags) + Number.EPSILON) * 100) / 100
      : 0;
    form.setFieldValue('fare_per_bag', farePerBag);
  }, [activeTable, factoryDestinationFare, form, retailerDispatchBags]);

  useEffect(() => {
    let cancelled = false;
    if (activeTable !== 'retailer_dispatch' || !selectedFactoryDispatchId || !selectedRetailerId) {
      setFactoryDestinationFare(null);
      form.setFieldsValue({ retailer_dispatch_source_city_id: undefined, retailer_dispatch_destination_city_id: undefined });
      return () => { cancelled = true; };
    }

    Promise.all([
      getData<FactoryDispatchWeight>(`/crud/t_factory_dispatch/${selectedFactoryDispatchId}`),
      getData<RetailerLocation>(`/crud/retailers/${selectedRetailerId}`),
    ]).then(async ([dispatch, retailer]) => {
      if (cancelled) return null;
      form.setFieldValue('retailer_dispatch_destination_city_id', retailer.city_id);
      const plant = await getData<DataRecord>(`/crud/factory_plant/${dispatch.factory_plant_id}`);
      if (cancelled) return null;
      form.setFieldValue('retailer_dispatch_source_city_id', plant.city_id);
      return getData<FactoryDestinationFare>(
        `/crud/factory-destination/fare?factoryPlantId=${encodeURIComponent(String(dispatch.factory_plant_id))}&cityId=${encodeURIComponent(String(retailer.city_id))}`,
      );
    }).then((destination) => {
      if (!destination) return;
      if (cancelled) return;
      const fare = Number(destination.total_fare_rate);
      setFactoryDestinationFare(Number.isFinite(fare) ? fare : 0);
      if (!Number.isFinite(fare) || fare <= 0) {
        message.warning('No destination has been added for this Factory Plant and Retailer city.');
      }
    }).catch(() => {
      if (!cancelled) {
        setFactoryDestinationFare(0);
        message.warning('No destination has been added for this Factory Plant and Retailer city.');
      }
    });

    return () => { cancelled = true; };
  }, [activeTable, form, selectedFactoryDispatchId, selectedRetailerId]);

  useEffect(() => {
    let cancelled = false;
    if (activeTable !== 't_bank_retailer_receipts' || !selectedRetailerId) {
      setRetailerAvailableBalance(null);
      setPendingBuiltyRows([]);
      return () => { cancelled = true; };
    }

    setPendingBuiltyLoading(true);
    getData<PendingBuilty[]>(`/crud/retailer-pending-builty/${selectedRetailerId}`).then((rows) => {
      if (!cancelled) setPendingBuiltyRows(rows);
    }).catch(() => {
      if (!cancelled) setPendingBuiltyRows([]);
    }).finally(() => {
      if (!cancelled) setPendingBuiltyLoading(false);
    });

    getData<RetailerBalance>(`/crud/retailer-balance/${selectedRetailerId}`).then((balance) => {
      if (cancelled) return;
      const currentReceipt = editing && String(editing.retailer_id) === String(selectedRetailerId)
        ? Number(editing.amount) || 0
        : 0;
      const available = Number(balance.current_balance) - currentReceipt;
      setRetailerAvailableBalance(Number.isFinite(available) ? available : null);
    }).catch(() => {
      if (!cancelled) setRetailerAvailableBalance(null);
    });

    return () => { cancelled = true; };
  }, [activeTable, editing, selectedRetailerId]);

  useEffect(() => {
    if (activeTable !== 't_factory_dispatch') return;
    const weight = Number(weightInTons) || 0;
    const ratePerTon = Number(factoryDispatchRatePerTon) || 0;
    form.setFieldsValue({
      rate_per_bag: Math.round((ratePerTon / 20 + Number.EPSILON) * 100) / 100,
      amount: Math.round((weight * ratePerTon + Number.EPSILON) * 100) / 100,
    });
  }, [activeTable, factoryDispatchRatePerTon, form, weightInTons]);

  async function loadRelationOptions(columns: ColumnMeta[]) {
    const fkColumns = columns.filter((column) => column.foreign_table);
    if (!fkColumns.length) return;

    const entries = await Promise.all(fkColumns.map(async (column) => {
      if ((activeTable === 't_bank_retailer_receipts' && ['distributor_bank_account_id', 'retailer_id'].includes(column.column_name))
        || (activeTable === 'expense_main' && column.column_name === 'subhead_id')) {
        return [column.column_name, []] as const;
      }
      try {
        const options = ['adjustment_main','expense_main'].includes(activeTable) && column.column_name === 'distributor_bank_account_id'
          ? await getData<SelectOption[]>('/crud/bank-account-options?receivingEnd=DISTRIBUTOR')
          : await getData<SelectOption[]>(`/crud/${column.foreign_table}/options`);
        return [column.column_name, options] as const;
      } catch {
        return [column.column_name, []] as const;
      }
    }));

    setRelationOptions((current) => ({ ...current, ...Object.fromEntries(entries) }));
  }

  const primaryKey = meta?.primaryKey || 'id';
  const pageKey = meta ? activeTable === 'income_heads' ? 'config:income'
    : activeTable === 'adjustment_heads' ? 'config:adjustment'
    : `${meta.category === 'transaction' ? 'transaction' : meta.category === 'accounts' ? 'accounts' : meta.category === 'hr' ? 'hr' : 'config'}:${activeTable}` : '';
  const canCreate = canAccess(currentUser, pageKey, 'create');
  const canUpdate = canAccess(currentUser, pageKey, 'update');
  const canDelete = canAccess(currentUser, pageKey, 'delete');
  const writableColumns = useMemo(
    () => meta?.columns.filter((column) => column.is_generated === 'NEVER' && column.column_name !== primaryKey && !systemFields.has(column.column_name)) || [],
    [meta, primaryKey],
  );
  const formColumns = useMemo(() => {
    if (activeTable === 't_bank_retailer_receipts') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      const order = ['payment_mode', 'retailer_id', 'is_third_party_payment', 'paid_by_retailer_id', 'fare_amount', 'cement_amount', 'date', 'receiving_end', 'distributor_bank_account_id', 'instrument_type', 'instrument_number'];
      return [
        ...order.map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column)),
        ...writableColumns.filter((column) => !order.includes(column.column_name) && column.column_name !== 'amount'),
      ];
    }
    if (activeTable === 'factory_destination') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      const order = ['factory_plant_id', 'city_id', 'total_fare_rate'];
      return [
        ...order.map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column)),
        ...writableColumns.filter((column) => !order.includes(column.column_name)),
      ];
    }
    if (activeTable === 'distributor_bank_accounts') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      const order = ['branch_id', 'account_title', 'account_no', 'iban', 'type', 'opening_balance', 'opening_balance_date'];
      return order.map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column));
    }
    if (activeTable === 'income_main') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      const order = ['income_head_id', 'date', 'factory_plant_id', 'amount', 'description'];
      return order.map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column));
    }
    if (activeTable === 'expense_main') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      return ['head_id','subhead_id','title','amount','date','payment_mode','distributor_bank_account_id','instrument_type','instrument_number','description'].map((name)=>byName.get(name)).filter((column):column is ColumnMeta=>Boolean(column));
    }
    if (activeTable === 'adjustment_main') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      return ['adjustment_head_id', 'factory_plant_id', 'amount', 'date', 'distributor_bank_account_id', 'instrument_type', 'instrument_number', 'is_released', 'released_at', 'description'].map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column));
    }
    if (activeTable === 't_factory_dispatch') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      const order = ['factory_plant_id', 'builty_number', 'vehicle_id', 'date', 'weight_in_tons', 'rate_per_ton', 'rate_per_bag', 'amount'];
      return [
        ...order.map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column)),
        ...writableColumns.filter((column) => !order.includes(column.column_name) && column.column_name !== 'applied_rate_per_bag'),
      ];
    }
    if (activeTable === 'retailers') {
      const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
      const order = ['city_id', 'city_area_id', 'retailer_name', 'business_name', 'opening_balance', 'cnic', 'address', 'email', 'contact_number', 'poc'];
      return [
        ...order.map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column)),
        ...writableColumns.filter((column) => !order.includes(column.column_name) && column.column_name !== 'status'),
      ];
    }
    if (activeTable !== 'vehicles') return writableColumns;

    const byName = new Map(writableColumns.map((column) => [column.column_name, column]));
    const order = [
      'make',
      'model',
      'reg_number',
      'loading_capacity_unit',
      'loading_capacity',
      'owner_type',
      'status',
      'owner_name',
      'owner_contact',
      'owner_city',
      'owner_address',
    ];

    return [
      ...order.map((name) => byName.get(name)).filter((column): column is ColumnMeta => Boolean(column)),
      ...writableColumns.filter((column) => !order.includes(column.column_name) && column.column_name !== 'owner_id'),
    ];
  }, [activeTable, writableColumns]);
  const visibleFormColumns = activeTable === 'vehicles' && ownerType !== 'OTHER'
    ? formColumns.filter((column) => !vehicleOwnerFields.has(column.column_name))
    : activeTable === 't_bank_retailer_receipts' && bankReceiptPaymentMode !== 'BANK'
      ? formColumns.filter((column) => !['receiving_end', 'distributor_bank_account_id', 'instrument_type', 'instrument_number', ...(!isThirdPartyPayment ? ['paid_by_retailer_id'] : [])].includes(column.column_name))
      : activeTable === 't_bank_retailer_receipts' && !isThirdPartyPayment
        ? formColumns.filter((column) => column.column_name !== 'paid_by_retailer_id')
        : activeTable === 'adjustment_main'
          ? formColumns.filter((column) => column.column_name !== 'released_at')
        : activeTable === 'expense_main' && expensePaymentMode !== 'BANK'
          ? formColumns.filter((column) => !['distributor_bank_account_id','instrument_type','instrument_number'].includes(column.column_name))
          : activeTable === 'distributor_bank_accounts' && bankAccountType === 'FACTORY'
            ? formColumns.filter((column) => !['opening_balance', 'opening_balance_date'].includes(column.column_name))
          : formColumns;
  const modalWidth = visibleFormColumns.length <= 1 ? 520 : visibleFormColumns.length <= 2 ? 680 : 820;
  const formClassName = visibleFormColumns.length <= 2 ? 'record-form compact' : 'record-form';
  function openCreate() {
    setEditing(null); form.resetFields();
    writableColumns.forEach((column) => { if (column.data_type === 'boolean' && column.column_default?.includes('true')) form.setFieldValue(column.column_name, true); });
    if (activeTable === 'vehicles') {
      form.setFieldValue('owner_type', 'SELF');
      form.setFieldValue('status', 'ACTIVE');
    }
    if (activeTable === 'retailers') {
      form.setFieldValue('opening_balance', 0);
    }
    if (activeTable === 'factory_plant') {
      form.setFieldValue('opening_balance', 0);
    }
    if (activeTable === 'distributor_bank_accounts') {
      form.setFieldValue('opening_balance', 0);
      form.setFieldValue('opening_balance_date', dayjs('2026-07-15'));
    }
    if (activeTable === 'retailer_dispatch') {
      form.setFieldValue('fare_received', 0);
    }
    if (activeTable === 't_bank_retailer_receipts') {
      form.setFieldsValue({ payment_mode: 'BANK', receiving_end: 'DISTRIBUTOR', amount: 0, is_third_party_payment: false });
    }
    if (activeTable === 'adjustment_main') form.setFieldValue('is_released', false);
    if (activeTable === 'expense_main') form.setFieldValue('payment_mode','CASH');
    setModalOpen(true);
  }
  function openEdit(record: DataRecord) {
    setEditing(record); form.resetFields();
    const values: Record<string, unknown> = {};
    writableColumns.forEach((column) => { const value = record[column.column_name]; values[column.column_name] = column.data_type.includes('date') && value ? dayjs(String(value)) : value; });
    form.setFieldsValue(values);
    if (activeTable === 'factory_destination' && record.factory_plant_id) {
      getData<DataRecord>(`/crud/factory_plant/${record.factory_plant_id}`).then((plant) => {
        form.setFieldsValue({ destination_factory_id: plant.factory_id, factory_plant_id: record.factory_plant_id });
      }).catch(() => undefined);
    }
    if (activeTable === 't_bank_retailer_receipts' && record.retailer_id) {
      getData<DataRecord>(`/crud/retailers/${record.retailer_id}`).then((retailer) => {
        form.setFieldsValue({
          bank_receipt_city_id: retailer.city_id,
          bank_receipt_area_id: retailer.city_area_id,
          retailer_id: record.retailer_id,
        });
      }).catch(() => undefined);
    }
    setModalOpen(true);
  }
  async function submit() {
    if (!activeTable) return;
    const values = await form.validateFields();
    const payload = Object.fromEntries(Object.entries(values).flatMap(([key, value]) => {
      const column = writableColumns.find((item) => item.column_name === key);
      if (!column) return [];
      if (value === undefined || value === '') {
        return editing && column?.is_nullable === 'YES' ? [[key, null]] : [];
      }
      if (dayjs.isDayjs(value)) return [[key, column?.data_type === 'date' ? value.format('YYYY-MM-DD') : value.toISOString()]];
      return [[key, value]];
    }));
    if (activeTable === 't_bank_retailer_receipts') {
      payload.amount = (Number(values.fare_amount) || 0) + (Number(values.cement_amount) || 0);
      if (values.payment_mode === 'CASH') {
        payload.receiving_end = null;
        payload.distributor_bank_account_id = null;
        payload.instrument_type = null;
        payload.instrument_number = null;
      }
    }
    if (activeTable === 'distributor_bank_accounts' && values.type === 'FACTORY') {
      payload.opening_balance = 0;
      delete payload.opening_balance_date;
    }
    setSaving(true);
    try {
      const editingId = editing?.[primaryKey];
      if (editingId != null) await patchData(`/crud/${activeTable}/${editingId}`, payload); else await postData(`/crud/${activeTable}`, payload);
      setModalOpen(false); await loadRows(); message.success(`${meta?.title || 'Record'} saved`);
    } catch (error) { message.error(errorText(error)); } finally { setSaving(false); }
  }
  async function remove(record: DataRecord) {
    const recordId = record[primaryKey];
    if (!activeTable || recordId == null) return;
    try { await deleteData(`/crud/${activeTable}/${recordId}`); await loadRows(); message.success('Record deleted'); }
    catch (error) { message.error(errorText(error)); }
  }
  async function releaseAdjustment() {
    if (!releaseRecord) return;
    const values = await releaseForm.validateFields();
    setReleaseSaving(true);
    try {
      await patchData(`/crud/adjustment_main/${releaseRecord[primaryKey]}`, { is_released: true, released_at: values.released_at.format('YYYY-MM-DD') });
      setReleaseRecord(null); releaseForm.resetFields(); await loadRows(); message.success('Adjustment released');
    } catch (error) { message.error(errorText(error)); } finally { setReleaseSaving(false); }
  }
  async function toggleRetailerStatus(record: DataRecord) {
    const nextStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try { await patchData(`/crud/retailers/${record[primaryKey]}`, { status: nextStatus }); await loadRows(); message.success(`Retailer is now ${nextStatus}`); }
    catch (error) { message.error(errorText(error)); }
  }
  async function openDispatchDetail(record: DataRecord) {
    const dispatchId = activeTable === 'retailer_dispatch' ? record.factory_dispatch_id : record[primaryKey];
    if (dispatchId == null) return;
    setDispatchDetailLoading(true);
    try {
      setDispatchDetail(await getData<FactoryDispatchDetail>(`/crud/factory-dispatch-details/${dispatchId}`));
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setDispatchDetailLoading(false);
    }
  }
  async function openRetailerLedger(record: DataRecord) {
    const retailerId = record[primaryKey];
    if (retailerId == null) return;
    setRetailerLedgerLoading(true);
    try {
      setRetailerLedger(await getData<RetailerLedger>(`/crud/retailer-ledger/${retailerId}`));
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setRetailerLedgerLoading(false);
    }
  }
  async function openAuditInfo(record: DataRecord) {
    const recordId = activeTable === 'retailer_dispatch' ? record.factory_dispatch_id : record[primaryKey];
    if (recordId == null) return;
    setAuditOpen(true);
    setAuditInfo(null);
    setAuditError('');
    setAuditLoading(true);
    try {
      setAuditInfo(await getData<AuditInfo>(`/crud/audit/${activeTable}/${recordId}`));
    } catch (error) {
      setAuditError(errorText(error));
    } finally {
      setAuditLoading(false);
    }
  }
  function field(column: ColumnMeta) {
    if (column.foreign_table) {
      const options = activeTable === 'factory_destination' && column.column_name === 'factory_plant_id'
        ? destinationPlantOptions
        : relationOptions[column.column_name] || [];
      const disabled = activeTable === 'factory_destination' && column.column_name === 'factory_plant_id' && !selectedDestinationFactoryId;
      const retailerAreaDisabled = activeTable === 'retailers' && column.column_name === 'city_area_id' && !selectedRetailerCityId;
      const bankReceiptRetailerDisabled = activeTable === 't_bank_retailer_receipts' && column.column_name === 'retailer_id' && !bankReceiptAreaId;
      const expenseSubHeadDisabled = activeTable === 'expense_main' && column.column_name === 'subhead_id' && !selectedExpenseHeadId;
      return <Select
        showSearch
        allowClear
        optionFilterProp="label"
        options={options}
        disabled={disabled || retailerAreaDisabled || bankReceiptRetailerDisabled || expenseSubHeadDisabled}
        onChange={activeTable === 'retailers' && column.column_name === 'city_id'
          ? () => form.setFieldValue('city_area_id', undefined)
          : activeTable === 'expense_main' && column.column_name === 'head_id'
            ? () => form.setFieldValue('subhead_id', undefined)
            : undefined}
      />;
    }
    if (activeTable === 't_bank_retailer_receipts' && column.column_name === 'payment_mode') {
      return <Radio.Group
        options={[{ label: 'Bank', value: 'BANK' }, { label: 'Cash', value: 'CASH' }]}
        onChange={(event) => {
          if (event.target.value === 'CASH') form.setFieldsValue({ receiving_end: undefined, distributor_bank_account_id: undefined, instrument_type: undefined, instrument_number: undefined });
        }}
      />;
    }
    if (activeTable === 'expense_main' && column.column_name === 'payment_mode') {
      return <Radio.Group options={[{label:'Bank',value:'BANK'},{label:'Cash',value:'CASH'}]} onChange={(event)=>{
        if(event.target.value==='CASH')form.setFieldsValue({distributor_bank_account_id:undefined,instrument_type:undefined,instrument_number:undefined});
      }}/>;
    }
    if (activeTable === 't_bank_retailer_receipts' && column.column_name === 'receiving_end') {
      return <Radio.Group
        options={[{ label: 'Distributor', value: 'DISTRIBUTOR' }, { label: 'Factory', value: 'FACTORY' }]}
        onChange={() => form.setFieldValue('distributor_bank_account_id', undefined)}
      />;
    }
    if (column.column_name === 'instrument_type') {
      return <Select
        placeholder="Select Instrument Type"
        options={[
          { value: 'CHEQUE', label: 'Cheque' },
          { value: 'CASH', label: 'Cash' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'ONLINE', label: 'Online' },
        ]}
      />;
    }
    if (activeTable === 'vehicles' && column.column_name === 'loading_capacity_unit') {
      return <Select
        placeholder="Select Loading Capacity Unit"
        options={[
          { value: 'Tons', label: 'Tons' },
          { value: 'KG', label: 'KG' },
        ]}
      />;
    }
    const options = activeTable === 'distributor_bank_accounts' && column.column_name === 'type'
      ? ['BUSINESS', 'PERSONAL', 'FACTORY']
      : enumOptions(column.enum_values);
    if (options.length) return <Select
      options={options.map((value: string) => ({ value, label: enumOptionLabel(column, value) }))}
      onChange={activeTable === 'distributor_bank_accounts' && column.column_name === 'type'
        ? (value) => { if (value === 'FACTORY') form.setFieldValue('opening_balance', 0); }
        : undefined}
    />;
    if (column.data_type === 'boolean') return <Checkbox />;
    if (numericDataTypes.has(column.data_type)) {
      const maximum = activeTable === 'retailer_dispatch' && column.column_name === 'no_of_bags'
          ? factoryDispatchMaxBags ?? undefined
          : activeTable === 't_bank_retailer_receipts' && column.column_name === 'fare_amount'
            ? bankReceiptFareAvailable ?? undefined
            : activeTable === 't_bank_retailer_receipts' && column.column_name === 'cement_amount'
              ? bankReceiptCementAvailable ?? undefined
          : undefined;
      return <InputNumber
        className="full-width"
        disabled={(activeTable === 't_factory_dispatch' && ['rate_per_bag', 'amount'].includes(column.column_name)) || (activeTable === 'expense_main' && !selectedExpenseSubHeadId) || (['retailers', 'factory_plant', 'distributor_bank_accounts'].includes(activeTable) && column.column_name === 'opening_balance' && Boolean(editing))}
        onKeyUp={maximum !== undefined ? () => { void form.validateFields([column.column_name]).catch(() => undefined); } : undefined}
      />;
    }
    if (column.data_type === 'date') return <DatePicker className="full-width" disabled={(activeTable === 'expense_main' && !selectedExpenseSubHeadId) || (activeTable === 'distributor_bank_accounts' && column.column_name === 'opening_balance_date' && Boolean(editing))} />;
    if (column.data_type.includes('timestamp')) return <DatePicker showTime className="full-width" />;
    if (['json', 'jsonb', 'text'].includes(column.data_type)) return <Input.TextArea rows={3} disabled={activeTable === 'expense_main' && !selectedExpenseSubHeadId} />;
    return <Input disabled={activeTable === 'expense_main' && !selectedExpenseSubHeadId} />;
  }

  const columns = useMemo<ColumnsType<DataRecord>>(() => {
    const compactTable = ['expense_main', 'adjustment_main'].includes(activeTable);
    const compactColumnWidths: Record<string, number> = activeTable === 'expense_main'
      ? {
          title: 135,
          amount: 85,
          date: 95,
          payment_mode: 95,
          distributor_bank_account_id: 115,
          instrument_type: 105,
          instrument_number: 110,
          description: 165,
          head_name: 110,
          subhead_name: 110,
        }
      : activeTable === 'adjustment_main'
        ? {
            adjustment_name: 125,
            factory_plant_name: 145,
            amount: 90,
            date: 95,
            distributor_bank_account_id: 115,
            instrument_type: 100,
            instrument_number: 105,
            released_at: 105,
            description: 150,
          }
        : {};
    const hiddenTableFields = new Set([
      'is_deleted',
      primaryKey,
      'id',
      ...(activeTable === 'designation' ? ['created_by', 'created_at', 'updated_by', 'updated_at'] : []),
      ...(activeTable === 'city_area' ? ['created_by', 'updated_by'] : []),
      ...(['expense_head', 'expense_sub_head'].includes(activeTable) ? ['created_by', 'created_at', 'updated_by', 'updated_at'] : []),
      ...(activeTable === 'expense_main' ? ['head_id', 'subhead_id', 'created_by', 'created_at', 'updated_by', 'updated_at'] : []),
      ...(activeTable === 'income_main' ? ['income_head_id', 'factory_plant_id', 'created_by', 'created_at', 'updated_by', 'updated_at'] : []),
      ...(activeTable === 'income_heads' ? ['created_by', 'created_at', 'updated_by', 'updated_at'] : []),
      ...(activeTable === 'adjustment_heads' ? ['created_by', 'created_at', 'updated_by', 'updated_at'] : []),
      ...(activeTable === 'adjustment_main' ? ['adjustment_head_id', 'factory_plant_id', 'is_released', 'created_by', 'created_at', 'updated_by', 'updated_at'] : []),
      ...(activeTable === 'retailers' ? ['city_id', 'city_area_id', 'city_area_name'] : []),
      ...(activeTable === 'retailer_dispatch' ? ['factory_dispatch_id'] : []),
      ...(activeTable === 'vehicles' ? ['owner_id'] : []),
    ]);
    const availableKeys = rows[0] ? Object.keys(rows[0]).filter((key) => !hiddenTableFields.has(key)) : [];
    const keys = activeTable === 'retailers'
      ? ['retailer_name', 'business_name', 'city_name', 'contact_number', 'balance', 'status'].filter((key) => availableKeys.includes(key))
      : activeTable === 'vehicles'
        ? ['make', 'model', 'reg_number', 'loading_capacity', 'loading_capacity_unit', 'owner_type', 'owner_name', 'owner_contact', 'status'].filter((key) => availableKeys.includes(key))
        : activeTable === 'retailer_dispatch'
          ? ['builty_number', 'date', 'retailer_count', 'total_bags', 'total_cement_amount', 'total_fare_amount', 'fare_received', 'fare_balance', 'grand_total'].filter((key) => availableKeys.includes(key))
        : activeTable === 't_factory_dispatch'
          ? availableKeys.filter((key) => key !== 'created_at').slice(0, 8)
        : activeTable === 'factory_plant'
          ? availableKeys.filter((key) => key !== 'created_at').slice(0, 8)
        : availableKeys.slice(0, 8);
    const dataColumns = keys.flatMap((key) => {
      const column = meta?.columns.find((item) => item.column_name === key);
      const dataColumn = { title: activeTable === 'retailers' && key === 'city_name' ? 'City / Area' : activeTable === 'retailers' && key === 'opening_balance' ? 'Balance' : activeTable === 'factory_destination' && key === 'city_id' ? 'Destination City' : label(key, column), dataIndex: key, key, ellipsis: true, ...(compactColumnWidths[key] ? { width: compactColumnWidths[key] } : {}), render: (value: unknown, record: DataRecord) => {
        if (activeTable === 'retailers' && key === 'city_name') {
          return value ? `${String(value)}${record.city_area_name ? `: ${String(record.city_area_name)}` : ''}` : '-';
        }
        if (activeTable === 'retailers' && key === 'status') {
          const nextStatus = value === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          const nextStatusLabel = nextStatus === 'ACTIVE' ? 'Active' : 'Inactive';
          return <Popconfirm
            title={`Make this retailer ${nextStatusLabel}?`}
            description={nextStatus === 'INACTIVE'
              ? 'This retailer will no longer be available for selection in new transactions.'
              : 'This retailer will be available for selection in new transactions.'}
            okText="Yes"
            cancelText="No"
            onConfirm={() => toggleRetailerStatus(record)}
            disabled={!canUpdate}
          >
            <Switch checked={value === 'ACTIVE'} checkedChildren="ACTIVE" unCheckedChildren="INACTIVE" disabled={!canUpdate} />
          </Popconfirm>;
        }
        if (activeTable === 'retailers' && key === 'balance') {
          return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
        }
        if (activeTable === 'retailer_dispatch' && key === 'date') {
          return formatTableDate(value, 'date');
        }
        if (activeTable === 'retailer_dispatch' && key === 'total_bags') {
          return `${Number(value || 0).toLocaleString()} / ${Number(record.bilty_total_bags || 0).toLocaleString()}`;
        }
        if (activeTable === 'adjustment_main' && key === 'is_released') {
          return value ? <Text type="success" strong>Released</Text> : <Text type="warning" strong>Unreleased</Text>;
        }
        if (relationOptions[key]?.length) {
          return relationOptions[key].find((option) => option.value === String(value))?.label || String(value);
        }
        if (value == null) return '-';
        if (column?.data_type === 'date' || column?.data_type.includes('timestamp')) {
          return formatTableDate(value, column.data_type);
        }
        if (column && numericDataTypes.has(column.data_type)) {
          const maximumFractionDigits = /amount|rate|fare|balance|total/i.test(key) ? 2 : 3;
          return Number(value).toLocaleString('en-US', { maximumFractionDigits });
        }
        return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'object' ? JSON.stringify(value) : String(value);
      } };

      if (activeTable === 't_factory_dispatch' && key === 'weight_in_tons') {
        return [dataColumn, {
          title: 'No. of Bags',
          key: 'calculated_bags',
          render: (_: unknown, record: DataRecord) => (Number(record.weight_in_tons) * 20).toLocaleString('en-US', { maximumFractionDigits: 3 }),
        }];
      }
      return [dataColumn];
    });

    const hasDispatchView = ['t_factory_dispatch', 'retailer_dispatch'].includes(activeTable);
    const hasRetailerLedger = ['retailers', 'factory_plant', 'distributor_bank_accounts'].includes(activeTable);
    const hasActions = true;
    return hasActions ? [...dataColumns, {
      title: 'Actions', key: 'actions', ...(compactTable ? {} : { fixed: 'right' as const }), width: hasRetailerLedger ? 430 : activeTable === 'adjustment_main' ? 235 : activeTable === 'expense_main' ? 145 : activeTable === 'retailer_dispatch' ? 190 : activeTable === 't_factory_dispatch' ? 206 : 158, render: (_: unknown, record: DataRecord) => <Space>
        {activeTable === 'adjustment_main' && !record.is_released && canUpdate && <Tooltip title="Release adjustment"><Button type="primary" onClick={() => { releaseForm.setFieldValue('released_at', dayjs()); setReleaseRecord(record); }}>Release</Button></Tooltip>}
        {hasDispatchView && <Tooltip title="View bilty details"><Button aria-label="View dispatch details" icon={<EyeOutlined />} loading={dispatchDetailLoading} onClick={() => openDispatchDetail(record)} /></Tooltip>}
        {activeTable === 'retailer_dispatch' && onView && <Tooltip title="Open bilty page"><Button aria-label="Open bilty page" icon={<ExportOutlined />} onClick={() => onView(record)} /></Tooltip>}
        {hasRetailerLedger && onReceive && (activeTable !== 'retailers' || record.status === 'ACTIVE') && <Tooltip title={activeTable === 'factory_plant' ? 'Add payment' : 'Add receiving'}><Button type="primary" ghost style={{ background: '#fff' }} aria-label={activeTable === 'factory_plant' ? 'Add payment' : 'Add receiving'} icon={<PlusOutlined />} onClick={() => onReceive(record)}>{activeTable === 'factory_plant' ? 'Add Payment' : 'Add Receivings'}</Button></Tooltip>}
        {hasRetailerLedger && <Tooltip title="View ledger"><Button icon={<BookOutlined />} loading={retailerLedgerLoading} onClick={() => onLedger ? onLedger(record) : openRetailerLedger(record)}>View Ledger</Button></Tooltip>}
        {activeTable !== 'retailer_dispatch' && canUpdate && <Tooltip title="Edit record"><Button aria-label="Edit record" className="warning-action" icon={<EditOutlined />} onClick={() => openEdit(record)} /></Tooltip>}
        {activeTable !== 'retailer_dispatch' && activeTable !== 'retailers' && canDelete && <Tooltip title="Delete record"><Popconfirm title="Delete this record?" description="Related business records may prevent deletion." onConfirm={() => remove(record)}><Button aria-label="Delete record" danger icon={<DeleteOutlined />} /></Popconfirm></Tooltip>}
        <Tooltip title="View audit information"><Button aria-label="View audit information" icon={<HistoryOutlined />} loading={auditLoading} onClick={() => openAuditInfo(record)} /></Tooltip>
      </Space>,
    }] : dataColumns;
  }, [activeTable, rows, meta, primaryKey, relationOptions, canUpdate, canDelete, dispatchDetailLoading, retailerLedgerLoading, auditLoading, onView, onReceive, onLedger]);

  const content = <>
    <div className="crud-header">
      <div><Title level={embedded ? 4 : 3}>{title}</Title>{description && <Text>{description}</Text>}</div>
      <Space wrap>
        <Button aria-label="Reload records" icon={<ReloadOutlined />} onClick={() => loadRows()} />
        {onHeaderLedger && <Button icon={<BookOutlined />} onClick={onHeaderLedger}>Ledger</Button>}
        {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={onCreate || openCreate} disabled={!meta}>New</Button>}
      </Space>
    </div>
    <Input.Search
      allowClear
      className="crud-search"
      placeholder="Search records"
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      onSearch={() => { setPage(1); loadRows(activeTable, 1); }}
    />
    <Table rowKey={(record, index) => String(record[primaryKey] ?? index)} columns={columns} dataSource={rows} loading={loading} pagination={{ current: page, pageSize: 20, total, showSizeChanger: false, showTotal: (count) => `${count} records`, onChange: (next) => { setPage(next); loadRows(activeTable, next); } }} scroll={['expense_main', 'adjustment_main'].includes(activeTable) ? undefined : { x: true }} />
    <Modal
      title={<span className="modal-title"><FormOutlined />{editing ? `Edit ${meta?.title}` : `New ${meta?.title}`}</span>}
      open={modalOpen}
      onOk={submit}
      confirmLoading={saving}
      onCancel={() => setModalOpen(false)}
      width={modalWidth}
      okText="Save"
    >
      <Form form={form} layout="vertical" className={formClassName}>
        {activeTable === 'factory_destination' && (
          <div>
            <Form.Item name="destination_factory_id" label="Factory" rules={[{ required: true, message: 'Factory is required' }]}>
              <Select showSearch allowClear optionFilterProp="label" options={relationOptions.destination_factory_id || []} />
            </Form.Item>
          </div>
        )}
        {visibleFormColumns.flatMap((column) => [
          <div
            key={column.column_name}
            className={[
              vehicleOwnerFields.has(column.column_name) && column.column_name === 'owner_name' ? 'form-section-start' : '',
              activeTable === 't_bank_retailer_receipts' && column.column_name === 'payment_mode' ? 'receipt-payment-mode' : '',
              activeTable === 't_bank_retailer_receipts' && column.column_name === 'fare_amount' ? 'receipt-fare-amount' : '',
              activeTable === 't_bank_retailer_receipts' && column.column_name === 'cement_amount' ? 'receipt-cement-amount' : '',
              activeTable === 'adjustment_main' && column.column_name === 'is_released' ? 'adjustment-release-toggle' : '',
              activeTable === 'adjustment_main' && column.column_name === 'instrument_number' ? 'adjustment-instrument-number' : '',
              activeTable === 'adjustment_main' && column.column_name === 'released_at' ? 'adjustment-release-date' : '',
            ].filter(Boolean).join(' ') || undefined}
          >
            {vehicleOwnerFields.has(column.column_name) && column.column_name === 'owner_name' && <div className="form-section-title">Owner Details</div>}
            {activeTable === 'adjustment_main' && column.column_name === 'is_released' ? (
              <div className="adjustment-release-inline">
                <Form.Item name="is_released" label="Is Released" valuePropName="checked">
                  <Checkbox />
                </Form.Item>
                {adjustmentReleased && <Form.Item name="released_at" label="Release Date" rules={[{ required: true, message: 'Release Date is required' }]}>
                  <DatePicker className="full-width" />
                </Form.Item>}
              </div>
            ) : <Form.Item
              name={column.column_name}
              label={activeTable === 't_factory_dispatch' && column.column_name === 'amount' && factoryPlantProjectedRemaining != null
                  ? `Amount (Remaining: ${factoryPlantProjectedRemaining.toLocaleString('en-US', { maximumFractionDigits: 2 })})`
                : activeTable === 'retailer_dispatch' && column.column_name === 'no_of_bags' && factoryDispatchMaxBags != null
                  ? `No. of Bags (Remaining Bags: ${factoryDispatchMaxBags})`
                : activeTable === 'factory_destination' && column.column_name === 'city_id'
                  ? 'Destination City'
                : activeTable === 't_bank_retailer_receipts' && column.column_name === 'retailer_id' && retailerProjectedBalance != null
                  ? `Apply Payment To (Current Balance: ${retailerProjectedBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })})`
                : activeTable === 't_bank_retailer_receipts' && column.column_name === 'retailer_id'
                  ? 'Apply Payment To'
                : activeTable === 't_bank_retailer_receipts' && column.column_name === 'paid_by_retailer_id'
                  ? 'Paid By Retailer'
                : activeTable === 't_bank_retailer_receipts' && column.column_name === 'is_third_party_payment'
                  ? 'Paying for another retailer'
                : activeTable === 't_bank_retailer_receipts' && column.column_name === 'fare_amount' && bankReceiptFareRemaining != null
                  ? `Fare Amount: (Remaining: ${bankReceiptFareRemaining.toLocaleString('en-US', { maximumFractionDigits: 2 })})`
                : activeTable === 't_bank_retailer_receipts' && column.column_name === 'cement_amount' && bankReceiptCementRemaining != null
                  ? `Cement Amount: (Remaining: ${bankReceiptCementRemaining.toLocaleString('en-US', { maximumFractionDigits: 2 })})`
                : label(column.column_name, column)}
              valuePropName={column.data_type === 'boolean' ? 'checked' : 'value'}
              rules={[
                { required:
                  (activeTable === 'vehicles' && ownerType === 'OTHER' && column.column_name === 'owner_name')
                  || (activeTable === 't_bank_retailer_receipts' && bankReceiptPaymentMode === 'BANK' && ['receiving_end', 'distributor_bank_account_id', 'instrument_type'].includes(column.column_name))
                  || (activeTable === 'expense_main' && expensePaymentMode === 'BANK' && ['distributor_bank_account_id','instrument_type'].includes(column.column_name))
                  || (column.is_nullable === 'NO' && column.column_default == null),
                  message: `${label(column.column_name, column)} is required` },
                ...(activeTable === 'retailer_dispatch' && column.column_name === 'no_of_bags' && factoryDispatchMaxBags != null
                  ? [{ type: 'number' as const, max: factoryDispatchMaxBags, message: `No. of Bags cannot exceed the ${factoryDispatchMaxBags} remaining bags` }]
                  : []),
                ...(activeTable === 't_bank_retailer_receipts' && column.column_name === 'fare_amount' && bankReceiptFareAvailable != null
                  ? [{ type: 'number' as const, max: bankReceiptFareAvailable, message: `Fare Amount cannot exceed ${bankReceiptFareAvailable}` }]
                  : []),
                ...(activeTable === 't_bank_retailer_receipts' && column.column_name === 'cement_amount' && bankReceiptCementAvailable != null
                  ? [{ type: 'number' as const, max: bankReceiptCementAvailable, message: `Cement Amount cannot exceed ${bankReceiptCementAvailable}` }]
                  : []),
              ]}
            >
              {field(column)}
            </Form.Item>}
          </div>,
          ...(activeTable === 't_bank_retailer_receipts' && column.column_name === 'payment_mode'
            ? [
                <div key="bank-receipt-city">
                  <Form.Item name="bank_receipt_city_id" label="City" rules={[{ required: true, message: 'City is required' }]}>
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      options={relationOptions.bank_receipt_cities || []}
                      onChange={() => form.setFieldsValue({ bank_receipt_area_id: undefined, retailer_id: undefined })}
                    />
                  </Form.Item>
                </div>,
                <div key="bank-receipt-area">
                  <Form.Item name="bank_receipt_area_id" label="City Area" rules={[{ required: true, message: 'City Area is required' }]}>
                    <Select
                      showSearch
                      allowClear
                      optionFilterProp="label"
                      options={relationOptions.bank_receipt_areas || []}
                      disabled={!bankReceiptCityId}
                      onChange={() => form.setFieldValue('retailer_id', undefined)}
                    />
                  </Form.Item>
                </div>,
              ]
            : []),
          ...(activeTable === 't_bank_retailer_receipts' && column.column_name === 'retailer_id'
            ? [
                <div key="bank-receipt-total-amount">
                  <Form.Item name="amount" label="Add Amount" rules={[{ type: 'number', min: 0, message: 'Add Amount cannot be negative' }]}>
                    <InputNumber className="full-width" min={0} />
                  </Form.Item>
                </div>,
              ]
            : []),
          ...(activeTable === 'retailer_dispatch' && column.column_name === 'retailer_id'
            ? [
                <div key="retailer-dispatch-source-city">
                  <Form.Item name="retailer_dispatch_source_city_id" label="Source City">
                    <Select disabled options={relationOptions.retailer_dispatch_cities || []} />
                  </Form.Item>
                </div>,
                <div key="retailer-dispatch-destination-city">
                  <Form.Item name="retailer_dispatch_destination_city_id" label="Destination City">
                    <Select disabled options={relationOptions.retailer_dispatch_cities || []} />
                  </Form.Item>
                </div>,
              ]
            : []),
          ...(activeTable === 'factory_destination' && column.column_name === 'factory_plant_id'
            ? [
                <div key="destination-source-city">
                  <Form.Item name="destination_source_city_id" label="Source City">
                    <Select disabled options={relationOptions.city_id || []} />
                  </Form.Item>
                </div>,
              ]
            : []),
          ...(activeTable === 't_factory_dispatch' && column.column_name === 'rate_per_bag'
            ? [
                <div key="calculated-bags">
                  <Form.Item label="No. of Bags">
                    <InputNumber className="full-width" value={calculatedBags} disabled />
                  </Form.Item>
                </div>,
              ]
            : []),
        ])}
        {activeTable === 't_bank_retailer_receipts' && selectedRetailerId && (
          <div className="form-field-full pending-builty-table">
            <div className="form-section-title">Bilty Receivables</div>
            <div className="pending-builty-totals">
              <div><span>Total Fare Receivable</span><strong>{pendingBuiltyTotals.fare.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
              <div><span>Total Cement Receivable</span><strong>{pendingBuiltyTotals.cement.toLocaleString('en-US', { maximumFractionDigits: 2 })}</strong></div>
            </div>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              loading={pendingBuiltyLoading}
              dataSource={projectedBuiltyState.rows}
              locale={{ emptyText: 'No Bilty receivables' }}
              columns={[
                { title: 'Bilty Number', dataIndex: 'builty_number' },
                { title: 'Date', dataIndex: 'date', render: (value: string) => formatTableDate(value, 'date') },
                { title: 'Fare Receivable', dataIndex: 'fare_receivable', align: 'right', render: (value: string | number) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) },
                { title: 'Cement Receivable', dataIndex: 'cement_receivable', align: 'right', render: (value: string | number) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) },
                { title: 'Cleared', dataIndex: 'cleared', align: 'center', render: (value: boolean) => <Checkbox checked={value} disabled /> },
              ]}
            />
          </div>
        )}
      </Form>
    </Modal>
    <Modal
      title={<span className="modal-title"><HistoryOutlined />Audit Information</span>}
      open={auditOpen}
      onCancel={() => setAuditOpen(false)}
      footer={<Button onClick={() => setAuditOpen(false)}>Close</Button>}
      width={620}
    >
      {auditLoading && <div className="bilty-detail-loading"><Spin tip="Loading audit information..." /></div>}
      {!auditLoading && auditError && <Result status="error" title="Unable to load audit information" subTitle={auditError} />}
      {auditInfo && <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Created At">{auditInfo.created_at ? dayjs(auditInfo.created_at).format('DD-MMM-YYYY hh:mm A') : '—'}</Descriptions.Item>
        <Descriptions.Item label="Created By">{auditInfo.created_by || 'System'}</Descriptions.Item>
        <Descriptions.Item label="Last Updated At">{auditInfo.updated_at ? dayjs(auditInfo.updated_at).format('DD-MMM-YYYY hh:mm A') : '—'}</Descriptions.Item>
        <Descriptions.Item label="Last Updated By">{auditInfo.updated_by || 'System'}</Descriptions.Item>
      </Descriptions>}
    </Modal>
    <Modal title={<span className="modal-title"><FormOutlined />Release Adjustment</span>} open={Boolean(releaseRecord)} onOk={releaseAdjustment} confirmLoading={releaseSaving} onCancel={() => { setReleaseRecord(null); releaseForm.resetFields(); }} okText="Save">
      <Form form={releaseForm} layout="vertical"><Form.Item name="released_at" label="Release Date" rules={[{ required: true, message: 'Release Date is required' }]}><DatePicker className="full-width" /></Form.Item></Form>
    </Modal>
    <Modal
      title={dispatchDetail ? `Bilty Details - ${dispatchDetail.dispatch.builty_number}` : 'Bilty Details'}
      open={Boolean(dispatchDetail)}
      onCancel={() => setDispatchDetail(null)}
      footer={null}
      width={1200}
    >
      {dispatchDetail && (
        <>
          <Descriptions bordered column={{ xs: 1, sm: 2, lg: 4 }} size="small" className="dispatch-detail-summary">
            <Descriptions.Item label="Bilty Number">{String(dispatchDetail.dispatch.builty_number)}</Descriptions.Item>
            <Descriptions.Item label="Date">{formatTableDate(dispatchDetail.dispatch.date, 'date')}</Descriptions.Item>
            <Descriptions.Item label="Factory">{String(dispatchDetail.dispatch.factory_name)}</Descriptions.Item>
            <Descriptions.Item label="Factory Plant">{String(dispatchDetail.dispatch.plant_name)}</Descriptions.Item>
            <Descriptions.Item label="Vehicle">{String(dispatchDetail.dispatch.vehicle)}</Descriptions.Item>
            <Descriptions.Item label="Weight In Tons">{Number(dispatchDetail.dispatch.weight_in_tons).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Total Bags">{Number(dispatchDetail.dispatch.total_bags).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Rate Per Ton">{Number(dispatchDetail.dispatch.rate_per_ton).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Factory Rate Per Bag">{Number(dispatchDetail.dispatch.rate_per_bag).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Factory Amount">{Number(dispatchDetail.dispatch.payable_amount).toLocaleString()}</Descriptions.Item>
          </Descriptions>
          <Table
            className="dispatch-detail-table"
            rowKey={(record) => String(record.id)}
            pagination={false}
            scroll={{ x: 760 }}
            dataSource={dispatchDetail.retailers}
            summary={(rows) => {
              const totals = rows.reduce<{
                bags: number;
                cementAmount: number;
                fareReceivable: number;
                total: number;
              }>(
                (sum, row) => ({
                  bags: sum.bags + Number(row.no_of_bags || 0),
                  cementAmount: sum.cementAmount + Number(row.cement_amount || 0),
                  fareReceivable: sum.fareReceivable + Number(row.fare_receivable || 0),
                  total: sum.total + Number(row.total || 0),
                }),
                { bags: 0, cementAmount: 0, fareReceivable: 0, total: 0 },
              );

              return (
                <Table.Summary.Row className="dispatch-detail-total-row">
                  <Table.Summary.Cell index={0} className="summary-label"><strong>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} className="summary-bags"><strong>{totals.bags.toLocaleString()}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} className="summary-rate">-</Table.Summary.Cell>
                  <Table.Summary.Cell index={3} className="summary-rate">-</Table.Summary.Cell>
                  <Table.Summary.Cell index={4} className="summary-cement"><strong>{totals.cementAmount.toLocaleString()}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} className="summary-fare"><strong>{totals.fareReceivable.toLocaleString()}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} className="summary-total"><strong>{totals.total.toLocaleString()}</strong></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
            columns={[
              { title: 'Retailer', dataIndex: 'retailer', key: 'retailer' },
              { title: 'Bags', dataIndex: 'no_of_bags', key: 'no_of_bags', render: (value) => Number(value).toLocaleString() },
              { title: 'Rate Per Bag', dataIndex: 'retailer_rate_per_bag', key: 'retailer_rate_per_bag', render: (value) => Number(value).toLocaleString() },
              { title: 'Applied Rate Per Bag', dataIndex: 'applied_rate_per_bag', key: 'applied_rate_per_bag', render: (value) => Number(value).toLocaleString() },
              { title: 'Cement Amount', dataIndex: 'cement_amount', key: 'cement_amount', render: (value) => Number(value).toLocaleString() },
              { title: 'Fare Receivable', dataIndex: 'fare_receivable', key: 'fare_receivable', render: (value) => Number(value).toLocaleString() },
              { title: 'Total', dataIndex: 'total', key: 'total', render: (value) => Number(value).toLocaleString() },
            ]}
          />
        </>
      )}
    </Modal>
    <Modal
      title={retailerLedger ? `Retailer Ledger - ${retailerLedger.retailer.name}` : 'Retailer Ledger'}
      open={Boolean(retailerLedger)}
      onCancel={() => setRetailerLedger(null)}
      footer={null}
      width={900}
    >
      <Table
        rowKey={(_, index) => String(index)}
        pagination={false}
        dataSource={retailerLedger?.entries || []}
        scroll={{ x: 700, y: 480 }}
        columns={[
          { title: 'Cashflow Type', dataIndex: 'cashflow_type' },
          { title: 'Date', dataIndex: 'date', render: (value: string | null) => value ? formatTableDate(value, 'date') : '-' },
          { title: 'Receivable', dataIndex: 'receivable', align: 'right', render: (value: string | number) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) },
          { title: 'Payable', dataIndex: 'payable', align: 'right', render: (value: string | number) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) },
          { title: 'Current Balance', dataIndex: 'current_balance', align: 'right', render: (value: string | number) => Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 }) },
        ]}
      />
    </Modal>
  </>;
  return embedded ? <div className="embedded-crud">{content}</div> : <Card className="module-card">{content}</Card>;
}
