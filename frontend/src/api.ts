import axios from "axios";

// Define the base API URL based on the environment (production or development)
const URL = process.env.NODE_ENV === "production"
	? `${import.meta.env.VITE_ENV_PATH}/api/v1/`
	: "http://localhost:8000/api/v1/"

const api = axios.create({
	baseURL: URL,
	withCredentials: true,
});

// Interceptor to handle errors globally
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

// User Interface
export interface User {
  username: string;
  email: string;
	dark_theme: boolean;
  timezone: string;
	password?: string;
}

// API Keys Interface
export interface ApiKey {
  exchange: string;
  api_key?: string;
  secret?: string;
	password?: string;
	uid?: string;
}

// ** User Management API Calls **

// Get Authenticated User
export const getAuthUser = () => api.get<User>("user/me/");

// Update Authenticated User
export const updateUser = (user: Partial<User>) => api.put<User>("user/me/", user);

// Toggle Theme
export const toggleTheme = () => api.post("toggle-theme/");

// Delete Authenticated User
export const deleteUser = () => api.delete("user/me/");

// Send sing-up verification to email
export const sendEmailSignup = (email: string, username: string, password: string) => api.post("send-email-signup/", { email, username, password });

// Create a new user
export const signup = (user: User, code: string) => api.post<User>("signup/", { ...user, code });

// Send recover password verification to email
export const sendEmailRecoverPassword = (email: string, new_password: string) => api.post("send-email-recover-password/", { email, new_password });

// Recover password
export const recoverPassword = (email: string, new_password: string, code: string) => api.post("recover-password/", { email, new_password, code });


// ** Authentication API Calls **

// Login
export const login = (username: string, password: string) => api.post("login/", { username, password });

// Logout
export const logout = () => api.post("logout/");

// Google Login
export const googleLogin = (token: string) => api.post("google-login/", {}, { headers: { Authorization: `Bearer ${token}` } });

// GitHub Login
export const githubLogin = (code: string) => api.post("github-login/", { code });


// ** API Keys Management **

// Get API Keys Exchanges
export const getApiKeysExchanges = () => api.get<string[]>("apiKey/");

// Create or Update API Keys
export const createUpdateApiKeys = (api_key: ApiKey) => api.post("apiKey/", api_key);

// Delete API Keys
export const deleteApiKeys = (exchange: string) => api.delete(`apiKey/${exchange}/`);


// ** Exchange Data **

// Get all ccxt exchanges
export const getAllExchanges = () => api.get("exchanges/");
