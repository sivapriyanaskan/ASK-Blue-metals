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

export type UserRole = 'Admin' | 'Operator' | 'Billing Staff' | 'Supervisor' | 'Accounts';

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
    isOpen: true,
    shiftNumber: 2,
    startedBy: 'Rajesh Kumar',
    startTime: '14:00:00',
  });

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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginRequest(username, password);
    setAccessToken(res.accessToken);
    setUser(toDisplayUser(res.user));
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setAccessToken(null);
    setUser(GUEST_USER);
    setIsAuthenticated(false);
  }, []);

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
