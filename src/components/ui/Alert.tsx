import type { ReactNode } from "react";

type AlertVariant = "success" | "error" | "info";

const styles: Record<AlertVariant, string> = {
  success:
    "border-emerald-200/80 bg-emerald-50 text-emerald-900 [&_svg]:text-emerald-600",
  error: "border-red-200/80 bg-red-50 text-red-900 [&_svg]:text-red-600",
  info: "border-sky-200/80 bg-sky-50 text-sky-900 [&_svg]:text-sky-600",
};

export function Alert({
  variant,
  children,
}: {
  variant: AlertVariant;
  children: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}
    >
      <span className="mt-0.5 shrink-0 text-base" aria-hidden>
        {variant === "success" ? "✓" : variant === "error" ? "!" : "i"}
      </span>
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
