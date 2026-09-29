import { useEffect } from "react";

export default function App() {
  useEffect(() => {
    // React owns application startup. Views can now move across this explicit
    // boundary one at a time without changing the deployed routes or data API.
    // @ts-expect-error Framework-agnostic module during the staged migration.
    void import("./legacy/app.js").then((module) => module.mountLegacyApp());
  }, []);

  return (
    <>
      <div className="wallpaper" aria-hidden="true" />
      <div id="app"><p className="boot">n-os · …</p></div>
      <aside id="install-prompt" className="install-prompt glass" aria-live="polite" hidden />
      <dialog id="dialog" aria-labelledby="dialog-title" />
      <div id="toast" role="status" />
    </>
  );
}
