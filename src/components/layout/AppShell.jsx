/**
 * AppShell — Container principale PWA.
 * Layout "standard smartphone": colonna unica max 430px centrata (hairline
 * laterali su schermi larghi, come i reference 390px) + safe-area per notch.
 */
export default function AppShell({ children }) {
  return (
    <div className="h-full w-full flex justify-center bg-frame">
      <div
        className="phone-frame flex flex-col h-full w-full max-w-[430px] bg-canvas"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
