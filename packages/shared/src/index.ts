import {
  authModes,
  deliveryWindows,
  moderationActions,
  porchModes,
  reportStatuses,
  roomPrivacyModes,
  roomVisibilityModes
} from "@tpt-hearth/config";
import { z } from "zod";

export type ID = string;

export type AuthMode = (typeof authModes)[keyof typeof authModes];
export type RoomVisibility = (typeof roomVisibilityModes)[keyof typeof roomVisibilityModes];
export type RoomPrivacyMode = (typeof roomPrivacyModes)[keyof typeof roomPrivacyModes];
export type PorchMode = (typeof porchModes)[keyof typeof porchModes];
export type DeliveryWindow = (typeof deliveryWindows)[keyof typeof deliveryWindows];
export type ModerationActionKind = (typeof moderationActions)[keyof typeof moderationActions];
export type ReportStatus = (typeof reportStatuses)[keyof typeof reportStatuses];

export type User = {
  id: ID;
  displayName: string;
  handle: string;
  email: string | null;
  authProvider: AuthMode;
  createdAt: string;
};

export type Session = {
  id: ID;
  userId: ID;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
};

export type Room = {
  id: ID;
  name: string;
  description: string;
  mood: string;
  topic: string;
  visibility: RoomVisibility;
  privacyMode: RoomPrivacyMode;
  capacity: 12;
  stewardId: ID | null;
  rules: string;
  createdAt: string;
  archivedAt: string | null;
};

export type Message = {
  id: ID;
  roomId: ID;
  authorId: ID;
  bodyPlaintext: string | null;
  bodyCiphertext: string | null;
  nonce: string | null;
  keyVersion: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type PorchSession = {
  id: ID;
  mode: PorchMode;
  roomId: ID;
  startsAt: string;
  endsAt: string;
  status: "waiting" | "active" | "extended" | "left" | "archived";
  createdAt: string;
};

export type Letter = {
  id: ID;
  authorId: ID;
  recipientUserId: ID | null;
  recipientRoomId: ID | null;
  subject: string;
  bodyPlaintext: string | null;
  bodyCiphertext: string | null;
  nonce: string | null;
  deliveryWindow: DeliveryWindow;
  deliveredAt: string | null;
  createdAt: string;
};

export type Chronicle = {
  id: ID;
  userId: ID;
  kind: "room" | "letter" | "ritual" | "note";
  title: string;
  bodyPlaintext: string | null;
  bodyCiphertext: string | null;
  metadataJson: string;
  createdAt: string;
};

export type Ritual = {
  id: ID;
  hostId: ID;
  roomId: ID | null;
  title: string;
  description: string;
  startsAt: string;
  summary: string | null;
  createdAt: string;
};

export type Report = {
  id: ID;
  reporterId: ID;
  targetUserId: ID | null;
  targetRoomId: ID | null;
  reason: string;
  status: ReportStatus;
  createdAt: string;
};

export type ModerationAction = {
  id: ID;
  actorId: ID;
  targetUserId: ID | null;
  targetRoomId: ID | null;
  action: ModerationActionKind;
  reason: string;
  createdAt: string;
};

export type ModerationActionRecord = ModerationAction;

export type TransparencyLog = {
  id: ID;
  actionId: ID;
  publicNote: string;
  createdAt: string;
};

export type ServerSetting = {
  id: ID;
  key: string;
  value: string;
  updatedAt: string;
};

export type ServerSettings = ServerSetting;
export type ServerSettingsMap = Record<string, string>;

export type ApiOk<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiOk<T> | ApiError;

const idSchema = z.string().min(1).max(128);
const optionalIdSchema = idSchema.nullable();
const isoTimestampSchema = z.string().datetime();

export const authModeSchema = z.nativeEnum(authModes);
export const roomVisibilitySchema = z.nativeEnum(roomVisibilityModes);
export const roomPrivacyModeSchema = z.nativeEnum(roomPrivacyModes);
export const porchModeSchema = z.nativeEnum(porchModes);
export const deliveryWindowSchema = z.nativeEnum(deliveryWindows);
export const moderationActionKindSchema = z.nativeEnum(moderationActions);
export const reportStatusSchema = z.nativeEnum(reportStatuses);

export const userSchema = z.object({
  id: idSchema,
  displayName: z.string().min(1).max(80),
  handle: z.string().min(1).max(80),
  email: z.string().email().nullable(),
  authProvider: authModeSchema,
  createdAt: isoTimestampSchema
});

export const sessionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  tokenHash: z.string().min(1),
  expiresAt: isoTimestampSchema,
  createdAt: isoTimestampSchema
});

export const roomSchema = z.object({
  id: idSchema,
  name: z.string().min(2).max(80),
  description: z.string().max(500).default(""),
  mood: z.string().min(2).max(40),
  topic: z.string().min(2).max(80),
  visibility: roomVisibilitySchema,
  privacyMode: roomPrivacyModeSchema,
  capacity: z.literal(12),
  stewardId: optionalIdSchema,
  rules: z.string().max(1000).default(""),
  createdAt: isoTimestampSchema,
  archivedAt: isoTimestampSchema.nullable()
});

export const messageInputBaseSchema = z.object({
  roomId: idSchema,
  body: z.string().min(1).max(20_000),
  privacyMode: roomPrivacyModeSchema,
  bodyCiphertext: z.string().nullable().optional(),
  nonce: z.string().nullable().optional(),
  keyVersion: z.string().nullable().optional()
});

export type MessageInput = z.input<typeof messageInputBaseSchema>;

export const messageSchema = z.object({
  id: idSchema,
  roomId: idSchema,
  authorId: idSchema,
  bodyPlaintext: z.string().nullable(),
  bodyCiphertext: z.string().nullable(),
  nonce: z.string().nullable(),
  keyVersion: z.string().nullable(),
  createdAt: isoTimestampSchema,
  deletedAt: isoTimestampSchema.nullable()
});

export const porchSessionSchema = z.object({
  id: idSchema,
  mode: porchModeSchema,
  roomId: idSchema,
  startsAt: isoTimestampSchema,
  endsAt: isoTimestampSchema,
  status: z.enum(["waiting", "active", "extended", "left", "archived"]),
  createdAt: isoTimestampSchema
});

export const letterSchema = z.object({
  id: idSchema,
  authorId: idSchema,
  recipientUserId: optionalIdSchema,
  recipientRoomId: optionalIdSchema,
  subject: z.string().min(1).max(160),
  bodyPlaintext: z.string().nullable(),
  bodyCiphertext: z.string().nullable(),
  nonce: z.string().nullable(),
  deliveryWindow: deliveryWindowSchema,
  deliveredAt: isoTimestampSchema.nullable(),
  createdAt: isoTimestampSchema
});

export const chronicleSchema = z.object({
  id: idSchema,
  userId: idSchema,
  kind: z.enum(["room", "letter", "ritual", "note"]),
  title: z.string().min(1).max(160),
  bodyPlaintext: z.string().nullable(),
  bodyCiphertext: z.string().nullable(),
  metadataJson: z.string().max(20_000).default("{}"),
  createdAt: isoTimestampSchema
});

export const ritualSchema = z.object({
  id: idSchema,
  hostId: idSchema,
  roomId: optionalIdSchema,
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  startsAt: isoTimestampSchema,
  summary: z.string().nullable(),
  createdAt: isoTimestampSchema
});

export const reportSchema = z.object({
  id: idSchema,
  reporterId: idSchema,
  targetUserId: optionalIdSchema,
  targetRoomId: optionalIdSchema,
  reason: z.string().min(1).max(2000),
  status: reportStatusSchema,
  createdAt: isoTimestampSchema
});

export const moderationActionSchema = z.object({
  id: idSchema,
  actorId: idSchema,
  targetUserId: optionalIdSchema,
  targetRoomId: optionalIdSchema,
  action: moderationActionKindSchema,
  reason: z.string().min(1).max(2000),
  createdAt: isoTimestampSchema
});

export const transparencyLogSchema = z.object({
  id: idSchema,
  actionId: idSchema,
  publicNote: z.string().min(1).max(2000),
  createdAt: isoTimestampSchema
});

export const serverSettingSchema = z.object({
  id: idSchema,
  key: z.string().min(1).max(120),
  value: z.string(),
  updatedAt: isoTimestampSchema
});

export const serverSettingsSchema = z.record(z.string());

export const roomInputSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500),
  mood: z.string().min(2).max(40),
  topic: z.string().min(2).max(80),
  visibility: roomVisibilitySchema,
  privacyMode: roomPrivacyModeSchema,
  rules: z.string().max(1000)
});

export const messageInputSchema = messageInputBaseSchema.superRefine((value: MessageInput, context: z.RefinementCtx) => {
  if (value.privacyMode === roomPrivacyModes.privateE2e) {
    if (!value.bodyCiphertext) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodyCiphertext"],
        message: "bodyCiphertext is required for private_e2e messages"
      });
    }

    if (!value.nonce) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nonce"],
        message: "nonce is required for private_e2e messages"
      });
    }
  }
});

export const porchSessionInputSchema = z.object({
  mode: porchModeSchema,
  durationMinutes: z.number().int().positive().max(120)
});

export const letterInputSchema = z.object({
  recipientUserId: optionalIdSchema,
  recipientRoomId: optionalIdSchema,
  subject: z.string().min(1).max(160),
  body: z.string().min(1).max(50_000),
  deliveryWindow: deliveryWindowSchema,
  bodyCiphertext: z.string().nullable().optional(),
  nonce: z.string().nullable().optional()
});

export const chronicleInputSchema = z.object({
  kind: z.enum(["room", "letter", "ritual", "note"]),
  title: z.string().min(1).max(160),
  body: z.string().max(100_000).nullable().optional(),
  metadataJson: z.string().max(20_000)
});

export const ritualInputSchema = z.object({
  roomId: optionalIdSchema,
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  startsAt: z.string().datetime()
});

export const reportInputSchema = z.object({
  targetUserId: optionalIdSchema,
  targetRoomId: optionalIdSchema,
  reason: z.string().min(1).max(2000)
});

export const moderationActionInputSchema = z.object({
  targetUserId: optionalIdSchema,
  targetRoomId: optionalIdSchema,
  action: moderationActionKindSchema,
  reason: z.string().min(1).max(2000)
});

export const transparencyLogInputSchema = z.object({
  actionId: idSchema,
  publicNote: z.string().min(1).max(2000)
});

export const serverSettingInputSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.string()
});

export function apiOk<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function apiError(code: string, message: string): ApiError {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export function isApiOk<T>(response: ApiResponse<T>): response is ApiOk<T> {
  return response.ok;
}

export function toApiResponse<T>(data: T): ApiResponse<T> {
  return apiOk(data);
}

export function zodErrorMessage(error: z.ZodError): string {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return error.message;
  }

  const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : "value";
  return `${path}: ${firstIssue.message}`;
}

export function parseWithZod<T>(schema: z.ZodType<T>, input: unknown): ApiResponse<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return apiOk(result.data);
  }

  return apiError("validation_error", zodErrorMessage(result.error));
}

export function validateWithZod<T>(schema: z.ZodType<T>, input: unknown): ApiResponse<T> {
  return parseWithZod(schema, input);
}

export function validateRoomInput(input: unknown): ApiResponse<z.infer<typeof roomInputSchema>> {
  return parseWithZod(roomInputSchema, input);
}

export function parseRoomInput(input: unknown): ApiResponse<z.infer<typeof roomInputSchema>> {
  return validateRoomInput(input);
}

export function validateMessageInput(input: unknown): ApiResponse<z.infer<typeof messageInputSchema>> {
  return parseWithZod(messageInputSchema, input);
}

export function parseMessageInput(input: unknown): ApiResponse<z.infer<typeof messageInputSchema>> {
  return validateMessageInput(input);
}

export function validatePorchSessionInput(input: unknown): ApiResponse<z.infer<typeof porchSessionInputSchema>> {
  return parseWithZod(porchSessionInputSchema, input);
}

export function validateLetterInput(input: unknown): ApiResponse<z.infer<typeof letterInputSchema>> {
  return parseWithZod(letterInputSchema, input);
}

export function validateChronicleInput(input: unknown): ApiResponse<z.infer<typeof chronicleInputSchema>> {
  return parseWithZod(chronicleInputSchema, input);
}

export function validateRitualInput(input: unknown): ApiResponse<z.infer<typeof ritualInputSchema>> {
  return parseWithZod(ritualInputSchema, input);
}

export function validateReportInput(input: unknown): ApiResponse<z.infer<typeof reportInputSchema>> {
  return parseWithZod(reportInputSchema, input);
}

export function validateModerationActionInput(input: unknown): ApiResponse<z.infer<typeof moderationActionInputSchema>> {
  return parseWithZod(moderationActionInputSchema, input);
}

export function validateTransparencyLogInput(input: unknown): ApiResponse<z.infer<typeof transparencyLogInputSchema>> {
  return parseWithZod(transparencyLogInputSchema, input);
}

export function validateServerSettingInput(input: unknown): ApiResponse<z.infer<typeof serverSettingInputSchema>> {
  return parseWithZod(serverSettingInputSchema, input);
}

export const validators = {
  user: userSchema,
  session: sessionSchema,
  room: roomSchema,
  message: messageSchema,
  porchSession: porchSessionSchema,
  letter: letterSchema,
  chronicle: chronicleSchema,
  ritual: ritualSchema,
  report: reportSchema,
  moderationAction: moderationActionSchema,
  transparencyLog: transparencyLogSchema,
  serverSetting: serverSettingSchema,
  serverSettings: serverSettingsSchema,
  roomInput: roomInputSchema,
  messageInput: messageInputSchema,
  porchSessionInput: porchSessionInputSchema,
  letterInput: letterInputSchema,
  chronicleInput: chronicleInputSchema,
  ritualInput: ritualInputSchema,
  reportInput: reportInputSchema,
  moderationActionInput: moderationActionInputSchema,
  transparencyLogInput: transparencyLogInputSchema,
  serverSettingInput: serverSettingInputSchema
};