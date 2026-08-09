import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [state, setState] = useState({
    isOnline: true,
    isInternetReachable: true
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((nextState) => {
      const reachable = nextState.isInternetReachable;
      setState({
        isOnline: Boolean(nextState.isConnected),
        isInternetReachable: reachable === null ? Boolean(nextState.isConnected) : reachable
      });
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => state, [state]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const value = useContext(NetworkContext);
  if (!value) throw new Error('useNetwork must be used inside NetworkProvider');
  return value;
}

export default NetworkProvider;

const styles = StyleSheet.create({});
