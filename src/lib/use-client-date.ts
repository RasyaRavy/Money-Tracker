"use client";

import { useSyncExternalStore } from "react";
import { getCurrentMonthISO, getTodayISO } from "./format";

const emptySubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function useClientDateInfo() {
  const todayISO = useSyncExternalStore(
    emptySubscribe,
    () => getTodayISO(),
    () => ""
  );
  const currentMonthISO = useSyncExternalStore(
    emptySubscribe,
    () => getCurrentMonthISO(),
    () => ""
  );
  return { todayISO, currentMonthISO };
}
