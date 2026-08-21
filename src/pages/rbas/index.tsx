import { DeleteOutlined, EditOutlined, FormOutlined, KeyOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { canAccess, deleteData, getData, getStoredUser, PagePermission, patchData, postData } from '../../services/api';

const { Title, Text } = Typography;
interface UserRow { id: number; employee_id?: number; employee_name?: string; name: string; email?: string; mobile?: string; cnic?: string; date_of_joining?: string; designation_id?: number; designation_name?: string; city_id?: number; area_id?: number; city_name?: string; area_name?: string; role_id?: number; username: string; is_system_user: boolean; roles: string }
interface EmployeeRecord { id: number; name: string; email?: string; designation_id?: number }
interface RoleRow { id: number; name: string; description?: string; is_active: boolean; user_count: number }
interface RbasPage { key: string; title: string; group: string }
type AssignmentRow = RbasPage & { rowType: 'group' | 'page' };
interface SelectOption { value: string; label: string }

function securePassword(length = 18) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function UsersPage() {
  const currentUser = getStoredUser();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [designations, setDesignations] = useState<SelectOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [roleOptions, setRoleOptions] = useState<SelectOption[]>([]);
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [form] = Form.useForm();
  const systemUserEnabled = true;
  const selectedEmployeeId = Form.useWatch('employeeId', form);
  const employeeName = Form.useWatch('name', form);
  const load = async () => { setLoading(true); try { setRows(await getData<UserRow[]>('/rbas/users')); } finally { setLoading(false); } };
  const loadEmployeeOptions = (excludeUserId?: number) => getData<SelectOption[]>(`/rbas/users/employee-options${excludeUserId ? `?excludeUserId=${excludeUserId}` : ''}`).then(setEmployeeOptions);
  useEffect(() => {
    void load();
    void loadEmployeeOptions();
    void getData<SelectOption[]>('/crud/designation/options').then(setDesignations);
    void getData<SelectOption[]>('/rbas/users/role-options').then(setRoleOptions);
  }, []);
  useEffect(() => {
    if (!open || editing || usernameManuallyEdited || !String(employeeName || '').trim()) return;
    const timer = window.setTimeout(() => {
      void getData<{ username: string }>(`/rbas/users/username-suggestion?name=${encodeURIComponent(String(employeeName))}`)
        .then(({ username }) => form.setFieldValue('username', username));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [editing, employeeName, form, open, usernameManuallyEdited]);
  const generate = () => { const password = securePassword(); form.setFieldValue('password', password); void navigator.clipboard?.writeText(password); message.success('Secure password generated and copied'); };
  const selectEmployee = async (employeeId?: string) => {
    form.setFieldValue('employeeId', employeeId);
    if (!employeeId) return;
    try {
      const employee = await getData<EmployeeRecord>(`/rbas/users/employees/${employeeId}`);
      setUsernameManuallyEdited(false);
      form.setFieldsValue({
        name: employee.name,
        email: employee.email,
        designationId: employee.designation_id ? String(employee.designation_id) : undefined,
      });
    } catch { message.error('Unable to load employee details'); }
  };
  const edit = (row?: UserRow) => { setEditing(row || null); setUsernameManuallyEdited(Boolean(row)); void loadEmployeeOptions(row?.id); form.resetFields(); form.setFieldsValue(row ? {
    ...row,
    employeeId: row.employee_id ? String(row.employee_id) : undefined,
    designationId: row.designation_id ? String(row.designation_id) : undefined,
    roleId: row.role_id ? String(row.role_id) : undefined,
    isSystemUser: true,
  } : { isSystemUser: true }); setOpen(true); };
  const save = async () => {
    const payload = await form.validateFields() as Record<string, unknown>; setSaving(true);
    try { editing ? await patchData(`/rbas/users/${editing.id}`, payload) : await postData('/rbas/users', payload); setOpen(false); await load(); message.success('User saved'); }
    catch (error: any) { message.error(error.response?.data?.message || 'Unable to save user'); } finally { setSaving(false); }
  };
  const removeUser = async (row: UserRow) => {
    try { await deleteData(`/rbas/users/${row.id}`); await load(); message.success('User deleted'); }
    catch (error: any) { message.error(error.response?.data?.message || 'Unable to delete user because it may be used in existing records.'); }
  };
  return <>
    <div className="crud-header"><div><Title level={3}>Users</Title><Text>Create and manage users with system login access.</Text></div><Space><Button icon={<ReloadOutlined />} onClick={load}/>{canAccess(currentUser, 'rbas:users', 'create') && <Button type="primary" icon={<PlusOutlined />} onClick={() => edit()}>New User</Button>}</Space></div>
    <Table rowKey="id" loading={loading} dataSource={rows} columns={[
      { title: 'Employee', dataIndex: 'employee_name', render: (value: string) => value || <Text type="secondary">System only</Text> },
      { title: 'Name', dataIndex: 'name' }, { title: 'Designation', dataIndex: 'designation_name', render: (value: string) => value || <Text type="secondary">Not assigned</Text> },
      { title: 'City / Area', render: (_: unknown, row: UserRow) => row.city_name ? `${row.city_name}${row.area_name ? `: ${row.area_name}` : ''}` : <Text type="secondary">Not assigned</Text> },
      { title: 'CNIC', dataIndex: 'cnic' }, { title: 'Joining Date', dataIndex: 'date_of_joining', render: (value: string) => value ? value.slice(0, 10) : '' },
      { title: 'Username', dataIndex: 'username' },
      { title: 'Roles', dataIndex: 'roles', render: (value: string) => value || <Text type="secondary">Not assigned</Text> },
      { title: 'Actions', render: (_: unknown, row: UserRow) => <Space>
        {canAccess(currentUser, 'rbas:users', 'update') && <Tooltip title="Edit user"><Button aria-label="Edit user" className="warning-action" icon={<EditOutlined />} onClick={() => edit(row)} /></Tooltip>}
        {canAccess(currentUser, 'rbas:users', 'delete') && <Tooltip title="Delete user"><Popconfirm title="Delete this user?" description="Users referenced by existing records cannot be deleted." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => removeUser(row)}><Button aria-label="Delete user" danger icon={<DeleteOutlined />} /></Popconfirm></Tooltip>}
      </Space> },
    ]}/>
    <Modal title={<span className="modal-title"><FormOutlined />{editing ? 'Edit User' : 'New User'}</span>} open={open} onCancel={() => setOpen(false)} onOk={save} confirmLoading={saving} okText="Save" width={680}>
      <Form form={form} layout="vertical" className="record-form employee-form" autoComplete="off">
        <Form.Item name="employeeId" label="Employee">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Select employee (optional)" options={employeeOptions} onChange={value => void selectEmployee(value)}/>
        </Form.Item>
        <Form.Item name="name" label="Name" rules={[{required:true}]}><Input disabled={Boolean(selectedEmployeeId)}/></Form.Item>
        <Form.Item name="email" label="Email"><Input type="email" disabled={Boolean(selectedEmployeeId)}/></Form.Item>
        <Form.Item
          name="username"
          label="Username"
          validateTrigger="onBlur"
          rules={[
            { required: true, message: 'Username is required' },
            { pattern: /^[a-z0-9]+(?:_[a-z0-9]+)*$/, message: 'Use lowercase letters, numbers and underscores only' },
            { validator: async (_, value) => {
              if (!value || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value)) return;
              const query = new URLSearchParams({ username: value });
              if (editing) query.set('excludeId', String(editing.id));
              const result = await getData<{ available: boolean }>(`/rbas/users/username-availability?${query}`);
              if (!result.available) throw new Error('Username is already in use');
            } },
          ]}
        ><Input onChange={() => setUsernameManuallyEdited(true)} autoComplete="off"/></Form.Item>
        <Form.Item name="designationId" label="Designation">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Select designation" options={designations} disabled={Boolean(selectedEmployeeId)}/>
        </Form.Item>
        {systemUserEnabled && <Form.Item name="roleId" label="Role" rules={[{required:true,message:'Role is required for a system user'}]}>
          <Select showSearch optionFilterProp="label" placeholder="Select role" options={roleOptions}/>
        </Form.Item>}
        {editing && systemUserEnabled && <Alert className="employee-password-info" type="info" showIcon message="Enter a password for this system user." />}
        <Form.Item
          className="employee-password-field"
          name="password"
          label="Password"
          rules={systemUserEnabled ? [{ required: true, min: 12, message: 'Password must be at least 12 characters' }] : []}
        >
          <Input.Password disabled={!systemUserEnabled} autoComplete="new-password" addonAfter={<Button disabled={!systemUserEnabled} type="text" size="small" icon={<KeyOutlined />} onClick={generate}>Generate</Button>}/>
        </Form.Item>
      </Form>
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
  const selectGroupAll=(group:string,value:boolean)=>setPermissions(old=>{
    const next={...old};
    pages.filter(page=>page.group===group).forEach(page=>{
      next[page.key]={pageKey:page.key,canView:value,canCreate:value,canUpdate:value,canDelete:value};
    });
    return next;
  });
  const groupSelection=(group:string)=>{
    const groupPages=pages.filter(page=>page.group===group);
    const selected=groupPages.reduce((total,page)=>total+(['canView','canCreate','canUpdate','canDelete'] as const).filter(field=>Boolean(permissions[page.key]?.[field])).length,0);
    const total=groupPages.length*4;
    return {checked:total>0&&selected===total,indeterminate:selected>0&&selected<total};
  };
  const save=async()=>{if(!userId||!roleId)return message.warning('Select a user and role');setSaving(true);try{await postData('/rbas/assignments',{userId,roleId,permissions:Object.values(permissions)});message.success('Assignment saved. The user must sign in again to refresh the menu.');}finally{setSaving(false);}};
  const groupedPages=useMemo<AssignmentRow[]>(()=>{
    const groups=new Map<string,RbasPage[]>();
    pages.forEach(page=>groups.set(page.group,[...(groups.get(page.group)||[]),page]));
    return Array.from(groups.entries()).flatMap(([group,groupPages])=>[
      {key:`group:${group}`,title:group,group,rowType:'group' as const},
      ...groupPages.map(page=>({...page,rowType:'page' as const})),
    ]);
  },[pages]);
  const permissionCell=(row:AssignmentRow,content:JSX.Element)=>row.rowType==='group'?{children:null,props:{colSpan:0}}:content;
  const columns:any[]=[{title:'Page / Feature',render:(_:unknown,p:AssignmentRow)=>p.rowType==='group'?{children:<Text strong>{p.title}</Text>,props:{colSpan:5}}:<div className="permission-page-title">{p.title}</div>},...(['canView','canCreate','canUpdate','canDelete'] as const).map(field=>({title:field.replace('can',''),align:'center',render:(_:unknown,p:AssignmentRow)=>permissionCell(p,<Checkbox checked={Boolean(permissions[p.key]?.[field])} onChange={e=>change(p.key,field,e.target.checked)}/>)})),{title:'All',align:'center',render:(_:unknown,p:AssignmentRow)=>{
    if(p.rowType==='group'){
      const selection=groupSelection(p.group);
      return <Checkbox aria-label={`Select all ${p.group} permissions`} checked={selection.checked} indeterminate={selection.indeterminate} onChange={e=>selectGroupAll(p.group,e.target.checked)}/>;
    }
    return <Checkbox checked={['canView','canCreate','canUpdate','canDelete'].every(f=>Boolean((permissions[p.key] as any)?.[f]))} onChange={e=>selectAll(p.key,e.target.checked)}/>;
  }}];
  return <><div className="crud-header"><div><Title level={3}>Assignment</Title><Text>Assign a role to a user and configure the role's page and action permissions.</Text></div>{canAccess(currentUser,'rbas:assignments','update')&&<Button type="primary" icon={<SaveOutlined/>} loading={saving} onClick={save}>Save Assignment</Button>}</div>
  <Card><Space wrap size="large"><div><Text strong>User</Text><br/><Select showSearch optionFilterProp="label" style={{width:280}} placeholder="Select user" value={userId} options={users.map(u=>({value:u.id,label:`${u.name} (${u.username})`}))} onChange={selectUser}/></div><div><Text strong>Role</Text><br/><Select style={{width:240}} placeholder="Select role" value={roleId} options={roles.map(r=>({value:r.id,label:r.is_active?r.name:`${r.name} (Inactive)`}))} onChange={setRoleId}/></div></Space></Card>
  <Table className="permission-table permission-table-grouped" rowKey="key" pagination={false} dataSource={groupedPages} columns={columns} rowClassName={(row:AssignmentRow)=>row.rowType==='group'?'permission-group-row':'permission-page-row'}/></>;
}

export const RbasPageComponents: Record<string, () => JSX.Element> = { 'rbas:users': UsersPage, 'rbas:roles': RolesPage, 'rbas:assignments': AssignmentPage };
