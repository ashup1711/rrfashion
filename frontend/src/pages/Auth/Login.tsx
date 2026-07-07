import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useGuestStore } from '../../store/guestStore';
import { ROUTES } from '../../utils/constants';
import { validateEmail, validatePassword } from '../../utils/validators';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, isLoading, error } = useAuth();
  const { guestSessionId, clearGuestSession } = useGuestStore();

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) newErrors.email = emailCheck.error;

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) newErrors.password = passwordCheck.error;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const sessionId = guestSessionId || undefined;
      login({ email, password, guestSessionId: sessionId });
      if (sessionId) clearGuestSession();
    }
  };

  return (
    <div className="container-page py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to your RR FASHION account
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                {error instanceof Error ? error.message : 'Login failed. Please try again.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              required
              autoComplete="current-password"
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              to={ROUTES.REGISTER}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Register
            </Link>
          </p>

          <p className="mt-2 text-center text-xs text-gray-500">
            Admin?{' '}
            <Link
              to={ROUTES.ADMIN_LOGIN}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign in here
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
