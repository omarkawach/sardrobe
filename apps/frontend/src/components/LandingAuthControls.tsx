import { useEffect, useState } from "react";
import { navigate } from "astro:transitions/client";
import { Button } from "@sardrobe/react-components";
import { authClient } from "../scripts/auth-client";
import { loadSession, type SessionPayload } from "../scripts/session";
import { UserMenu } from "./UserMenu";

type LandingAuthControlsProps = {
  placement: "header" | "hero" | "closing";
};

async function startGoogleSignIn(button: HTMLButtonElement | null) {
  if (button) {
    button.disabled = true;
    button.dataset.pending = "true";
  }

  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/app/",
      errorCallbackURL: "/",
    });
  } catch (error) {
    console.error(error);

    if (button) {
      button.disabled = false;
      button.dataset.pending = "false";
    }

    window.alert(
      "Google sign-in could not be started. Check the backend dev server and provider secrets.",
    );
  }
}

function openApp() {
  navigate("/app/");
}

export function LandingAuthControls({ placement }: LandingAuthControlsProps) {
  const [session, setSession] = useState<SessionPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadSession().then((nextSession) => {
      if (!cancelled) {
        setSession(nextSession);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const user = session?.user;

  if (placement === "header") {
    return user ? (
      <UserMenu name={user.name} email={user.email} image={user.image} showOpenWardrobe showEmail />
    ) : (
      <Button
        className="site-header__cta auth-action"
        color="primary"
        size="md"
        type="button"
        onClick={(event) => {
          void startGoogleSignIn(event.currentTarget);
        }}
      >
        Sign in with Google
      </Button>
    );
  }

  if (placement === "hero") {
    return (
      <>
        {user ? (
          <Button
            className="hero__action auth-action"
            color="primary"
            size="lg"
            type="button"
            onClick={openApp}
          >
            Open your wardrobe
          </Button>
        ) : (
          <Button
            className="hero__action auth-action"
            color="primary"
            size="lg"
            type="button"
            onClick={(event) => {
              void startGoogleSignIn(event.currentTarget);
            }}
          >
            Sign in with Google
          </Button>
        )}
      </>
    );
  }

  return user ? (
    <Button
      className="closing__action auth-action"
      color="primary"
      size="lg"
      type="button"
      onClick={openApp}
    >
      Open your wardrobe
    </Button>
  ) : (
    <Button
      className="closing__action auth-action"
      color="primary"
      size="lg"
      type="button"
      onClick={(event) => {
        void startGoogleSignIn(event.currentTarget);
      }}
    >
      Sign in with Google
    </Button>
  );
}
