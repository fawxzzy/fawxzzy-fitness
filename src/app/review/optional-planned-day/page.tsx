import { redirect } from "next/navigation";

/**
 * Retired preview route. It only showed the Optional day control that already lives on the routine card, nothing in
 * the app links to it, and it read and changed nothing. It redirects to Routines (where that control is) instead of
 * 404ing, so an old bookmark or screenshot link still lands somewhere useful. The panel itself stays covered by the
 * dev mobile-regression surface.
 */
export default function OptionalPlannedDayReviewPage(): never {
  redirect("/routines");
}
