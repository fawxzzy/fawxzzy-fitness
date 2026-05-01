import appBuildManifest from "@/generated/appBuildManifest.json";

export type AppBuildManifest = typeof appBuildManifest;

export const CURRENT_APP_BUILD = appBuildManifest;
export const CURRENT_APP_BUILD_ID = appBuildManifest.buildId;
