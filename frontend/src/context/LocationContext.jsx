import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LOCATION } from '../data/constants.js';
import LOCATIONS from '../data/locations.js';
import { getLocations as fetchLocationsApi } from '../services/weather.service.js';
import { LocationContext } from './location-context.js';

const STORAGE_KEY = 'cloudburst.selectedTown';

export function LocationProvider({ children }) {
  const [locationsList, setLocationsList] = useState(LOCATIONS);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Initialize selected location from localStorage or default to Dehradun
  const [location, setLocationState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        if (stored.startsWith('{')) {
          return JSON.parse(stored);
        }
        const found = LOCATIONS.find((l) => l.name === stored);
        if (found) return found;
      }
      return DEFAULT_LOCATION;
    } catch {
      return DEFAULT_LOCATION;
    }
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchLocationsApi(controller.signal)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((apiLoc) => {
            const staticMatch = LOCATIONS.find((l) => l.name.toLowerCase() === apiLoc.name.toLowerCase());
            return {
              ...staticMatch,
              ...apiLoc,
              id: apiLoc.name.toLowerCase().replace(/\s+/g, '-'),
            };
          });
          LOCATIONS.forEach((staticLoc) => {
            if (!merged.some((m) => m.name.toLowerCase() === staticLoc.name.toLowerCase())) {
              merged.push(staticLoc);
            }
          });
          setLocationsList(merged);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLocationsError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingLocations(false);
        }
      });

    return () => controller.abort();
  }, [reloadTrigger]);

  const retryLocations = useCallback(() => {
    setLoadingLocations(true);
    setLocationsError(null);
    setReloadTrigger((v) => v + 1);
  }, []);

  const setLocation = useCallback((loc) => {
    setLocationState(loc);
    try {
      localStorage.setItem(STORAGE_KEY, loc.name);
      localStorage.setItem('cps-location', JSON.stringify(loc));
    } catch {
      /* localStorage blocked */
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        locationsList,
        loadingLocations,
        locationsError,
        retryLocations,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
