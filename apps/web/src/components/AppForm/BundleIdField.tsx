'use client';

import { useEffect } from 'react';
import { Input } from '@/components/ui';

interface BundleIdFieldProps {
  appName: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function BundleIdField({ appName, value, onChange, error }: BundleIdFieldProps) {
  useEffect(() => {
    if (appName && !value) {
      const sanitized = appName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      onChange('com.appbuilder.' + (sanitized || 'app'));
    }
  }, [appName, value, onChange]);

  return (
    <Input
      id="bundleId"
      label="Bundle ID"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="com.example.myapp"
      error={error}
    />
  );
}
