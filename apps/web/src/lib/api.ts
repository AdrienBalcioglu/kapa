import { AppConfig, BuildJob, API_ROUTES } from '@app-builder/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${res.status}`);
  }

  return res.json();
}

export interface CreateAppInput {
  appName: string;
  bundleId: string;
  url: string;
  splashColor: string;
  iconBase64?: string;
  pushNotifications: boolean;
  sessionMode: 'cookie' | 'jwt' | 'none';
  platforms: ('ios' | 'android')[];
}

export async function createApp(data: CreateAppInput, token?: string): Promise<AppConfig> {
  return fetchAPI<AppConfig>(API_ROUTES.CREATE_APP, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);
}

export async function getApp(id: string, token?: string): Promise<AppConfig> {
  return fetchAPI<AppConfig>(API_ROUTES.GET_APP.replace(':id', id), undefined, token);
}

export async function listApps(token?: string): Promise<AppConfig[]> {
  return fetchAPI<AppConfig[]>(API_ROUTES.LIST_APPS, undefined, token);
}

export async function startBuild(appConfigId: string, platform: 'ios' | 'android', token?: string): Promise<BuildJob> {
  return fetchAPI<BuildJob>(API_ROUTES.START_BUILD, {
    method: 'POST',
    body: JSON.stringify({ appConfigId, platform }),
  }, token);
}

export async function getBuild(id: string, token?: string): Promise<BuildJob> {
  return fetchAPI<BuildJob>(API_ROUTES.GET_BUILD.replace(':id', id), undefined, token);
}
