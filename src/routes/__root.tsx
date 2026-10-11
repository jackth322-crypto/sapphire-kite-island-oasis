import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Space Hockey";
const assetBase = import.meta.env.BASE_URL ?? "/";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: "4v4 side-view space hockey. Hover robots, body checks, first to five." },
      { name: "theme-color", content: "#070b18" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: `${assetBase}favicon.svg` },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: `${assetBase}__grok/manifest.webmanifest` },
      { rel: "apple-touch-icon", href: `${assetBase}__grok/icon-180.png` },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
