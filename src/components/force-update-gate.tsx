import { useEffect, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Download, RefreshCw } from "lucide-react";
import api from "../lib/api";

interface VersionData {
  min_version: string;
  latest_version: string;
  download_url: string;
}

/** Compare two version strings like "1.0", "2.1.3". Returns true if `current` is older than `minimum`. */
function isOutdated(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const cur = parse(current);
  const min = parse(minimum);
  const len = Math.max(cur.length, min.length);
  for (let i = 0; i < len; i++) {
    const c = cur[i] ?? 0;
    const m = min[i] ?? 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
}

function UpdateScreen({ versionData }: { versionData: VersionData }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary via-accent to-hot p-[2px] shadow-2xl shadow-primary/30">
          <div className="w-full h-full rounded-[22px] bg-bg flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-black brand-gradient-text mb-3 leading-tight">
          Update Required
        </h1>
        <p className="text-text-muted text-sm leading-relaxed mb-2">
          A new version of MaskedOn is available with important improvements and
          bug fixes.
        </p>
        <p className="text-text-dim text-xs mb-10">
          v{versionData.latest_version} is required to continue.
        </p>

        {/* Download button */}
        <a
          href={versionData.download_url}
          target="_blank"
          rel="noreferrer"
          className="btn-primary-luxe w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 no-underline"
        >
          <Download className="w-4 h-4" />
          Download Latest Version
        </a>

        <p className="text-text-dim text-[11px] mt-6 leading-relaxed">
          Download and install the new APK, then reopen the app to continue.
        </p>
      </div>
    </div>
  );
}

type Status = "checking" | "outdated" | "ok";

export default function ForceUpdateGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [versionData, setVersionData] = useState<VersionData | null>(null);

  useEffect(() => {
    // Only enforce on actual native (Android/iOS) builds — web always passes
    if (!Capacitor.isNativePlatform()) {
      setStatus("ok");
      return;
    }

    (async () => {
      try {
        const [info, res] = await Promise.all([
          App.getInfo(),
          api.get<{ success: boolean; data: VersionData }>("/app/version"),
        ]);

        const data = res.data.data;
        setVersionData(data);

        if (isOutdated(info.version, data.min_version)) {
          setStatus("outdated");
        } else {
          setStatus("ok");
        }
      } catch {
        // Network error or backend down — let the user through rather than
        // blocking the whole app due to a connectivity issue.
        setStatus("ok");
      }
    })();
  }, []);

  if (status === "checking") return null;
  if (status === "outdated" && versionData) return <UpdateScreen versionData={versionData} />;
  return <>{children}</>;
}
