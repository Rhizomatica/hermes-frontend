/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_LOGIN_URL?: string;
    NEXT_PUBLIC_WS_URL?: string;
    NEXT_PUBLIC_BASE_PATH?: string;
    NEXT_PUBLIC_APP_VERSION?: string;
    NEXT_PUBLIC_BUILD_TIME?: string;
    HERMES_API_URL?: string;
    GIT_COMMIT_HASH?: string;
  }
}