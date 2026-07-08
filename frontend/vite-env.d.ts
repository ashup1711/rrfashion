/// <reference types="vite/client" />

interface RuntimeEnv {
  API_URL: string;
}

interface Window {
  __RUNTIME_ENV__?: RuntimeEnv;
}
