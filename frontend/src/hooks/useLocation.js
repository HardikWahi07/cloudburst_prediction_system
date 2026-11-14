import { useContext } from 'react';
import { LocationContext } from '../context/location-context.js';

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (ctx === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return ctx;
}
