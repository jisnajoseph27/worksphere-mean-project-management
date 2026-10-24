export interface HealthService {
  checkReadiness: () => Promise<void>;
}

export function createHealthService(
  checkDatabaseReadiness: () => Promise<void>
): HealthService {
  return {
    checkReadiness: checkDatabaseReadiness
  };
}
