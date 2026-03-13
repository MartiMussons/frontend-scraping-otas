import { createContext, useContext, useMemo, useState } from "react";

interface TourSelectionContextValue {
  selectedTourCode: string | null;
  setSelectedTourCode: (tourCode: string) => void;
}

const TourSelectionContext = createContext<TourSelectionContextValue | undefined>(undefined);

interface TourSelectionProviderProps {
  children: React.ReactNode;
}

export function TourSelectionProvider({ children }: TourSelectionProviderProps) {
  const [selectedTourCode, setSelectedTourCode] = useState<string | null>(null);

  const value = useMemo<TourSelectionContextValue>(
    () => ({
      selectedTourCode,
      setSelectedTourCode,
    }),
    [selectedTourCode],
  );

  return <TourSelectionContext.Provider value={value}>{children}</TourSelectionContext.Provider>;
}

export function useTourSelection() {
  const context = useContext(TourSelectionContext);

  if (!context) {
    throw new Error("useTourSelection must be used within TourSelectionProvider");
  }

  return context;
}
