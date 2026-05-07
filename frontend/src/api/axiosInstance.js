import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // send HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // This is the fix: tell axios to include cookies
    config.withCredentials = true;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosInstance;
