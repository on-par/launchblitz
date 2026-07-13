export type WorkflowErrorCode =
  | "missing_provider_key"
  | "missing_idea"
  | "provider_error"
  | "invalid_output";

export class WorkflowStageError extends Error {
  constructor(
    public code: WorkflowErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkflowStageError";
  }
}
