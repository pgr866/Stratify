import axios from "axios";

const URL = process.env.NODE_ENV === "production"
	? `${import.meta.env.VITE_ENV_PATH}/api/v1/`
	: "http://localhost:8000/api/v1/"

const api = axios.create({
	baseURL: URL,
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
export const githubLogin = (code: string) => api.post("github-login/", { code });

// ** User API Calls **

// Fetch all users
export const getAllUsers = () => api.get<User[]>("user/");

// Fetch a specific user by ID
export const getUser = (id: number) => api.get<User>(`user/${id}/`);

// Update an existing user by ID
export const updateUser = (id: number, user: Partial<User>) => api.put<User>(`user/${id}/`, user);

// Delete a specific user by ID
export const deleteUser = (id: number) => api.delete(`user/${id}/`);

// Send sing-up verification to email
export const sendEmailSignup = (email: string, username: string, password: string) => api.post("send-email-signup/", { email, username, password });

// Create a new user
export const signup = (user: User, code: string) => api.post<User>("user/", { ...user, code });

// Send recover password verification to email
export const sendEmailRecoverPassword = (email: string, new_password: string) => api.post("send-email-recover-password/", { email, new_password });

// Recover password
export const recoverPassword = (email: string, new_password: string, code: string) => api.post("recover-password/", { email, new_password, code });
