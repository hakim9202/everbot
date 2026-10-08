/** Exact error strings from the Everest Engineering PDF. */

export const ERRORS = {
  invalidHours: "Error: Work hours must be a positive integer.",
  zeroRobots: "Error: No robots available for assignment.",
  /** Error Handling slide — Level 1 cannot take ≥1 from each category. */
  eachCategory:
    "Error: Unable to allocate at least one robot from each category with the available inventory.",
  /** General Rules — work cannot be fulfilled with available capacity. */
  insufficientCapacity:
    "Error: Insufficient robot capacity to complete the requested work.",
  invalidClients:
    "Invalid input. Please enter positive integers separated by spaces or commas.",
  negativeInventory: "Robot counts must be non-negative integers.",
} as const;
