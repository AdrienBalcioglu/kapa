// packages/shared/src/index.ts

export interface AppConfig {
  id: string;
  userId: string;
  appName: string;
  bundleId: string;           // ex: com.monsite.app
  url: string;                // URL du site web à encapsuler
  splashColor: string;        // hex
  iconBase64?: string;        // PNG 1024x1024
  pushNotifications: boolean;
  sessionMode: 'cookie' | 'jwt' | 'none';
  platforms: ('ios' | 'android')[];
  createdAt: Date;
}

export interface BuildJob {
  id: string;
  appConfigId: string;
  status: BuildStatus;
  platform: 'ios' | 'android';
  easBuildId?: string;
  downloadUrl?: string;
  logs?: string;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export type BuildStatus =
  | 'pending'
  | 'generating'    // génération du code Capacitor
  | 'queued'        // envoyé à EAS
  | 'building'      // EAS build en cours
  | 'success'
  | 'failed';

export interface BuildJobEvent {
  jobId: string;
  status: BuildStatus;
  progress?: number;
  message?: string;
}

export interface GenerateAppPayload {
  config: AppConfig;
  jobId: string;
}

export interface EASBuildResult {
  easBuildId: string;
  status: string;
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
}

export const API_ROUTES = {
  CREATE_APP: '/api/apps',
  GET_APP: '/api/apps/:id',
  LIST_APPS: '/api/apps',
  START_BUILD: '/api/builds',
  GET_BUILD: '/api/builds/:id',
  BUILD_WEBHOOK: '/api/webhooks/eas',
} as const;
