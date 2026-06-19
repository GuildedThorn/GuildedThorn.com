import React from "react";
import { useLanyard } from "@lib/useLanyard";

const userId = "654849939175768074";

export const Discord = () => {
  const presence = useLanyard(userId);

  if (!presence)
    return (
      <div className="text-sm text-muted-foreground">
        Connecting to Discord...
      </div>
    );

  const { discord_user, discord_status, activities } = presence;

  const avatarUrl = discord_user.avatar
    ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${
        parseInt(discord_user.discriminator) % 5
      }.png`;

  const statusColor = {
    online: "bg-green-500",
    idle: "bg-yellow-500",
    dnd: "bg-red-500",
    offline: "bg-gray-500",
  }[discord_status];

  const app = activities.find((a) => a.type === 0);

  const getDynamicFallback = (activityName?: string): string | null => {
    if (!activityName) return null;

    const key = activityName.toLowerCase().replace(/\s+/g, "_");

    const knownFallbacks: Record<string, string> = {
      jetbrains_rider:
        "https://raw.githubusercontent.com/Azn9/JetBrains-Discord-Integration/develop/icons/data/themes/material/applications/jetbrains_rider.png",
      rider:
        "https://raw.githubusercontent.com/Azn9/JetBrains-Discord-Integration/develop/icons/data/themes/material/applications/jetbrains_rider.png",
    };

    return (
      knownFallbacks[key] ||
      `https://raw.githubusercontent.com/Azn9/JetBrains-Discord-Integration/develop/icons/data/themes/material/applications/${key}.png`
    );
  };

  const getDiscordAssetUrl = (
    appId: string | undefined,
    imageName: string | undefined,
    activityName?: string,
  ): string | null => {
    if (!imageName) return null;

    if (imageName.startsWith("mp:")) {
      return `https://media.discordapp.net/${imageName.slice(3)}`;
    }

    if (!appId) return null;

    const cleanName = imageName
      .replace(/^(large_|small_)/, "")
      .replace(/\?.*$/, "");

    const cdnUrl = `https://cdn.discordapp.com/app-assets/${appId}/${cleanName}.png`;

    const fallback = getDynamicFallback(activityName);
    return cdnUrl + `#fallback=${encodeURIComponent(fallback ?? "")}`;
  };

  const applyImageFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (!target) return;

    const fallback = new URL(target.src).hash.replace("#fallback=", "");

    if (fallback) {
      target.onerror = null;
      target.src = decodeURIComponent(fallback);
    }
  };

  const largeImageUrl = getDiscordAssetUrl(
    app?.application_id,
    app?.assets?.large_image,
    app?.name,
  );

  const smallImageUrl = getDiscordAssetUrl(
    app?.application_id,
    app?.assets?.small_image,
    app?.name,
  );

  return (
    <div className="mx-auto my-4 w-full max-w-md rounded-2xl border border-border bg-muted/50 p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <img
          src={avatarUrl}
          alt="Avatar"
          className="h-16 w-16 shrink-0 rounded-full border-2 border-border"
        />

        <div className="min-w-0">
          <div className="truncate text-lg font-semibold">
            {discord_user.username}#{discord_user.discriminator}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${statusColor}`}></span>
            <span className="capitalize">{discord_status}</span>
          </div>
        </div>
      </div>

      {app && (
        <div className="mt-4 rounded-xl bg-muted p-3">
          <div className="flex items-start gap-3">
            {(largeImageUrl || smallImageUrl) && (
              <div className="relative shrink-0">
                {largeImageUrl && (
                  <img
                    src={largeImageUrl}
                    alt={app.assets?.large_text || "Large Image"}
                    title={app.assets?.large_text}
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                    onError={applyImageFallback}
                  />
                )}

                {smallImageUrl && (
                  <img
                    src={smallImageUrl}
                    alt={app.assets?.small_text || "Small Image"}
                    title={app.assets?.small_text}
                    className={
                      largeImageUrl
                        ? "absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full border-2 border-muted bg-muted object-cover"
                        : "h-10 w-10 rounded-full border border-border object-cover"
                    }
                    onError={applyImageFallback}
                  />
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="text-sm text-muted-foreground">🧩 Active App</div>

              <div className="break-words text-lg font-semibold">{app.name}</div>

              {app.details && <div className="break-words text-sm">{app.details}</div>}

              {app.state && (
                <div className="break-words text-sm text-muted-foreground">{app.state}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
