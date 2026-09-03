import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogTitle,
  Input,
  Menu,
} from "@sardrobe/react-components";
import { useId, useState } from "react";
import { navigate } from "astro:transitions/client";
import { authClient } from "../scripts/auth-client";
import { SessionAvatar } from "./SessionAvatar";

export interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  compact?: boolean;
  showOpenWardrobe?: boolean;
  showEmail?: boolean;
  privateAiEnabled?: boolean;
  privateAiDisabled?: boolean;
  privateAiStatus?: string;
  onPrivateAiEnabledChange?: (enabled: boolean) => void;

  variant?: "pill" | "inline";
}

const DELETE_CONFIRMATION = "DELETE";

function MoreIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function displayName(
  name: string | null | undefined,
  email: string | null | undefined,
) {
  return name || email || "Sardrobe user";
}

async function signOut() {
  await authClient.signOut();
  navigate("/", { history: "replace" });
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string | null;
}) {
  const confirmInputId = useId();
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete =
    confirmation.trim().toUpperCase() === DELETE_CONFIRMATION && !pending;

  function handleOpenChange(next: boolean) {
    // Don't let a backdrop click or Escape dismiss the dialog mid-request.
    if (pending) {
      return;
    }

    if (!next) {
      setConfirmation("");
      setError(null);
    }

    onOpenChange(next);
  }

  async function handleDelete() {
    if (!canDelete) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/account", { method: "DELETE" });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      try {
        await authClient.signOut();
      } catch (signOutError) {
        console.error(signOutError);
      }

      navigate("/", { history: "replace" });
    } catch (deleteError) {
      console.error(deleteError);
      setPending(false);
      setError(
        "We couldn't delete your account. Please try again, or contact support if this keeps happening.",
      );
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogPortal>
        <AlertDialogBackdrop />
        <AlertDialogPopup className="account-delete-dialog">
          <AlertDialogTitle>Delete account</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account
            {email ? ` (${email})` : ""} and all wardrobe items, outfits,
            packing plans, and uploaded images. This cannot be undone.
          </AlertDialogDescription>

          <div className="account-delete-dialog__field">
            <label htmlFor={confirmInputId} className="account-delete-dialog__label">
              Type <strong>{DELETE_CONFIRMATION}</strong> to confirm
            </label>
            <Input
              id={confirmInputId}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby={error ? `${confirmInputId}-error` : undefined}
            />
          </div>

          {error ? (
            <p
              id={`${confirmInputId}-error`}
              className="account-delete-dialog__error"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="account-delete-dialog__actions">
            <AlertDialogClose disabled={pending}>Cancel</AlertDialogClose>
            <button
              type="button"
              className="alert-dialog__action alert-dialog__action--destructive"
              onClick={() => {
                void handleDelete();
              }}
              disabled={!canDelete}
            >
              {pending ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </AlertDialogPopup>
      </AlertDialogPortal>
    </AlertDialog>
  );
}

export function UserMenu({
  name,
  email,
  image,
  compact = false,
  showOpenWardrobe = false,
  showEmail = false,
  privateAiEnabled = false,
  privateAiDisabled = false,
  privateAiStatus = "",
  onPrivateAiEnabledChange,
  variant = "pill",
}: UserMenuProps) {
  const accountLabel = displayName(name, email);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const identity = (
    <>
      <SessionAvatar
        className="site-user-menu__avatar"
        name={name}
        email={email}
        image={image}
      />
      {compact ? null : (
        <span className="site-user-menu__copy">
          <span className="site-user-menu__name">{accountLabel}</span>
          {showEmail ? (
            <span className="site-user-menu__email">
              {email || "No email on file"}
            </span>
          ) : null}
        </span>
      )}
    </>
  );

  const compactPopup = variant === "inline" || compact;
  const popupClassName = compactPopup
    ? "site-user-menu__popup site-user-menu__popup--compact"
    : "site-user-menu__popup";

  const popup = (
    <Menu.Portal>
      <Menu.Positioner
        className="site-user-menu__positioner"
        sideOffset={10}
        align="end"
      >
        <Menu.Popup className={popupClassName}>
          {showOpenWardrobe ? (
            <>
              <Menu.Group>
                <Menu.Item
                  onClick={() => {
                    navigate("/app/");
                  }}
                >
                  Open wardrobe
                </Menu.Item>
              </Menu.Group>
              <Menu.Separator />
            </>
          ) : null}
          {onPrivateAiEnabledChange ? (
            <>
              <Menu.CheckboxItem
                checked={privateAiEnabled}
                disabled={privateAiDisabled}
                closeOnClick={false}
                className="site-user-menu__ai-setting"
                onCheckedChange={(checked) => onPrivateAiEnabledChange(checked === true)}
              >
                <span className="site-user-menu__ai-copy">
                  <strong>Planning AI</strong>
                  <small>{privateAiStatus ? `${privateAiStatus} · ` : ""}Outfits and packing only</small>
                </span>
                <span className={`site-user-menu__switch${privateAiEnabled ? " site-user-menu__switch--checked" : ""}`} aria-hidden="true">
                  <span />
                </span>
              </Menu.CheckboxItem>
              <Menu.Separator />
            </>
          ) : null}
          <Menu.Item
            onClick={() => {
              void signOut().catch((error) => {
                console.error(error);
                window.alert(
                  "Sign out could not be completed. Please try again.",
                );
              });
            }}
          >
            Sign out
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            className="site-user-menu__item--danger"
            onClick={() => {
              setDeleteOpen(true);
            }}
          >
            Delete account
          </Menu.Item>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );

  const trigger =
    variant === "inline" ? (
      <Menu.Root>
        <div className="site-user-menu__row">
          <span className="site-user-menu__identity">{identity}</span>
          <Menu.Trigger
            className="site-user-menu__more auth-action"
            aria-label={`Open account menu for ${accountLabel}`}
          >
            <MoreIcon />
          </Menu.Trigger>
        </div>
        {popup}
      </Menu.Root>
    ) : (
      <Menu.Root>
        <Menu.Trigger
          className={`site-user-menu__trigger auth-action${compact ? " site-user-menu__trigger--compact" : ""}`}
          aria-label={`Open account menu for ${accountLabel}`}
        >
          {identity}
        </Menu.Trigger>
        {popup}
      </Menu.Root>
    );

  return (
    <>
      {trigger}
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={email}
      />
    </>
  );
}
