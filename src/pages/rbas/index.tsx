import { DeleteOutlined, EditOutlined, FormOutlined, HistoryOutlined, KeyOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Tooltip, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { canAccess, deleteData, getData, getStoredUser, PagePermission, patchData, postData } from '../../services/api';

const { Title, Text } = Typography;
interface UserRow { id: number; name: string; email: string; mobile?: string; cnic?: string; date_of_joining?: string; designation_id?: number; designation_name?: string; city_id?: number; area_id?: number; city_name?: string; area_name?: string; role_id?: number; username: string; is_system_user: boolean; roles: string }
interface RoleRow { id: number; name: string; description?: string; is_active: boolean; user_count: number }
interface RbasPage { key: string; title: string; group: string }
interface SelectOption { value: string; label: string }
interface AreaOption extends SelectOption { cityId: string }
interface LocationOptions { cities: SelectOption[]; areas: AreaOption[] }
interface UserAudit { created_at?: string; created_by_name?: string; updated_at?: string; updated_by_name?: string }

function securePassword(length = 18) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function UsersPage() {
  const currentUser = getStoredUser();
  const isSuperAdmin = Boolean(currentUser?.roles?.includes('SUPER_ADMIN'));
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<UserAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [designations, setDesignations] = useState<SelectOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([]);
  const [form] = Form.useForm();
  const systemUserEnabled = Form.useWatch('isSystemUser', form);
  const selectedCityId = Form.useWatch('cityId', form);
  const filteredAreaOptions = useMemo(() => areaOptions.filter((area) => area.cityId === String(selectedCityId)), [areaOptions, selectedCityId]);
  const load = async () => { setLoading(true); try { setRows(await getData<UserRow[]>('/rbas/users')); } finally { setLoading(false); } };
  useEffect(() => {
    void load();
    void getData<SelectOption[]>('/crud/designation/options').then(setDesignations);
    void getData<SelectOption[]>('/rbas/users/role-options').then(setRoleOptions);
    void getData<LocationOptions>('/rbas/users/location-options').then((options) => {
      setCityOptions(options.cities);
      setAreaOptions(options.areas);
    });
  }, []);
  const generate = () => { const password = securePassword(); form.setFieldValue('password', password); void navigator.clipboard?.writeText(password); message.success('Secure password generated and copied'); };
  const edit = (row?: UserRow) => { setEditing(row || null); form.resetFields(); form.setFieldsValue(row ? {
    ...row,
    designationId: row.designation_id ? String(row.designation_id) : undefined,
    cityId: row.city_id ? String(row.city_id) : undefined,
    areaId: row.area_id ? String(row.area_id) : undefined,
    roleId: row.role_id ? String(row.role_id) : undefined,
    dateOfJoining: row.date_of_joining ? dayjs(row.date_of_joining) : undefined,
    isSystemUser: row.is_system_user,
  } : { isSystemUser: false }); setOpen(true); };
  const save = async () => {
    const values = await form.validateFields() as Record<string, unknown> & { dateOfJoining?: Dayjs }; setSaving(true);
    const payload = { ...values, dateOfJoining: values.dateOfJoining?.format('YYYY-MM-DD') || null };
    try { editing ? await patchData(`/rbas/users/${editing.id}`, payload) : await postData('/rbas/users', payload); setOpen(false); await load(); message.success('Employee saved'); }
    catch (error: any) { message.error(error.response?.data?.message || 'Unable to save user'); } finally { setSaving(false); }
  };
  const removeEmployee = async (row: UserRow) => {
    try { await deleteData(`/rbas/users/${row.id}`); await load(); message.success('Employee deleted'); }
    catch (error: any) { message.error(error.response?.data?.message || 'Unable to delete employee because it may be used in existing records.'); }
  };
  const showAudit = async (row: UserRow) => {
    setAuditLoading(true);
    try { setAudit(await getData<UserAudit>(`/rbas/users/${row.id}/audit`)); }
    catch { message.error('Unable to load employee history'); }
    finally { setAuditLoading(false); }
  };
  const auditDate = (value?: string) => value ? dayjs(value).format('DD MMM YYYY, hh:mm A') : '-';
  return <>
    <div className="crud-header"><div><Title level={3}>Employee</Title><Text>Create employees with login access and control system-user access.</Text></div><Space><Button icon={<ReloadOutlined />} onClick={load}/>{canAccess(currentUser, 'rbas:users', 'create') && <Button type="primary" icon={<PlusOutlined />} onClick={() => edit()}>New Employee</Button>}</Space></div>
    <Table rowKey="id" loading={loading} dataSource={rows} columns={[
      { title: 'Name', dataIndex: 'name' }, { title: 'Designation', dataIndex: 'designation_name', render: (value: string) => value || <Text type="secondary">Not assigned</Text> },
      { title: 'City / Area', render: (_: unknown, row: UserRow) => row.city_name ? `${row.city_name}${row.area_name ? `: ${row.area_name}` : ''}` : <Text type="secondary">Not assigned</Text> },
      { title: 'CNIC', dataIndex: 'cnic' }, { title: 'Joining Date', dataIndex: 'date_of_joining', render: (value: string) => value ? value.slice(0, 10) : '' },
      { title: 'Username', dataIndex: 'username' }, { title: 'Email', dataIndex: 'email' },
      { title: 'Roles', dataIndex: 'roles', render: (value: string) => value || <Text type="secondary">Not assigned</Text> },
      { title: 'System User', dataIndex: 'is_system_user', render: (value: boolean) => value ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
      { title: 'Actions', render: (_: unknown, row: UserRow) => <Space>
        {canAccess(currentUser, 'rbas:users', 'update') && <Tooltip title="Edit employee"><Button aria-label="Edit employee" className="warning-action" icon={<EditOutlined />} onClick={() => edit(row)} /></Tooltip>}
        {canAccess(currentUser, 'rbas:users', 'delete') && <Tooltip title="Delete employee"><Popconfirm title="Delete this employee?" description="Employees used in existing records cannot be deleted." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => removeEmployee(row)}><Button aria-label="Delete employee" danger icon={<DeleteOutlined />} /></Popconfirm></Tooltip>}
        <Tooltip title="View history"><Button aria-label="View employee history" icon={<HistoryOutlined />} loading={auditLoading} onClick={() => showAudit(row)} /></Tooltip>
      </Space> },
    ]}/>
    <Modal title={<span className="modal-title"><FormOutlined />{editing ? 'Edit Employee' : 'New Employee'}</span>} open={open} onCancel={() => setOpen(false)} onOk={save} confirmLoading={saving} okText="Save" width={680}>
      <Form form={form} layout="vertical" className="record-form employee-form" autoComplete="off">
        <Form.Item name="name" label="Name" rules={[{required:true}]}><Input/></Form.Item>
        <Form.Item name="email" label="Email" rules={[{required:true,type:'email'}]}><Input/></Form.Item>
        <Form.Item name="cnic" label="CNIC" rules={[{required:true,message:'CNIC is required'}]}><Input placeholder="e.g. 35202-1234567-1" maxLength={20}/></Form.Item>
        <Form.Item name="mobile" label="Mobile"><Input/></Form.Item>
        <Form.Item name="dateOfJoining" label="Date of Joining"><DatePicker className="full-width" format="DD MMM YYYY"/></Form.Item>
        <Form.Item name="designationId" label="Designation">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Select designation" options={designations}/>
        </Form.Item>
        <Form.Item name="cityId" label="City">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Select city"
            options={cityOptions}
            onChange={() => form.setFieldValue('areaId', undefined)}
          />
        </Form.Item>
        <Form.Item name="areaId" label="City Area">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={selectedCityId ? 'Select city area' : 'Select city first'}
            options={filteredAreaOptions}
            disabled={!selectedCityId}
          />
        </Form.Item>
        <Form.Item name="isSystemUser" label="System User" valuePropName="checked">
          <Switch disabled={!isSuperAdmin} onChange={(checked) => { if (!checked) form.setFieldValue('roleId', undefined); }}/>
        </Form.Item>
        {systemUserEnabled && <Form.Item name="roleId" label="Role" rules={[{required:true,message:'Role is required for a system user'}]}>
          <Select showSearch optionFilterProp="label" placeholder="Select role" options={roleOptions}/>
        </Form.Item>}
        {editing && <Alert className="employee-password-info" type="info" showIcon message="Leave the password empty to keep the employee's current password." />}
        <Form.Item
          className="employee-password-field"
          name="password"
          label={editing ? 'New Password (leave blank to keep current)' : 'Password'}
          rules={editing ? [{ min: 12, message: 'Password must be at least 12 characters' }] : [{ required: true, min: 12, message: 'Password must be at least 12 characters' }]}
        >
          <Input.Password autoComplete="new-password" addonAfter={<Button type="text" size="small" icon={<KeyOutlined />} onClick={generate}>Generate</Button>}/>
        </Form.Item>
      </Form>
    </Modal>
    <Modal title="Employee History" open={Boolean(audit)} footer={null} onCancel={() => setAudit(null)}>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Created At">{auditDate(audit?.created_at)}</Descriptions.Item>
        <Descriptions.Item label="Created By">{audit?.created_by_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="Last Updated At">{auditDate(audit?.updated_at)}</Descriptions.Item>
        <Descriptions.Item label="Last Updated By">{audit?.updated_by_name || '-'}</Descriptions.Item>
      </Descriptions>
    </Modal>
  </>;
}

function RolesPage() {
  const user = getStoredUser(); const [rows,setRows]=useState<RoleRow[]>([]); const [loading,setLoading]=useState(false); const [open,setOpen]=useState(false); const [editing,setEditing]=useState<RoleRow|null>(null); const [form]=Form.useForm();
  const load=async()=>{setLoading(true);try{setRows(await getData('/rbas/roles'));}finally{setLoading(false);}}; useEffect(()=>{void load();},[]);
  const show=(row?:RoleRow)=>{setEditing(row||null);form.resetFields();form.setFieldsValue(row?{...row,isActive:row.is_active}:{isActive:true});setOpen(true);};
  const save=async()=>{const values=await form.validateFields(); editing?await patchData(`/rbas/roles/${editing.id}`,values):await postData('/rbas/roles',values);setOpen(false);await load();message.success('Role saved');};
  return <><div className="crud-header"><div><Title level={3}>Roles</Title><Text>Create reusable roles for access assignments.</Text></div>{canAccess(user,'rbas:roles','create')&&<Button type="primary" icon={<PlusOutlined/>} onClick={()=>show()}>New Role</Button>}</div>
  <Table rowKey="id" loading={loading} dataSource={rows} columns={[{title:'Role',dataIndex:'name'},{title:'Description',dataIndex:'description'},{title:'Status',dataIndex:'is_active',render:(v:boolean)=>v?<Tag color="green">Active</Tag>:<Tag>Inactive</Tag>},...(canAccess(user,'rbas:roles','update')?[{title:'Actions',render:(_:unknown,row:RoleRow)=><Button icon={<EditOutlined/>} onClick={()=>show(row)}>Edit</Button>}]:[])]}/>
  <Modal title={editing?'Edit Role':'New Role'} open={open} onCancel={()=>setOpen(false)} onOk={save}><Form form={form} layout="vertical"><Form.Item name="name" label="Role Name" rules={[{required:true}]}><Input placeholder="e.g. Dispatch Manager"/></Form.Item><Form.Item name="description" label="Description"><Input.TextArea/></Form.Item><Form.Item name="isActive" label="Active" valuePropName="checked"><Switch/></Form.Item></Form></Modal></>;
}

function AssignmentPage() {
  const currentUser=getStoredUser(); const [users,setUsers]=useState<UserRow[]>([]); const [roles,setRoles]=useState<RoleRow[]>([]); const [pages,setPages]=useState<RbasPage[]>([]); const [userId,setUserId]=useState<number>(); const [roleId,setRoleId]=useState<number>(); const [permissions,setPermissions]=useState<Record<string,PagePermission>>({}); const [saving,setSaving]=useState(false);
  useEffect(()=>{Promise.all([getData<UserRow[]>('/rbas/users'),getData<RoleRow[]>('/rbas/roles'),getData<RbasPage[]>('/rbas/pages')]).then(([u,r,p])=>{setUsers(u);setRoles(r);setPages(p);});},[]);
  const selectUser=async(id:number)=>{setUserId(id);const data=await getData<{roleIds:number[];permissions:PagePermission[]}>(`/rbas/assignments/${id}`);setRoleId(data.roleIds[0]);setPermissions(Object.fromEntries(data.permissions.map(p=>[p.pageKey,p])));};
  const change=(key:string,field:keyof PagePermission,value:boolean)=>setPermissions(old=>{
    const current = old[key] || {pageKey:key,canView:false,canCreate:false,canUpdate:false,canDelete:false};
    return {...old,[key]:{...current,pageKey:key,[field]:value}};
  });
  const selectAll=(key:string,value:boolean)=>setPermissions(old=>({...old,[key]:{pageKey:key,canView:value,canCreate:value,canUpdate:value,canDelete:value}}));
  const save=async()=>{if(!userId||!roleId)return message.warning('Select a user and role');setSaving(true);try{await postData('/rbas/assignments',{userId,roleId,permissions:Object.values(permissions)});message.success('Assignment saved. The user must sign in again to refresh the menu.');}finally{setSaving(false);}};
  const columns:any[]=[{title:'Page / Feature',render:(_:unknown,p:RbasPage)=><><div>{p.title}</div><Text type="secondary">{p.group}</Text></>},...(['canView','canCreate','canUpdate','canDelete'] as const).map(field=>({title:field.replace('can',''),align:'center',render:(_:unknown,p:RbasPage)=><Checkbox checked={Boolean(permissions[p.key]?.[field])} onChange={e=>change(p.key,field,e.target.checked)}/>})),{title:'All',align:'center',render:(_:unknown,p:RbasPage)=><Checkbox checked={['canView','canCreate','canUpdate','canDelete'].every(f=>Boolean((permissions[p.key] as any)?.[f]))} onChange={e=>selectAll(p.key,e.target.checked)}/>}];
  return <><div className="crud-header"><div><Title level={3}>Assignment</Title><Text>Assign a role to a user and configure the role's page and action permissions.</Text></div>{canAccess(currentUser,'rbas:assignments','update')&&<Button type="primary" icon={<SaveOutlined/>} loading={saving} onClick={save}>Save Assignment</Button>}</div>
  <Card><Space wrap size="large"><div><Text strong>User</Text><br/><Select showSearch optionFilterProp="label" style={{width:280}} placeholder="Select user" value={userId} options={users.map(u=>({value:u.id,label:`${u.name} (${u.username})`}))} onChange={selectUser}/></div><div><Text strong>Role</Text><br/><Select style={{width:240}} placeholder="Select role" value={roleId} options={roles.map(r=>({value:r.id,label:r.is_active?r.name:`${r.name} (Inactive)`}))} onChange={setRoleId}/></div></Space></Card>
  <Table className="permission-table" rowKey="key" pagination={false} dataSource={pages} columns={columns}/></>;
}

export const RbasPageComponents: Record<string, () => JSX.Element> = { 'rbas:users': UsersPage, 'rbas:roles': RolesPage, 'rbas:assignments': AssignmentPage };
