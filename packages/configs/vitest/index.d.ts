import type { UserWorkspaceConfig } from "vitest/config";

export interface VitestConfigOptions {
  sourceCondition?: string;
}

export declare const createVitestConfig: (options?: VitestConfigOptions) => UserWorkspaceConfig;

declare const config: UserWorkspaceConfig;
export default config;
