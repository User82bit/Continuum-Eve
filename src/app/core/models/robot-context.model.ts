export type RobotContextConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

/**
 * Read-only dashboard telemetry forwarded to UmbrellA.
 * It deliberately excludes raw MQTT payloads, images and robot commands.
 */
export interface RobotContextSnapshot {
  captured_at: string;
  connection_status: RobotContextConnectionStatus;
  last_message_at: string | null;
  telemetry_received: boolean;
  battery_percent: number | null;
  distance_cm: number | null;
  total_planted: number | null;
}
