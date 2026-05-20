import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../stores/useAuthStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  const [isLogin, setIsLogin] = useState(true);
  
  // State quản lý Form
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        // GỌI API ĐĂNG NHẬP (Lưu ý: Backend nhận 'usernameOrEmail')
        const response = await axiosClient.post('/auth/login', { 
          usernameOrEmail: userName, 
          password 
        });
        
        // Nạp thẳng Access Token vào RAM (qua AuthContext)
        setAuth(response.data.token, {
          id: response.data.id,
          userName: response.data.username,
          email: response.data.email,
          displayName: response.data.displayName
        });

        // Đá sang trang bản đồ
        navigate('/map');
      } else {
        // GỌI API ĐĂNG KÝ
        const response = await axiosClient.post('/auth/register', { 
          userName, 
          email, 
          password, 
          displayName 
        });

        // Nạp Access Token vào RAM (Register tự động login luôn)
        setAuth(response.data.token, {
          id: response.data.id,
          userName: response.data.username,
          email: response.data.email,
          displayName: response.data.displayName
        });

        navigate('/map');
      }
    } catch (error: any) {
      // Đổ lỗi ra màn hình cho User đọc (Toast đỏ)
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ. Hãy thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black relative overflow-hidden">
      
      {/* Background Animated Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[128px] opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[128px] opacity-40 animate-pulse delay-1000"></div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl transition-all duration-500 ease-in-out hover:border-white/20">
          
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-slate-400 text-sm">
              {isLogin ? 'Enter your credentials to access the map' : 'Join the realtime location tracking platform'}
            </p>
          </div>

          {/* Khung hiển thị thông báo lỗi màu đỏ */}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
              <p className="text-red-400 text-sm text-center font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@example.com"
                  className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                  required={!isLogin}
                />
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Display Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">
                {isLogin ? 'Username or Email' : 'Username'}
              </label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder={isLogin ? 'hunter2 or email@example.com' : 'hunter2'}
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-5 py-4 bg-slate-950/50 border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:hover:scale-100 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transform transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : null}
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="text-sm text-slate-400 hover:text-purple-400 transition-colors duration-300"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
