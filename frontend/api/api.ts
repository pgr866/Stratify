import axios from "axios";

const URL = import.meta.env.MODE === "production"
  ? import.meta.env.VITE_BACKEND_URL
  : "http://localhost:8000";

const api = axios.create({
  baseURL: `${URL}/stratify/api/v1/`,
  withCredentials: true,
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error:", error.response.data);
      if (error.response.status === 401) {
        window.location.href = "/login";
      }
    } else {
      console.error("Network Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// User definition
export interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
}

// ** Check Authentication Call **
export const checkAuth = () => api.get("check-auth/");

// ** Login API Call **
export const login = (username: string, password: string) => api.post("login/", { username, password });

// ** Logout API Call **
export const logout = () => api.post("logout/");

// ** Google Login API Call **
export const googleLogin = (token: string) => api.post("google-login/", {}, { headers: { Authorization: `Bearer ${token}` } });

// ** GitHub Login API Call **
export const githubLogin = (code: string, state: string) => { return api.post("github-login/", { code, state }); };

// ** User API Calls **

// Fetch all users
export const getAllUsers = () => api.get<User[]>("user/");

// Fetch a specific user by ID
export const getUser = (id: number) => api.get<User>(`user/${id}/`);

// Create a new user
export const createUser = (user: User) => api.post<User>("user/", user);

// Update an existing user by ID
export const updateUser = (id: number, user: Partial<User>) => api.put<User>(`user/${id}/`, user);

// Delete a specific user by ID
export const deleteUser = (id: number) => api.delete(`user/${id}/`);
