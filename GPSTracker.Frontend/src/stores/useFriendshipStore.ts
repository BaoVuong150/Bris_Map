import { create } from 'zustand';

interface FriendshipState {
  pendingRequestsCount: number;
  lastUpdateTimestamp: number;
  setPendingRequestsCount: (count: number) => void;
  incrementPendingRequests: () => void;
  decrementPendingRequests: () => void;
  triggerUpdate: () => void;
}

export const useFriendshipStore = create<FriendshipState>((set) => ({
  pendingRequestsCount: 0,
  lastUpdateTimestamp: Date.now(),
  setPendingRequestsCount: (count) => set({ pendingRequestsCount: count }),
  incrementPendingRequests: () => set((state) => ({ 
    pendingRequestsCount: state.pendingRequestsCount + 1,
    lastUpdateTimestamp: Date.now()
  })),
  decrementPendingRequests: () => set((state) => ({ 
    pendingRequestsCount: Math.max(0, state.pendingRequestsCount - 1),
    lastUpdateTimestamp: Date.now()
  })),
  triggerUpdate: () => set({ lastUpdateTimestamp: Date.now() }),
}));
