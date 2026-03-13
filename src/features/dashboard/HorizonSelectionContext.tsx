import { createContext, useContext, useMemo, useState } from "react";

import type { HorizonOption } from "@/features/dashboard/constants";

interface HorizonSelectionContextValue {
  selectedHorizon: HorizonOption;
  setSelectedHorizon: (horizon: HorizonOption) => void;
}

const HorizonSelectionContext = createContext<HorizonSelectionContextValue | undefined>(undefined);

interface HorizonSelectionProviderProps {
  children: React.ReactNode;
}

export function HorizonSelectionProvider({ children }: HorizonSelectionProviderProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<HorizonOption>(0);

  const value = useMemo<HorizonSelectionContextValue>(
    () => ({
      selectedHorizon,
      setSelectedHorizon,
    }),
    [selectedHorizon],
  );

  return <HorizonSelectionContext.Provider value={value}>{children}</HorizonSelectionContext.Provider>;
}

export function useHorizonSelection() {
  const context = useContext(HorizonSelectionContext);

  if (!context) {
    throw new Error("useHorizonSelection must be used within HorizonSelectionProvider");
  }

  return context;
}
