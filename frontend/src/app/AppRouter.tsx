import { AdminApp } from '../apps/admin/AdminApp';
import { PublicApp } from '../apps/public/PublicApp';

function isAdminRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname === 'admin.bookedai.au' || pathname.startsWith('/admin');
}

export function AppRouter() {
  return isAdminRuntime() ? <AdminApp /> : <PublicApp />;
}
