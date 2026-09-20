"use client";

import { useState, useTransition } from "react";

import type { ActionState } from "@/app/(dashboard)/actions";

/**
 * Drives a server action from inside a dialog.
 *
 * `useActionState` would mean watching its result in an effect to know when to
 * close, and a setState inside an effect body is exactly the cascading render
 * React warns about. Awaiting the action here instead makes success an ordinary
 * event: close on `ok`, keep the dialog open and show the errors otherwise.
 */
export function useDialogForm(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  onSuccess: () => void,
) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function formAction(formData: FormData) {
    startTransition(async () => {
      const result = await action({}, formData);

      if (result.ok) {
        // Clear any errors from an earlier attempt, so re-opening the dialog
        // does not show stale messages against empty fields.
        setState({});
        onSuccess();
        return;
      }

      setState(result);
    });
  }

  return { state, formAction, pending };
}
