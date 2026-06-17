export const APP_NAME = "tpt hearth";
export const APP_SLUG = "tpt-hearth";
export const ROOM_CAPACITY = 12;
export const DEFAULT_WS_PORT = 4000;
export const DEFAULT_DATABASE_PATH = ".data/hearth.sqlite";

export const brandColors = {
  emberOrange: "#D46A2E",
  ashGray: "#2C2C2E",
  warmSand: "#E8DCC4",
  deepPine: "#1A2F1A"
} as const;

export const authModes = {
  inviteCode: "invite_code",
  magicLink: "magic_link",
  username: "username",
  oauth: "oauth",
  localDemo: "local_demo"
} as const;

export const roomVisibilityModes = {
  privateInviteOnly: "private_invite_only",
  linkOnly: "link_only",
  openDirectory: "open_directory",
  openPorchEligible: "open_porch_eligible"
} as const;

export const roomPrivacyModes = {
  privateE2e: "private_e2e",
  openPlaintext: "open_plaintext"
} as const;

export const porchModes = {
  randomMatching: "random_matching",
  openLobby: "open_lobby"
} as const;

export const deliveryWindows = {
  now: "now",
  morning: "morning",
  evening: "evening"
} as const;

export const moderationActions = {
  mute: "mute",
  ban: "ban",
  archiveRoom: "archive_room"
} as const;

export const reportStatuses = {
  open: "open",
  reviewed: "reviewed",
  resolved: "resolved"
} as const;

export type BrandColorName = keyof typeof brandColors;
export type AuthMode = (typeof authModes)[keyof typeof authModes];
export type RoomVisibilityMode = (typeof roomVisibilityModes)[keyof typeof roomVisibilityModes];
export type RoomPrivacyMode = (typeof roomPrivacyModes)[keyof typeof roomPrivacyModes];
export type PorchMode = (typeof porchModes)[keyof typeof porchModes];
export type DeliveryWindow = (typeof deliveryWindows)[keyof typeof deliveryWindows];
export type ModerationActionKind = (typeof moderationActions)[keyof typeof moderationActions];
export type ReportStatus = (typeof reportStatuses)[keyof typeof reportStatuses];

export type EnumMap = Record<string, string>;

export function getEnv(name: string, fallback?: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  const value = runtime.process?.env?.[name];
  return value === undefined ? fallback : value;
}

export function getRequiredEnv(name: string): string {
  const value = getEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function isEnumValue<TEnum extends EnumMap>(value: string | undefined, enumMap: TEnum): value is TEnum[keyof TEnum] {
  return value !== undefined && Object.values(enumMap).includes(value);
}

export function getEnumValue<TEnum extends EnumMap>(value: string | undefined, enumMap: TEnum, fallback: TEnum[keyof TEnum], label: string): TEnum[keyof TEnum] {
  if (isEnumValue(value, enumMap)) {
    return value;
  }

  if (value) {
    const allowed = Object.values(enumMap).join(", ");
    throw new Error(`Invalid ${label}: "${value}". Expected one of: ${allowed}`);
  }

  return fallback;
}

export function getRoomCapacity(): typeof ROOM_CAPACITY {
  return ROOM_CAPACITY;
}

export function getWebSocketPort(): number {
  return parseIntegerEnv("WS_PORT", DEFAULT_WS_PORT, {
    min: 1,
    max: 65_535,
    label: "WS_PORT"
  });
}

export function getDatabasePath(): string {
  const configuredUrl = getEnv("DATABASE_URL");

  if (configuredUrl?.startsWith("file:")) {
    return configuredUrl.slice("file:".length);
  }

  return getEnv("DATABASE_PATH", DEFAULT_DATABASE_PATH) ?? DEFAULT_DATABASE_PATH;
}

export function getAuthMode(): AuthMode {
  return getEnumValue(getEnv("AUTH_MODE"), authModes, authModes.inviteCode, "auth mode");
}

export function getRoomVisibilityMode(): RoomVisibilityMode {
  return getEnumValue(getEnv("ROOM_VISIBILITY"), roomVisibilityModes, roomVisibilityModes.privateInviteOnly, "room visibility mode");
}

export function getRoomPrivacyMode(): RoomPrivacyMode {
  return getEnumValue(getEnv("ROOM_PRIVACY"), roomPrivacyModes, roomPrivacyModes.privateE2e, "room privacy mode");
}

export function getPorchMode(): PorchMode {
  return getEnumValue(getEnv("PORCH_MODE"), porchModes, porchModes.openLobby, "porch mode");
}

export function getDeliveryWindow(): DeliveryWindow {
  return getEnumValue(getEnv("DEFAULT_DELIVERY_WINDOW"), deliveryWindows, deliveryWindows.now, "delivery window");
}

export function parseBooleanEnv(name: string, fallback = false): boolean {
  const value = getEnv(name);

  if (value === undefined) {
    return fallback;
  }

  switch (value.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      throw new Error(`Invalid boolean environment variable ${name}: "${value}"`);
  }
}

export function parseIntegerEnv(
  name: string,
  fallback: number,
  options: { min?: number; max?: number; label?: string } = {}
): number {
  const value = getEnv(name);

  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid integer environment variable ${options.label ?? name}: "${value}"`);
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${options.label ?? name} must be at least ${options.min}`);
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${options.label ?? name} must be at most ${options.max}`);
  }

  return parsed;
}