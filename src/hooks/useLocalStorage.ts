import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      console.log(`Loading from localStorage [${key}]:`, item);
      if (item === null || item === "undefined") {
        console.log(`No data found for key [${key}], using initial value:`, initialValue);
        return initialValue;
      }
      const parsed = JSON.parse(item);
      console.log(`Parsed data for key [${key}]:`, parsed);
      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      console.log(`Saving to localStorage [${key}]:`, value);
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
      console.log(`Successfully saved to localStorage [${key}]`);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}