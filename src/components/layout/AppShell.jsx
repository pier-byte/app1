/**
 * AppShell — Container principale PWA.
 * Gestisce safe-area-inset per notch e barre di sistema.
 */
export default function AppShell({ children }) {
  return (
    <div
      className="flex flex-col h-full w-full bg-canvas"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {children}
    </div>
  );
}
