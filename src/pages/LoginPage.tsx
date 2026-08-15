import { Card, notification } from 'antd';
import { useState } from 'react';
import { BrandMark } from '../components/atoms/BrandMark';
import { LoginForm } from '../components/molecules/LoginForm';
import { login } from '../services/api';

interface LoginPageProps {
  onAuthenticated: () => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [notificationApi, notificationContext] = notification.useNotification();

  async function handleSubmit(values: { username: string; password: string }) {
    setLoading(true);
    try {
      await login(values.username, values.password);
      onAuthenticated();
    } catch {
      notificationApi.error({
        message: 'Login failed',
        description: 'Unable to sign in with the provided credentials.',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {notificationContext}
      <Card className="login-card">
        <BrandMark />
        <div className="login-heading">Sign in to operations console</div>
        <LoginForm loading={loading} onSubmit={handleSubmit} />
      </Card>
    </div>
  );
}
