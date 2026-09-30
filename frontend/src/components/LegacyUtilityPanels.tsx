interface InstallPromptProps {
  message: string;
  canInstall: boolean;
  label: (key: string) => string;
  icon: (key: string) => string;
}

interface ToastProps {
  message: string;
  withUndo: boolean;
  label: (key: string) => string;
}

interface BootErrorProps {
  message: string;
  retryLabel: string;
}

export function LegacyInstallPrompt({ message, canInstall, label: t, icon }: InstallPromptProps) {
  return (
    <>
      <div className="install-mark">n</div>
      <div>
        <strong>{t("installApp")}</strong>
        <p>{message}</p>
      </div>
      <div className="install-actions">
        {canInstall && (
          <button type="button" className="btn primary" data-action="install-app">
            <Markup html={icon("download")} />
            <span>{t("installApp")}</span>
          </button>
        )}
        <button type="button" className="text-btn" data-action="dismiss-install">
          <span>{t("later")}</span>
        </button>
      </div>
    </>
  );
}

export function LegacyToast({ message, withUndo, label: t }: ToastProps) {
  return (
    <>
      <span>{message}</span>
      {withUndo && (
        <button type="button" className="text-btn" data-action="undo">
          <span>{t("undo")}</span>
        </button>
      )}
    </>
  );
}

export function LegacyBootError({ message, retryLabel }: BootErrorProps) {
  return (
    <div className="boot">
      <h1>n-os</h1>
      <p>{message}</p>
      <button type="button" className="btn" data-action="reload">
        <span>{retryLabel}</span>
      </button>
    </div>
  );
}

function Markup({ html }: { html: string }) {
  return <span className="legacy-markup" dangerouslySetInnerHTML={{ __html: html }} />;
}
