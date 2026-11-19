/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_BASE_PATH?: string;
    NEXT_PUBLIC_APP_VERSION?: string;
    NEXT_PUBLIC_BUILD_TIME?: string;
    NEXT_PUBLIC_ENABLE_CHAT?: string;
    NEXT_PUBLIC_PMTILES_URL?: string;
    NEXT_PUBLIC_APP_TIME_ZONE?: string;
    NEXT_PUBLIC_MOCK_GPS?: string;
    HERMES_API_URL?: string;
    HERMES_API_TLS_SERVERNAME?: string;
    GIT_COMMIT_HASH?: string;
  }
}