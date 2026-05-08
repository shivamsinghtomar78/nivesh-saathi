import {
  Collection,
  ObjectId,
  type Document,
  type Filter,
} from "mongodb";
import { z } from "zod";

import {
  buildFdDashboard,
  calculateExpectedMaturity,
  dateKeyToUtcDate,
  getFdStatus,
  getIndiaDateKey,
} from "@/lib/fd-tracker/calculations";
import type {
  FdAlertDto,
  FdAlertMilestone,
  FdDashboardDto,
  FdInput,
  FdPayoutFrequency,
  FdRecordDto,
  FdSourceType,
  FdStatus,
} from "@/lib/fd-tracker/types";
import { getMongoDb } from "@/lib/server/mongo";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");

export const fdPayoutFrequencySchema = z.enum([
  "cumulative",
  "monthly",
  "quarterly",
  "half-yearly",
  "annual",
]);

const fdInputBaseSchema = z
  .object({
    bankName: z.string().trim().min(2).max(90),
    amount: z.coerce.number().positive().max(1_000_000_000),
    interestRate: z.coerce.number().nonnegative().max(25),
    startDate: dateOnlySchema,
    maturityDate: dateOnlySchema,
    fdType: z.string().trim().max(60).optional().nullable(),
    payoutFrequency: fdPayoutFrequencySchema.optional(),
    notes: z.string().trim().max(700).optional().nullable(),
    nominee: z.string().trim().max(90).optional().nullable(),
    sourceType: z.enum(["manual", "ocr"]).default("manual"),
    receiptUrl: z.string().url().optional().nullable(),
    ocrConfidence: z.coerce.number().min(0).max(1).optional().nullable(),
    ocrRawData: z.unknown().optional(),
  });

export const fdInputSchema = fdInputBaseSchema.refine(
    (value) =>
      dateKeyToUtcDate(value.maturityDate).getTime() >
      dateKeyToUtcDate(value.startDate).getTime(),
    {
      message: "Maturity date must be after start date",
      path: ["maturityDate"],
    }
);

export const fdPatchSchema = fdInputBaseSchema.partial().refine(
  (value) => {
    if (!value.startDate || !value.maturityDate) return true;
    return (
      dateKeyToUtcDate(value.maturityDate).getTime() >
      dateKeyToUtcDate(value.startDate).getTime()
    );
  },
  {
    message: "Maturity date must be after start date",
    path: ["maturityDate"],
  }
);

export const fdTokenSchema = z.object({
  token: z.string().trim().min(20).max(4096),
});

export const fdAlertPatchSchema = z.object({
  alertIds: z.array(z.string().trim().min(1)).max(50).optional(),
  markAllRead: z.boolean().optional(),
});

export type FdRecordDocument = {
  _id: ObjectId;
  userId: string;
  bankName: string;
  amount: number;
  interestRate: number;
  startDate: Date;
  maturityDate: Date;
  expectedMaturityAmount: number;
  interestEarned: number;
  status: FdStatus;
  fdType: string | null;
  payoutFrequency: FdPayoutFrequency;
  notes: string | null;
  nominee: string | null;
  sourceType: FdSourceType;
  receiptUrl: string | null;
  ocrConfidence: number | null;
  ocrRawData?: unknown;
  alert7Sent: boolean;
  alert1Sent: boolean;
  alertTodaySent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FdUserDocument = {
  _id: string;
  firebaseUid: string;
  userId: string;
  email: string | null;
  name: string | null;
  fcmTokens: string[];
  notificationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FdAlertDocument = {
  _id: ObjectId;
  userId: string;
  fdId: ObjectId;
  milestone: FdAlertMilestone;
  title: string;
  body: string;
  readAt: Date | null;
  sentAt: Date;
  pushStatus: FdAlertDto["pushStatus"];
};

export type FdCollections = {
  users: Collection<FdUserDocument>;
  records: Collection<FdRecordDocument>;
  alerts: Collection<FdAlertDocument>;
};

let indexesReady: Promise<void> | null = null;

function cleanOptionalString(value?: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function objectIdFromString(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

async function ensureIndexes(collections: FdCollections) {
  indexesReady ??= Promise.all([
    collections.users.createIndex({ firebaseUid: 1 }, { unique: true }),
    collections.users.createIndex({ userId: 1 }, { unique: true }),
    collections.records.createIndex({ userId: 1, maturityDate: 1 }),
    collections.records.createIndex({ status: 1, maturityDate: 1 }),
    collections.records.createIndex({
      alert7Sent: 1,
      alert1Sent: 1,
      alertTodaySent: 1,
    }),
    collections.alerts.createIndex({ fdId: 1, milestone: 1 }, { unique: true }),
    collections.alerts.createIndex({ userId: 1, sentAt: -1 }),
  ]).then(() => undefined);

  await indexesReady;
}

export async function getFdCollections() {
  const db = await getMongoDb();
  if (!db) {
    return null;
  }

  const collections: FdCollections = {
    users: db.collection<FdUserDocument>("users"),
    records: db.collection<FdRecordDocument>("fd_records"),
    alerts: db.collection<FdAlertDocument>("fd_alerts"),
  };

  await ensureIndexes(collections);
  return collections;
}

export function toFdDto(document: FdRecordDocument): FdRecordDto {
  return {
    id: document._id.toHexString(),
    userId: document.userId,
    bankName: document.bankName,
    amount: document.amount,
    interestRate: document.interestRate,
    startDate: toDateOnly(document.startDate),
    maturityDate: toDateOnly(document.maturityDate),
    expectedMaturityAmount: document.expectedMaturityAmount,
    interestEarned: document.interestEarned,
    status: getFdStatus(document.maturityDate),
    fdType: document.fdType,
    payoutFrequency: document.payoutFrequency,
    notes: document.notes,
    nominee: document.nominee,
    sourceType: document.sourceType,
    receiptUrl: document.receiptUrl,
    ocrConfidence: document.ocrConfidence,
    alert7Sent: document.alert7Sent,
    alert1Sent: document.alert1Sent,
    alertTodaySent: document.alertTodaySent,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function toAlertDto(document: FdAlertDocument): FdAlertDto {
  return {
    id: document._id.toHexString(),
    userId: document.userId,
    fdId: document.fdId.toHexString(),
    milestone: document.milestone,
    title: document.title,
    body: document.body,
    readAt: document.readAt?.toISOString() ?? null,
    sentAt: document.sentAt.toISOString(),
    pushStatus: document.pushStatus,
  };
}

export async function upsertFdUser(input: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  const collections = await getFdCollections();
  if (!collections) return null;

  const now = new Date();

  await collections.users.updateOne(
    { userId: input.userId },
    {
      $set: {
        email: input.email ?? null,
        name: input.name ?? null,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: input.userId,
        firebaseUid: input.userId,
        userId: input.userId,
        fcmTokens: [],
        notificationEnabled: false,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return collections.users.findOne({ userId: input.userId });
}

function buildFdDocument(input: FdInput, userId: string): FdRecordDocument {
  const now = new Date();
  const startDate = dateKeyToUtcDate(input.startDate);
  const maturityDate = dateKeyToUtcDate(input.maturityDate);
  const maturity = calculateExpectedMaturity(input);

  return {
    _id: new ObjectId(),
    userId,
    bankName: input.bankName.trim(),
    amount: input.amount,
    interestRate: input.interestRate,
    startDate,
    maturityDate,
    expectedMaturityAmount: maturity.expectedMaturityAmount,
    interestEarned: maturity.interestEarned,
    status: getFdStatus(maturityDate),
    fdType: cleanOptionalString(input.fdType),
    payoutFrequency: input.payoutFrequency ?? "cumulative",
    notes: cleanOptionalString(input.notes),
    nominee: cleanOptionalString(input.nominee),
    sourceType: input.sourceType ?? "manual",
    receiptUrl: input.receiptUrl ?? null,
    ocrConfidence: input.ocrConfidence ?? null,
    ocrRawData: input.ocrRawData,
    alert7Sent: false,
    alert1Sent: false,
    alertTodaySent: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listUserFds(userId: string) {
  const collections = await getFdCollections();
  if (!collections) return null;

  const records = await collections.records
    .find({ userId })
    .sort({ maturityDate: 1 })
    .toArray();

  return records.map(toFdDto);
}

export async function createFdRecord(params: {
  userId: string;
  email?: string | null;
  name?: string | null;
  input: FdInput;
}) {
  const collections = await getFdCollections();
  if (!collections) return null;

  await upsertFdUser({
    userId: params.userId,
    email: params.email,
    name: params.name,
  });

  const result = await collections.records.insertOne(
    buildFdDocument(params.input, params.userId)
  );
  const record = await collections.records.findOne({ _id: result.insertedId });

  return record ? toFdDto(record) : null;
}

export async function updateFdRecord(params: {
  userId: string;
  fdId: string;
  input: Partial<FdInput>;
}) {
  const collections = await getFdCollections();
  if (!collections) return null;

  const _id = objectIdFromString(params.fdId);
  if (!_id) return undefined;

  const existing = await collections.records.findOne({
    _id,
    userId: params.userId,
  });
  if (!existing) return undefined;

  const merged: FdInput = {
    bankName: params.input.bankName ?? existing.bankName,
    amount: params.input.amount ?? existing.amount,
    interestRate: params.input.interestRate ?? existing.interestRate,
    startDate: params.input.startDate ?? toDateOnly(existing.startDate),
    maturityDate: params.input.maturityDate ?? toDateOnly(existing.maturityDate),
    fdType: params.input.fdType ?? existing.fdType,
    payoutFrequency: params.input.payoutFrequency ?? existing.payoutFrequency,
    notes: params.input.notes ?? existing.notes,
    nominee: params.input.nominee ?? existing.nominee,
    sourceType: params.input.sourceType ?? existing.sourceType,
    receiptUrl: params.input.receiptUrl ?? existing.receiptUrl,
    ocrConfidence: params.input.ocrConfidence ?? existing.ocrConfidence,
    ocrRawData: params.input.ocrRawData ?? existing.ocrRawData,
  };
  const maturity = calculateExpectedMaturity(merged);
  const maturityDate = dateKeyToUtcDate(merged.maturityDate);

  const result = await collections.records.findOneAndUpdate(
    { _id, userId: params.userId },
    {
      $set: {
        bankName: merged.bankName.trim(),
        amount: merged.amount,
        interestRate: merged.interestRate,
        startDate: dateKeyToUtcDate(merged.startDate),
        maturityDate,
        expectedMaturityAmount: maturity.expectedMaturityAmount,
        interestEarned: maturity.interestEarned,
        status: getFdStatus(maturityDate),
        fdType: cleanOptionalString(merged.fdType),
        payoutFrequency: merged.payoutFrequency ?? "cumulative",
        notes: cleanOptionalString(merged.notes),
        nominee: cleanOptionalString(merged.nominee),
        sourceType: merged.sourceType ?? "manual",
        receiptUrl: merged.receiptUrl ?? null,
        ocrConfidence: merged.ocrConfidence ?? null,
        ocrRawData: merged.ocrRawData,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  return result ? toFdDto(result) : undefined;
}

export async function deleteFdRecord(userId: string, fdId: string) {
  const collections = await getFdCollections();
  if (!collections) return null;

  const _id = objectIdFromString(fdId);
  if (!_id) return false;

  const result = await collections.records.deleteOne({ _id, userId });
  if (result.deletedCount > 0) {
    await collections.alerts.deleteMany({ userId, fdId: _id });
  }

  return result.deletedCount > 0;
}

export async function getFdDashboard(userId: string): Promise<FdDashboardDto | null> {
  const collections = await getFdCollections();
  if (!collections) return null;

  const [records, alerts] = await Promise.all([
    collections.records.find({ userId }).sort({ maturityDate: 1 }).toArray(),
    collections.alerts
      .find({ userId, readAt: null })
      .sort({ sentAt: -1 })
      .limit(20)
      .toArray(),
  ]);

  return buildFdDashboard(records.map(toFdDto), alerts.map(toAlertDto));
}

export async function registerFcmToken(params: {
  userId: string;
  email?: string | null;
  name?: string | null;
  token: string;
}) {
  const collections = await getFdCollections();
  if (!collections) return null;

  await upsertFdUser(params);

  const now = new Date();
  await collections.users.updateOne(
    { userId: params.userId },
    {
      $addToSet: { fcmTokens: params.token },
      $set: {
        notificationEnabled: true,
        updatedAt: now,
      },
    }
  );

  return true;
}

export async function removeFcmToken(userId: string, token: string) {
  const collections = await getFdCollections();
  if (!collections) return null;

  await collections.users.updateOne(
    { userId },
    {
      $pull: { fcmTokens: token },
      $set: { updatedAt: new Date() },
    }
  );

  const updated = await collections.users.findOne({ userId });
  if (updated && updated.fcmTokens.length === 0) {
    await collections.users.updateOne(
      { userId },
      { $set: { notificationEnabled: false, updatedAt: new Date() } }
    );
  }

  return true;
}

export async function removeInvalidFcmTokens(userId: string, tokens: string[]) {
  if (tokens.length === 0) return;

  const collections = await getFdCollections();
  if (!collections) return;

  await collections.users.updateOne(
    { userId },
    {
      $pull: { fcmTokens: { $in: tokens } },
      $set: { updatedAt: new Date() },
    } as Document
  );
}

export async function getUserAlerts(userId: string) {
  const collections = await getFdCollections();
  if (!collections) return null;

  const alerts = await collections.alerts
    .find({ userId })
    .sort({ sentAt: -1 })
    .limit(50)
    .toArray();

  return alerts.map(toAlertDto);
}

export async function markAlertsRead(params: {
  userId: string;
  alertIds?: string[];
  markAllRead?: boolean;
}) {
  const collections = await getFdCollections();
  if (!collections) return null;

  const filter: Filter<FdAlertDocument> = { userId: params.userId, readAt: null };

  if (!params.markAllRead) {
    const ids = (params.alertIds ?? [])
      .map(objectIdFromString)
      .filter((id): id is ObjectId => Boolean(id));
    if (ids.length === 0) {
      return 0;
    }
    filter._id = { $in: ids };
  }

  const result = await collections.alerts.updateMany(filter, {
    $set: { readAt: new Date() },
  });

  return result.modifiedCount;
}

export function getDateRangeForDateKey(dateKey: string) {
  const start = dateKeyToUtcDate(dateKey);
  const end = dateKeyToUtcDate(getIndiaDateKey(addDay(start)));
  return { start, end };
}

function addDay(date: Date) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
