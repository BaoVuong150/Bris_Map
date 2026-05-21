import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import TopNavbar from '../components/layout/TopNavbar';
import ChatWindow from '../components/chat/ChatWindow';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useSignalRTracking } from '../hooks/useSignalRTracking';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component con để điều khiển camera của Bản đồ
const RecenterButton: React.FC<{ position: [number, number] | null }> = ({ position }) => {
  const map = useMap();
  
  const handleRecenter = () => {
    if (position) {
      // Dịch chuyển camera mượt mà (flyTo) về tọa độ hiện tại với mức zoom 16
      map.flyTo(position, 16, { animate: true, duration: 1.5 });
    }
  };

  return (
    <button 
      onClick={handleRecenter}
      className="absolute bottom-24 right-8 z-[1000] p-3 rounded-full shadow-lg bg-white hover:bg-gray-100 text-slate-700 transition-all"
      title="Quay về vị trí của tôi"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v4m0 8v4m-8-8h4m8 0h4m-4 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
      </svg>
    </button>
  );
};

const MapDashboard: React.FC = () => {
  const user = useAuthStore(state => state.user);
  
  // Kéo dữ liệu từ Đám mây Location
  const locations = useLocationStore(state => state.locations);
  const isSharingLocation = useLocationStore(state => state.isSharingLocation);
  
  // Khởi động SignalR và Tracking
  const { currentPosition, hubConnection } = useSignalRTracking();
  
  const [position, setPosition] = useState<[number, number] | null>(null);

  // Đồng bộ currentPosition từ Hook vào position của Map (Chỉ cập nhật lần đầu để Map không bị giật lùi về center liên tục)
  useEffect(() => {
    if (currentPosition && !position) {
      setPosition(currentPosition);
    } else if (!currentPosition && !position) {
      // Fallback sau 3 giây nếu không lấy được GPS
      const timer = setTimeout(() => {
        if (!position) setPosition([10.762622, 106.660172]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentPosition, position]);

  // Tạo Custom Marker bằng HTML (Dùng Tailwind CSS)
  const createAvatarMarker = (name: string, isGhost: boolean = false) => {
    const initial = name ? name.charAt(0).toUpperCase() : 'U';
    
    const ghostStyle = isGhost ? 'grayscale opacity-60' : '';
    const ghostIcon = isGhost ? '<div class="absolute -top-1 -right-1 text-sm bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">👻</div>' : '';

    const htmlString = `
      <div class="relative flex items-center justify-center w-12 h-12 transition-all duration-300 ${ghostStyle}">
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
          <span class="text-white font-bold text-lg">${initial}</span>
        </div>
        <!-- Mũi nhọn bên dưới -->
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-purple-600"></div>
        ${ghostIcon}
      </div>
    `;

    return L.divIcon({
      className: 'bg-transparent border-none transition-transform duration-[3000ms] ease-linear', // Thêm hiệu ứng Animation mượt mà
      html: htmlString,
      iconSize: [48, 48], // Kích thước khung chứa
      iconAnchor: [24, 48], // Điểm neo (ngay mũi nhọn tam giác đáy)
      popupAnchor: [0, -48], // Điểm bung Popup lên
    });
  };

  // Xóa useEffect getCurrentPosition cũ đi vì useSignalRTracking đã lo việc đó

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      <TopNavbar />

      {/* Main Map Container (Added pt-[56px] to push below Navbar) */}
      <div className="w-full h-full z-0 pt-[56px]">
        {position ? (
          <MapContainer 
            center={position} 
            zoom={14} 
            scrollWheelZoom={true}
            className="w-full h-full outline-none"
            zoomControl={false}
          >
            {/* Bản đồ CartoDB Voyager (No Labels) - Màu sắc sáng sủa, rực rỡ nhưng KHÔNG CÓ CHỮ (tránh sai lệch chủ quyền) */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
            />
            
            {/* Nút bấm Tâm ngắm để quay về vị trí hiện tại */}
            <RecenterButton position={currentPosition} />
            
            {/* Marker của chính bản thân người dùng */}
            {currentPosition && (
              <Marker 
                position={currentPosition} 
                icon={createAvatarMarker(user?.displayName || 'U', !isSharingLocation)}
              >
                <Popup className="rounded-xl overflow-hidden shadow-xl">
                  <div className="font-semibold text-slate-800">You are here! {!isSharingLocation && '(Ghost Mode)'}</div>
                </Popup>
              </Marker>
            )}

            {/* Vòng lặp vẽ TẤT CẢ bạn bè từ Đám mây Zustand lên Bản đồ */}
            {Object.values(locations).map((loc: any) => (
              <Marker 
                key={loc.userId} 
                position={[loc.lat, loc.lng]}
                icon={createAvatarMarker(loc.displayName || 'F', loc.isGhostMode)}
              >
                <Popup className="rounded-xl overflow-hidden shadow-xl">
                  <div className="font-semibold text-slate-800">{loc.displayName || 'Friend'}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {loc.isGhostMode ? '👻 Đang ẩn danh' : `Tốc độ: ${loc.speed || 0} km/h`}
                  </div>
                </Popup>
              </Marker>
            ))}

          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Cửa sổ Chat */}
      <ChatWindow hubConnection={hubConnection} />

    </div>
  );
};

export default MapDashboard;
