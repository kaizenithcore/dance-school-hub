/**
 * Shared context provided by BillingShell and consumed by sibling shells
 * (OnboardingShell, etc.) that need to know about the active billing state.
 */
import { createContext, useContext } from "react";

export interface BillingShellState {
  showTrialLockModal: boolean;
  showTrialLoadingModal: boolean;
}

export const BillingContext = createContext<BillingShellState>({
  showTrialLockModal: false,
  showTrialLoadingModal: false,
});

export function useBillingShellState(): BillingShellState {
  return useContext(BillingContext);
}
