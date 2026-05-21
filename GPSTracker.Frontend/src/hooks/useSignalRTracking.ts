import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../stores/useAuthStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useChatStore } from '../stores/useChatStore';
import { useFriendshipStore } from '../stores/useFriendshipStore';
import { useMessageStore } from '../stores/useMessageStore';
import axiosClient from '../api/axiosClient';

export const useSignalRTracking = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.accessToken);
  const isSharingLocation = useLocationStore(state => state.isSharingLocation);
  const updateLocation = useLocationStore(state => state.updateLocation);
  const setInitialLocations = useLocationStore(state => state.setInitialLocations);
  const updateGhostMode = useLocationStore(state => state.updateGhostMode);
  const setConnectionStatus = useLocationStore(state => state.setConnectionStatus);
  const addMessage = useChatStore(state => state.addMessage);
  const incrementPendingRequests = useFriendshipStore(state => state.incrementPendingRequests);
  const setPendingRequestsCount = useFriendshipStore(state => state.setPendingRequestsCount);
  const triggerUpdate = useFriendshipStore(state => state.triggerUpdate);
  const setTotalUnreadCount = useMessageStore(state => state.setTotalUnreadCount);

  const hubConnectionRef = useRef<signalR.HubConnection | null>(null);
  const [hubConnection, setHubConnection] = useState<signalR.HubConnection | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);

  // Khởi tạo SignalR Connection
  useEffect(() => {
    if (!token || !user) return;

    // Nếu người dùng tắt chia sẻ, không cần duy trì kết nối SignalR (hoặc có thể duy trì để nhận vị trí bạn bè, tùy thiết kế)
    // Ở đây ta giữ kết nối để XEM vị trí bạn bè, nhưng chỉ GỬI vị trí của mình khi isSharingLocation = true.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(import.meta.env.VITE_HUB_URL || 'http://localhost:5000/hubs/bris', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Tự động kết nối lại nếu rớt mạng
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hubConnectionRef.current = connection;
    setHubConnection(connection);

    connection.onreconnecting(() => setConnectionStatus('reconnecting'));
    connection.onreconnected(() => setConnectionStatus('connected'));
    connection.onclose(() => setConnectionStatus('disconnected'));

    // Lắng nghe tín hiệu tọa độ từ bạn bè
    connection.on('ReceiveLocationUpdate', (data: any) => {
      // console.log("Received location from:", data.userId, data);
      updateLocation({
        userId: data.userId,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        heading: data.heading,
        timestamp: data.timestamp
      });
    });

    // Lắng nghe tín hiệu Ghost Mode từ bạn bè
    connection.on('ReceiveGhostModeToggle', (data: any) => {
      // console.log("Ghost mode toggled:", data.userId, data.isGhostMode);
      updateGhostMode(data.userId, data.isGhostMode);
    });

    // Lắng nghe tin nhắn từ bạn bè
    connection.on('ReceiveMessage', (message: any) => {
      addMessage(message);
    });

    connection.on('UpdateUnreadCount', (count: number) => {
      setTotalUnreadCount(count);
    });

    // Lắng nghe thông báo kết bạn
    connection.on('ReceiveNotification', (notification: any) => {
      if (notification.type === 'FriendRequest') {
        incrementPendingRequests();
      } else if (notification.type === 'FriendRemoved' || notification.type === 'FriendAccepted' || notification.type === 'FriendRejected' || notification.type === 'FriendRequestCanceled') {
        triggerUpdate();
      }
    });

    const fetchInitialData = async () => {
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          axiosClient.get('/Tracking/friends'),
          axiosClient.get('/Friendships/pending')
        ]);
        if (friendsRes.data && Array.isArray(friendsRes.data)) {
          setInitialLocations(friendsRes.data);
        }
        if (requestsRes.data && Array.isArray(requestsRes.data)) {
          setPendingRequestsCount(requestsRes.data.length);
        }
      } catch (err) {
        console.error('Lỗi khi fetch dữ liệu ban đầu:', err);
      }
    };

    const startConnection = async () => {
      try {
        await connection.start();
        // Chỉ cập nhật trạng thái nếu connection này vẫn là connection hiện tại của Component
        if (hubConnectionRef.current === connection) {
          setConnectionStatus('connected');
          // Tải dữ liệu ban đầu
          fetchInitialData();
        }
      } catch (err: any) {
        // Bỏ qua lỗi giả do React Strict Mode (Tự động mount/unmount 2 lần làm abort kết nối đầu tiên)
        if (err.message?.includes('stopped during negotiation')) {
          return; 
        }
        console.error('SignalR Connection Error: ', err);
        if (hubConnectionRef.current === connection) {
          setConnectionStatus('disconnected');
        }
      }
    };

    startConnection();

    return () => {
      connection.stop();
      hubConnectionRef.current = null;
    };
  }, [token, user, setConnectionStatus, updateLocation, updateGhostMode, setInitialLocations]);

  // Thông báo cho Backend mỗi khi người dùng Bật/Tắt chia sẻ vị trí
  useEffect(() => {
    if (hubConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
      hubConnectionRef.current.invoke('ToggleGhostMode', !isSharingLocation)
        .catch(err => console.error('Error toggling ghost mode:', err));
    }
  }, [isSharingLocation]);

  // Quản lý Geolocation WatchPosition
  useEffect(() => {
    if (!isSharingLocation || !user) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const handlePosition = (pos: GeolocationPosition) => {
      const { latitude, longitude, speed, heading } = pos.coords;
      setCurrentPosition([latitude, longitude]);
      
      // Nếu SignalR đang mở, gửi tọa độ lên Server
      if (hubConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
        hubConnectionRef.current.invoke('UpdateLocation', latitude, longitude, speed || 0, heading || 0)
          .catch(err => console.error('Error sending location:', err));
      }
    };

    const handleError = (err: GeolocationPositionError) => {
      console.error('Geolocation error:', err);
    };

    // Theo dõi liên tục với độ chính xác cao
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition, 
      handleError, 
      {
        enableHighAccuracy: true,
        maximumAge: 0
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isSharingLocation, user]);

  return { 
    connectionStatus: useLocationStore(state => state.connectionStatus),
    currentPosition,
    hubConnection
  };
};
