"use client";

import { useState } from "react";

export function InlineWaitlist({
  triggerLabel = "Join waitlist",
  triggerClassName = "",
  defaultOpen = false,
  fieldLabel = "Email address",
  submitLabel = "Join waitlist",
  successMessage = "You're on the list!",
  errorMessage = "Something went wrong — please try again.",
  formClassName,
}: {
  triggerLabel?: string;
  triggerClassName?: string;
  defaultOpen?: boolean;
  fieldLabel?: string;
  submitLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  formClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <div className="w-full max-w-md">
      {defaultOpen ? null : (
        <button className={triggerClassName} onClick={() => setIsOpen(true)} type="button">
          {triggerLabel}
        </button>
      )}
      {isOpen ? (
        <div
          className={
            formClassName ??
            "mt-4 rounded-[1.6rem] border border-[#FF4D00]/15 bg-[#f7f7f6] p-4 text-left text-black shadow-[0_22px_60px_rgba(0,0,0,0.28)]"
          }
        >
          {isSubmitted ? (
            <p className="text-sm font-semibold tracking-[-0.02em]">{successMessage}</p>
          ) : (
            <>
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  setError(false);
                  setIsSubmitting(true);
                  fetch("/api/waitlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                  })
                    .then((response) => {
                      if (response.ok) {
                        setIsSubmitted(true);
                      } else {
                        setError(true);
                      }
                    })
                    .catch(() => {
                      setError(true);
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
              >
                <input
                  aria-label={fieldLabel}
                  className="h-12 flex-1 rounded-full border border-black/10 bg-white px-4 text-sm outline-none transition focus:border-[#FF4D00]"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={fieldLabel}
                  required
                  type="email"
                  value={email}
                />
                <button
                  className="h-12 rounded-full bg-[#FF4D00] px-5 text-sm font-semibold text-white transition hover:bg-[#e94700] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Joining…" : submitLabel}
                </button>
              </form>
              {error ? <p className="mt-2 text-xs text-[#FF4D00]">{errorMessage}</p> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
