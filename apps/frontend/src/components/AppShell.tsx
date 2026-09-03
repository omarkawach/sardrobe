import { useEffect, useState, type CSSProperties } from "react";
import { navigate } from "astro:transitions/client";
import { loadSession, type SessionPayload } from "../scripts/session";
import { WardrobeWorkspace } from "./WardrobeWorkspace";

export function AppShell() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void loadSession().then((nextSession) => {
      if (cancelled) {
        return;
      }

      if (!nextSession) {
        navigate("/", { history: "replace" });
        return;
      }

      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || !session) {
    return <AppShellSsrFallback />;
  }

  return <WardrobeWorkspace user={session.user} />;
}

function AppShellSsrFallback() {
  const block: CSSProperties = {
    background: "color-mix(in oklab, var(--landing-surface), white 12%)",
    borderRadius: "8px",
  };

  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Loading wardrobe"
      style={{
        display: "grid",
        gridTemplateColumns: "13.75rem minmax(0, 1fr)",
        minHeight: "100dvh",
        background: "var(--landing-background)",
      }}
    >
      <aside style={{ ...block, margin: "1rem", minHeight: "calc(100dvh - 2rem)" }} />
      <section style={{ display: "grid", gridTemplateRows: "3rem minmax(0, 1fr)", gap: "0.85rem", margin: "1rem" }}>
        <div style={block} />
        <div style={{ ...block, minHeight: "16rem" }} />
      </section>
    </main>
  );
}
