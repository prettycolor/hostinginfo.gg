// API client for communicating with vite-plugin-api endpoints

const API_BASE = "/api";

async function extractErrorMessage(response: Response): Promise<string> {
  let errorMessage = `${response.status} ${response.statusText}`;

  try {
    const responseText = await response.text();
    if (!responseText) return errorMessage;

    try {
      const errorData = JSON.parse(responseText);
      if (errorData.error) {
        errorMessage = `${errorMessage}: ${errorData.error}`;
      }
      if (errorData.message) {
        errorMessage = `${errorMessage} - ${errorData.message}`;
      }
      return errorMessage;
    } catch {
      const trimmed = responseText.trim();
      if (trimmed) {
        errorMessage = `${errorMessage}: ${trimmed.slice(0, 200)}`;
      }
      return errorMessage;
    }
  } catch {
    return errorMessage;
  }
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error("Health check failed");
  }
  return response.json();
}

/**
 * Generic API client helper
 */
export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    // Get authentication token from localStorage
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      console.error(`[API Client] GET ${endpoint} failed:`, errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    // Get authentication token from localStorage
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      console.error(`[API Client] POST ${endpoint} failed:`, errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    // Get authentication token from localStorage
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      console.error(`[API Client] PUT ${endpoint} failed:`, errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      console.error(`[API Client] PATCH ${endpoint} failed:`, errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    // Get authentication token from localStorage
    const token = localStorage.getItem("auth_token");

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response);
      console.error(`[API Client] DELETE ${endpoint} failed:`, errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  },
};
