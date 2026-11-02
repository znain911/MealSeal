// Static for now — there's no café-management endpoint yet, only a free-text restaurantId on
// each account/voucher. CAFE-01 matches the seeded staff account so a freshly set-up backend has
// at least one café that can actually redeem a voucher end to end.
export const CAFE_OPTIONS = [
  { id: "CAFE-01", name: "Hillside Café" },
  { id: "CAFE-02", name: "Riverside Kitchen" },
  { id: "CAFE-03", name: "The Corner Cup" },
];

/** restaurantId -> friendly café name, falling back to the raw id for an unrecognised café. */
export function cafeName(restaurantId: string): string {
  return CAFE_OPTIONS.find((c) => c.id === restaurantId)?.name ?? restaurantId;
}
