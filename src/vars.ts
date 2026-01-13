declare const VITE_DEV_MODE: boolean;
declare const VITE_COMMIT_HASH: string;
declare const VITE_BUILD_DATE: string;

export const __DEV__: boolean = typeof VITE_DEV_MODE !== 'undefined' ? VITE_DEV_MODE : true;
export const __COMMIT_HASH__: string =
  typeof VITE_COMMIT_HASH !== 'undefined' ? VITE_COMMIT_HASH : 'main';
export const __BUILD_DATE__: string =
  typeof VITE_BUILD_DATE !== 'undefined' ? VITE_BUILD_DATE : new Date().toISOString();
