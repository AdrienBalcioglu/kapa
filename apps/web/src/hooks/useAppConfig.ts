'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AppConfig } from '@app-builder/shared';
import { getApp, listApps } from '@/lib/api';

export function useAppConfig(appId: string) {
  const { getToken } = useAuth();
  const [app, setApp] = useState<AppConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApp() {
      try {
        const token = await getToken();
        const data = await getApp(appId, token ?? undefined);
        setApp(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch app');
      } finally {
        setIsLoading(false);
      }
    }

    fetchApp();
  }, [appId, getToken]);

  return { app, error, isLoading };
}

export function useAppList() {
  const { getToken } = useAuth();
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApps() {
      try {
        const token = await getToken();
        const data = await listApps(token ?? undefined);
        setApps(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch apps');
      } finally {
        setIsLoading(false);
      }
    }

    fetchApps();
  }, [getToken]);

  return { apps, error, isLoading };
}
