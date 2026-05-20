import axios from 'axios';

// Khởi tạo instance Axios dùng chung cho toàn dự án
const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  // ĐẶC BIỆT QUAN TRỌNG: Cho phép đính kèm HttpOnly Cookie (Refresh Token) tự động
  withCredentials: true, 
});

let isRefreshing = false;
let failedQueue: any[] = [];

// Hàm xử lý hàng đợi các Request bị treo trong lúc chờ Token mới
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Lắng nghe mọi Response trả về từ Server
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // CHỐT AN TOÀN SỐ 1 & 2: Xử lý Vòng lặp vô hạn (Infinite Loop)
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh-token') // Chặn cứng: Nếu API refresh-token bị 401 thì từ bỏ
    ) {
      
      if (isRefreshing) {
        // Nếu có nhiều Request cùng vấp lỗi 401 một lúc, cho xếp hàng đợi
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      // Đánh cờ đã thử xin lại (Chống lặp)
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Tự động gọi API xin Token mới (Trình duyệt tự móc RefreshToken Cookie lên)
        const res = await axiosClient.post('/auth/refresh-token');
        const newAccessToken = res.data.token;

        // Báo cho Zustand biết để cập nhật RAM (Không cần CustomEvent nữa)
        import('../stores/useAuthStore').then(({ useAuthStore }) => {
          useAuthStore.getState().setAccessToken(newAccessToken);
        });

        // Xả hàng đợi, cho phép các Request đang bị treo tiếp tục bay đi
        processQueue(null, newAccessToken);
        
        // Gắn Token mới vào cái Request vừa bị lỗi và gửi lại
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
        
      } catch (err) {
        processQueue(err, null);
        // Refresh Token bị lỗi (hoặc hết hạn), đá bay user ra khỏi hệ thống
        import('../stores/useAuthStore').then(({ useAuthStore }) => {
          useAuthStore.getState().logout();
        });
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // Các lỗi khác (400, 404, 500) thì trả thẳng ra cho Component tự xử lý
    return Promise.reject(error);
  }
);

export default axiosClient;
