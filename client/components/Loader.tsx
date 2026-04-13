/**
 * @fileoverview Full-page loading spinner component.
 *
 * Displayed as a fallback while async data or a dynamic import is loading.
 */

/**
 * Centred full-screen spinner with a "Loading…" label.
 *
 * Uses semantic Tailwind colour tokens so it respects the active theme.
 */
export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="relative w-14 h-14">
        {/* Track ring */}
        <div className="absolute inset-0 border-4 border-muted rounded-full" />
        {/* Spinning arc */}
        <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground font-medium">
        Loading…
      </p>
    </div>
  );
}
