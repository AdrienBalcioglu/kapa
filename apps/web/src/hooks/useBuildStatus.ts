'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { BuildJob } from '@app-builder/shared';
import { getBuild } from '@/lib/api';

export function useBuildStatus(buildId: string) {
  const { getToken } = useAuth();
  const [build, setBuild] = useState<BuildJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBuild = useCallback(async () => {
    try {
      const token = await getToken();
      const data = await getBuild(buildId, token ?? undefined);
      setBuild(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch build');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [buildId, getToken]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const poll = async () => {
      const data = await fetchBuild();
      if (data && (data.status === 'success' || data.status === 'failed')) {
        if (interval) {
          clearInterval(interval);
        }
      }
    };

    poll();
    interval = setInterval(poll, 3000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchBuild]);

  return { build, error, isLoading, refetch: fetchBuild };
}
