import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api",
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
