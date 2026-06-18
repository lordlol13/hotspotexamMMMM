import axios from "axios";


axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL || "";

let refreshRequest: Promise<string> | null = null;

const clearSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  delete axios.defaults.headers.common.Authorization;
};

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token && !config.url?.includes("/auth/refresh")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (
      error.response?.status !== 401 ||
      request?._retry ||
      request?.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }

    request._retry = true;
    if (!refreshRequest) {
      refreshRequest = axios
        .post("/api/v1/auth/refresh", { refresh_token: refreshToken })
        .then(({ data }) => {
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          axios.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
          return data.access_token as string;
        })
        .finally(() => {
          refreshRequest = null;
        });
    }

    try {
      const token = await refreshRequest;
      request.headers.Authorization = `Bearer ${token}`;
      return axios(request);
    } catch (refreshError) {
      clearSession();
      window.dispatchEvent(new Event("auth:expired"));
      return Promise.reject(refreshError);
    }
  },
);
