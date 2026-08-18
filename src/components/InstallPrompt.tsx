import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const { t } = useTranslation();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("officeInstallDismissed") === "1") return;

    let gotPrompt = false;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      gotPrompt = true;
      setDeferred(e as BeforeInstallPromptEvent);
      setIosHint(false);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const timer = window.setTimeout(() => {
      if (!gotPrompt && !isStandalone()) {
        setIosHint(true);
        setOpen(true);
      }
    }, 2500);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  if (!open || isStandalone()) return null;

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem("officeInstallDismissed", "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
    localStorage.setItem("officeInstallDismissed", "1");
  };

  return (
    <div className="install-banner" role="dialog" aria-label={t("installApp")}>
      <div className="install-banner-inner">
        <div>
          <p className="install-banner-title">{t("installApp")}</p>
          <p className="muted install-banner-sub">
            {iosHint && isIos() ? t("installAppIosHint") : t("installAppSub")}
          </p>
        </div>
        <div className="install-banner-actions">
          {deferred ? (
            <button type="button" className="btn btn-sm" onClick={() => void install()}>
              {t("install")}
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
            {t("notNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
