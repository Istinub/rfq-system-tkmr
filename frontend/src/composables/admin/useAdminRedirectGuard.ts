import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAdminAuthStore } from '../../stores/admin/adminAuth';
import { getPinia } from '../../stores';

export const useAdminRedirectGuard = () => {
  return (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    const auth = useAdminAuthStore(getPinia());
    const isAuthed = auth.isAuthenticated;
    const requiresAdmin = to.matched.some((record) => Boolean(record.meta?.requiresAdmin));

    if (to.name === 'admin-login' && isAuthed) {
      return next({ name: 'admin-dashboard' });
    }

    if (requiresAdmin && !isAuthed) {
      return next({ name: 'admin-login', query: { next: to.fullPath } });
    }

    return next();
  };
};
