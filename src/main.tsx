import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AppErrorFallback } from "@/components/AppErrorFallback";
import { HorizonSelectionProvider } from "@/features/dashboard/HorizonSelectionContext";
import { TourSelectionProvider } from "@/features/tours/TourSelectionContext";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <TourSelectionProvider>
            <HorizonSelectionProvider>
              <App />
            </HorizonSelectionProvider>
          </TourSelectionProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
