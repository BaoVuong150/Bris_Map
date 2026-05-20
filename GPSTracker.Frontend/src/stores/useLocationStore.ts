import { create } from 'zustand';

// Định dạng dữ liệu của 1 tọa độ gửi về từ Server
export interface UserLocation {
  userId: string;
  lat: number;
  lng: number;
  timestamp: string;
  heading?: number; // Hướng di chuyển (0-360 độ) để xoay icon cái xe
  speed?: number;   // Tốc độ di chuyển
  isGhostMode?: boolean;
}

// Cấu trúc của "Đám mây" Zustand
interface LocationState {
  // Dictionary lưu trữ tọa độ của TẤT CẢ bạn bè
  // Dạng: { "user_1": { lat: 10, lng: 106 }, "user_2": { lat: 11, lng: 107 } }
  locations: Record<string, UserLocation>;
  
  // Trạng thái kết nối SignalR (Xanh/Đỏ)
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
  
  // Công tắc Quyền riêng tư: Có đang chia sẻ vị trí của mình không?
  isSharingLocation: boolean;
  
  // Camera đang bám theo ai? (null = tắt)
  focusedUserId: string | null;

  // Khởi tạo danh sách toạ độ ban đầu khi vừa mở App
  setInitialLocations: (locations: UserLocation[]) => void;

  // Cập nhật 1 tọa độ duy nhất (Khi SignalR bắn data xuống)
  updateLocation: (location: UserLocation) => void;

  // Cập nhật trạng thái Ghost Mode của bạn bè
  updateGhostMode: (userId: string, isGhostMode: boolean) => void;
  
  // Set trạng thái kết nối
  setConnectionStatus: (status: 'connected' | 'reconnecting' | 'disconnected') => void;
  
  // Bật/tắt công tắc chia sẻ vị trí
  toggleSharing: () => void;
  
  // Đặt camera bám theo một người
  setFocusedUser: (userId: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  locations: {},
  connectionStatus: 'disconnected',
  isSharingLocation: true,
  focusedUserId: null,

  setInitialLocations: (locs) => set((state) => {
    const newLocations = { ...state.locations };
    locs.forEach(loc => {
      newLocations[loc.userId] = loc;
    });
    return { locations: newLocations };
  }),

  updateLocation: (newLoc) => set((state) => ({
    // Cập nhật tọa độ mới, ghi đè lên tọa độ cũ của người đó
    locations: {
      ...state.locations,
      [newLoc.userId]: {
        ...newLoc,
        // Giữ lại trạng thái Ghost Mode hiện tại nếu Backend không gửi kèm trong packet UpdateLocation
        isGhostMode: state.locations[newLoc.userId]?.isGhostMode ?? false
      }
    }
  })),

  updateGhostMode: (userId, isGhostMode) => set((state) => {
    const existingLoc = state.locations[userId];
    if (!existingLoc) return state; // Nếu chưa có vị trí thì bỏ qua
    return {
      locations: {
        ...state.locations,
        [userId]: { ...existingLoc, isGhostMode }
      }
    };
  }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  toggleSharing: () => set((state) => ({ isSharingLocation: !state.isSharingLocation })),
  
  setFocusedUser: (userId) => set({ focusedUserId: userId })
}));
