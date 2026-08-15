import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';

interface LoginFormProps {
  loading: boolean;
  onSubmit: (values: { username: string; password: string }) => void;
}

export function LoginForm({ loading, onSubmit }: LoginFormProps) {
  return (
    <Form layout="vertical" onFinish={onSubmit} requiredMark={false}>
      <Form.Item
        name="username"
        label="Username"
        rules={[{ required: true, message: 'Username is required' }]}
      >
        <Input prefix={<UserOutlined />} size="large" autoComplete="username" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true }]}>
        <Input.Password prefix={<LockOutlined />} size="large" />
      </Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        Sign in
      </Button>
    </Form>
  );
}
