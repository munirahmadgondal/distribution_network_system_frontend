import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';

interface LoginFormProps {
  loading: boolean;
  onSubmit: (values: { email: string; password: string }) => void;
}

export function LoginForm({ loading, onSubmit }: LoginFormProps) {
  return (
    <Form layout="vertical" onFinish={onSubmit} requiredMark={false}>
      <Form.Item
        name="email"
        label="Email"
        rules={[{ required: true, type: 'email' }]}
      >
        <Input prefix={<MailOutlined />} size="large" />
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
