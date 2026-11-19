// The three stages a proposal can be in. New proposals start as "Current".
export const projectStatuses = ["Current", "Secured", "Lost"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const DEFAULT_PROJECT_STATUS: ProjectStatus = "Current";

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return projectStatuses.includes(value as ProjectStatus);
}
