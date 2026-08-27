import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ConnectivityState } from '@crm/types';

interface NetworkStatusContextValue {
  status: ConnectivityState;
  isOnline: boolean;
  setManualStatus?: (status: ConnectivityState) => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue>({
  status: 'connected',
  isOnline: true,
});

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectivityState>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected'
  );

  useEffect(() => {
    const handleOnline = () => {
      setStatus('syncing');
      const timer = setTimeout(() => {
        setStatus('connected');
      }, 1500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOnline = status === 'connected' || status === 'syncing' || status === 'sync_complete';

  return (
    <NetworkStatusContext.Provider value={{ status, isOnline, setManualStatus: setStatus }}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatusContextValue {
  return useContext(NetworkStatusContext);
}
