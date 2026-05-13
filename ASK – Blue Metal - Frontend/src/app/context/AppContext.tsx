import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type BackendUser,
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
  setAccessToken,
  onAuthExpired,
} from '../utils/api';
import { buildDisplayName, pickPrimaryRole } from '../utils/roles';
import { shiftApi } from '../services/operationsApi';

export type UserRole = 'Super Admin' | 'Admin' | 'Operator' | 'Billing Staff' | 'Supervisor' | 'Accounts' | 'Invoice Billing';

export interface User {
  /** Display name. */
  name: string;
  /** Highest-priority display role (kept for backward compatibility). */
  role: UserRole;
  /** Backend username. */
  username: string;
  /** Stable backend id (cuid). Empty string for the unauthenticated guest. */
  id?: string;
  /** Raw backend role codes. Use these when checking RBAC, not `role`. */
  roleCodes?: string[];
  /** Resolved permission codes from the backend. */
  permissions?: string[];
}

export interface ShiftStatus {
  isOpen: boolean;
  shiftNumber: number;
  startedBy: string;
  startTime: string;
}

export interface HardwareDevice {
  name: string;
  type: 'weighbridge' | 'camera_front' | 'camera_top' | 'barrier' | 'printer';
  status: 'online' | 'offline' | 'warning';
  message?: string;
}

interface AppContextType {
  user: User;
  setUser: (user: User) => void;
  /** True until the initial /auth/refresh + /auth/me bootstrap completes. */
  isAuthLoading: boolean;
  /** True when a backend session is active. */
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** RBAC helper. */
  hasPermission: (code: string) => boolean;
  shiftStatus: ShiftStatus;
  setShiftStatus: (status: ShiftStatus) => void;
  refreshShiftStatus: () => Promise<void>;
  /** True once the initial shift status fetch has completed. */
  isShiftLoaded: boolean;
  hardwareDevices: HardwareDevice[];
  setHardwareDevices: (devices: HardwareDevice[]) => void;
  currentWeight: number;
  setCurrentWeight: (weight: number) => void;
  isWeightStable: boolean;
  setIsWeightStable: (stable: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GUEST_USER: User = {
  id: '',
  name: 'Guest User',
  role: 'Admin',
  username: 'guest',
  roleCodes: [],
  permissions: [],
};

function toDisplayUser(b: BackendUser): User {
  return {
    id: b.id,
    name: buildDisplayName(b.firstName, b.lastName, b.username),
    role: pickPrimaryRole(b.roles),
    username: b.username,
    roleCodes: b.roles,
    permissions: b.permissions,
  };
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(GUEST_USER);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [shiftStatus, setShiftStatus] = useState<ShiftStatus>({
    isOpen: false,
    shiftNumber: 0,
    startedBy: '',
    startTime: '',
  });
  const [isShiftLoaded, setIsShiftLoaded] = useState(false);

  // Sync the local shift indicator with the API. Called on bootstrap and
  // after login so the sidebar pill and Shift Open/Close screens always
  // reflect the actual database state (the previous hardcoded default
  // caused the Shift Open screen to think a shift was active when none
  // existed in the DB).
  const refreshShiftStatus = useCallback(async () => {
    try {
      // Per-user shift: each operator has their own active shift. The
      // `mine=true` query restricts the result to shifts opened by the
      // currently authenticated user.
      const res = await shiftApi.list({ status: 'OPEN', mine: true, pageSize: 1 });
      const open = res.items?.[0];
      if (open) {
        const num = Number(String(open.shiftNo).replace(/[^0-9]/g, '')) || 0;
        setShiftStatus({
          isOpen: true,
          shiftNumber: num,
          startedBy: open.openedBySnapshot || '',
          startTime: open.openedAt ? new Date(open.openedAt).toLocaleTimeString() : '',
        });
      } else {
        setShiftStatus({ isOpen: false, shiftNumber: 0, startedBy: '', startTime: '' });
      }
    } catch {
      // Permission denied / network error — leave the previous state intact.
    } finally {
      setIsShiftLoaded(true);
    }
  }, []);

  const [hardwareDevices, setHardwareDevices] = useState<HardwareDevice[]>([
    { name: 'Weighbridge 1', type: 'weighbridge', status: 'online' },
    { name: 'Front Camera', type: 'camera_front', status: 'online' },
    { name: 'Top Camera', type: 'camera_top', status: 'online' },
    { name: 'Boom Barrier', type: 'barrier', status: 'online' },
    { name: 'Token Printer', type: 'printer', status: 'online' },
  ]);

  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [isWeightStable, setIsWeightStable] = useState<boolean>(false);

  const handleSessionExpired = useCallback(() => {
    setAccessToken(null);
    setUser(GUEST_USER);
    setIsAuthenticated(false);
  }, []);

  // Subscribe the API client's 401 handler to the context once.
  useEffect(() => {
    onAuthExpired(handleSessionExpired);
  }, [handleSessionExpired]);

  // Bootstrap session: try a silent refresh (cookie may still be valid),
  // then fetch /auth/me to hydrate roles + permissions.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refreshed = await refreshRequest();
      if (cancelled) return;
      if (!refreshed) {
        setIsAuthLoading(false);
        return;
      }
      setAccessToken(refreshed.accessToken);
      const me = (await meRequest()) ?? refreshed.user;
      if (cancelled) return;
      setUser(toDisplayUser(me));
      setIsAuthenticated(true);
      setIsAuthLoading(false);
      void refreshShiftStatus();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshShiftStatus]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginRequest(username, password);
    setAccessToken(res.accessToken);
    setUser(toDisplayUser(res.user));
    setIsAuthenticated(true);
    void refreshShiftStatus();
  }, [refreshShiftStatus]);

  const logout = useCallback(async () => {
    await logoutRequest();
    setAccessToken(null);
    setUser(GUEST_USER);
    setIsAuthenticated(false);
    setIsShiftLoaded(false);
    setShiftStatus({ isOpen: false, shiftNumber: 0, startedBy: '', startTime: '' });
  }, []);

  // Poll shift status every 60s while authenticated. If the user had an
  // open shift and it has been closed (e.g. by the midnight cron), force
  // a logout. This also keeps the sidebar in sync without a refresh.
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = window.setInterval(() => {
      void (async () => {
        const wasOpen = shiftStatus.isOpen;
        try {
          const res = await shiftApi.list({ status: 'OPEN', mine: true, pageSize: 1 });
          const open = res.items?.[0];
          if (open) {
            const num = Number(String(open.shiftNo).replace(/[^0-9]/g, '')) || 0;
            setShiftStatus({
              isOpen: true,
              shiftNumber: num,
              startedBy: open.openedBySnapshot || '',
              startTime: open.openedAt ? new Date(open.openedAt).toLocaleTimeString() : '',
            });
          } else {
            setShiftStatus({ isOpen: false, shiftNumber: 0, startedBy: '', startTime: '' });
            // If we previously had an open shift and it just closed (and
            // the role normally requires a shift), assume the system
            // auto-closed it at midnight and log the user out.
            const requiresShift = !['Admin', 'Accounts'].includes(user.role);
            if (wasOpen && requiresShift) {
              try {
                alert('Your shift has been closed by the system (end of day). You will be logged out.');
              } catch {
                /* noop */
              }
              await logout();
            }
          }
        } catch {
          /* ignore transient errors */
        }
      })();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, shiftStatus.isOpen, user.role, logout]);

  const hasPermission = useCallback(
    (code: string) => Boolean(user.permissions?.includes(code)),
    [user.permissions],
  );

  const value = useMemo<AppContextType>(
    () => ({
      user,
      setUser,
      isAuthLoading,
      isAuthenticated,
      login,
      logout,
      hasPermission,
      shiftStatus,
      setShiftStatus,
      refreshShiftStatus,
      isShiftLoaded,
      hardwareDevices,
      setHardwareDevices,
      currentWeight,
      setCurrentWeight,
      isWeightStable,
      setIsWeightStable,
    }),
    [
      user,
      isAuthLoading,
      isAuthenticated,
      login,
      logout,
      hasPermission,
      shiftStatus,
      isShiftLoaded,
      hardwareDevices,
      currentWeight,
      isWeightStable,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
