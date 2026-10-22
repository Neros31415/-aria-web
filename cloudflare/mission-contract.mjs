export const missionContractVersion = 1;

/** Pick the first unfinished checklist step; this helper never executes it. */
export function selectNextMissionStep(mission) {
  if (!mission || !Array.isArray(mission.steps)) return { status: "invalid" };
  const step = mission.steps.find((item) => item && typeof item.id === "string" && typeof item.text === "string" && item.done === false);
  return step ? { status: "ready", step } : { status: "completed" };
}
