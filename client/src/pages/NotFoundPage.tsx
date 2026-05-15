import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="max-w-lg p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">The page you are looking for does not exist or has moved.</p>
        <Link to="/dashboard" className="mt-6 inline-block">
          <Button type="button">Go to dashboard</Button>
        </Link>
      </Card>
    </div>
  );
};
