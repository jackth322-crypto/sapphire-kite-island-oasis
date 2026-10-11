import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { previewPathRewrite } from "@/lib/preview-path-prefix";
import { routeTree } from "./routeTree.gen";

function appBasepath() {
  const raw = import.meta.env.BASE_URL ?? "/";
  if (raw === "/" || raw === "") return undefined;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: appBasepath(),
    rewrite: previewPathRewrite(),
    defaultErrorComponent: AppErrorComponent,
  });
}
