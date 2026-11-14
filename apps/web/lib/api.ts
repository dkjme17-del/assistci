const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

const TOKEN_KEY = 'assistci_token';
const REFRESH_TOKEN_KEY = 'assistci_refresh_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function setAuthSession(token: string, refreshToken?: string | null): void {
  setAuthToken(token);
  if (refreshToken) setRefreshToken(refreshToken);
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('assistci_user');
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('assistci_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('assistci_user', JSON.stringify(user));
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          removeAuthToken();
          return null;
        }

        const data = await response.json().catch(() => null);
        if (!data?.token || !data?.refresh_token) {
          removeAuthToken();
          return null;
        }

        setAuthToken(data.token);
        setRefreshToken(data.refresh_token);
        return data.token as string;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const buildRequest = (token: string | null) => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetch(`${API_URL}${endpoint}`, { ...options, headers });
  };

  let response = await buildRequest(getAuthToken());

  if (response.status === 401 && !endpoint.startsWith('/auth/refresh') && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await buildRequest(newToken);
    }
  }

  return response;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await authenticatedFetch(endpoint, { ...options, headers });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Une erreur est survenue');
  }

  return data;
}

export async function postApiForm(endpoint: string, formData: FormData) {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Une erreur est survenue');
  }

  return data;
}

export async function downloadApiFile(endpoint: string, filename: string): Promise<void> {
  const response = await authenticatedFetch(endpoint);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || data?.error || 'Impossible de récupérer le document');
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
