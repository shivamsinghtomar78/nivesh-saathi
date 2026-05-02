import { MongoServerError, ObjectId } from "mongodb";

import {
  getFdAlertTargets,
  type FdAlertTarget,
} from "@/lib/fd-tracker/alerts";
import type { FdAlertMilestone } from "@/lib/fd-tracker/types";
import { serverEnv } from "@/lib/server/env";
import { getFirebaseMessaging } from "@/lib/server/firebase-admin";
import {
  getDateRangeForDateKey,
  getFdCollections,
  removeInvalidFcmTokens,
  type FdAlertDocument,
  type FdRecordDocument,
} from "@/lib/server/fd-tracker-service";

const INVALID_FCM_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function buildAlertMessage(fd: FdRecordDocument, target: FdAlertTarget) {
  return {
    title: "FD maturity reminder",
    body: `Your FD in ${fd.bankName} matures ${target.label}`,
  };
}

function isDuplicateKeyError(error: unknown) {
  return error instanceof MongoServerError && error.code === 11000;
}

async function sendPushAlert(params: {
  alertId: ObjectId;
  body: string;
  fdId: ObjectId;
  milestone: FdAlertMilestone;
  title: string;
  tokens: string[];
  userId: string;
}) {
  if (params.tokens.length === 0) {
    return {
      invalidTokens: [] as string[],
      status: "no_tokens" as const,
    };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return {
      invalidTokens: [] as string[],
      status: "not_configured" as const,
    };
  }

  const response = await messaging.sendEachForMulticast({
    tokens: params.tokens,
    data: {
      type: "fd_maturity_alert",
      alertId: params.alertId.toHexString(),
      fdId: params.fdId.toHexString(),
      milestone: params.milestone,
      title: params.title,
      body: params.body,
      url: "/fds",
    },
    webpush: {
      fcmOptions: {
        link: `${serverEnv.NEXT_PUBLIC_APP_URL}/fds`,
      },
      headers: {
        Urgency: "high",
      },
    },
  });

  const invalidTokens = response.responses
    .map((result, index) =>
      result.error && INVALID_FCM_CODES.has(result.error.code)
        ? params.tokens[index]
        : null
    )
    .filter((token): token is string => Boolean(token));

  if (invalidTokens.length > 0) {
    await removeInvalidFcmTokens(params.userId, invalidTokens);
  }

  return {
    invalidTokens,
    status:
      response.successCount === params.tokens.length
        ? ("sent" as const)
        : response.successCount > 0
          ? ("partial" as const)
          : ("failed" as const),
  };
}

export async function runFdAlertJob(now = new Date()) {
  const collections = await getFdCollections();
  if (!collections) {
    return null;
  }

  const targets = getFdAlertTargets(now);
  const result = {
    checked: 0,
    created: 0,
    duplicateSkipped: 0,
    pushed: 0,
    invalidTokensRemoved: 0,
  };

  for (const target of targets) {
    const { end, start } = getDateRangeForDateKey(target.dateKey);
    const fds = await collections.records
      .find({
        status: "active",
        maturityDate: { $gte: start, $lt: end },
        [target.flag]: { $ne: true },
      })
      .toArray();

    for (const fd of fds) {
      result.checked += 1;
      const { body, title } = buildAlertMessage(fd, target);
      const nowDate = new Date();
      const alertDocument: FdAlertDocument = {
        _id: new ObjectId(),
        userId: fd.userId,
        fdId: fd._id,
        milestone: target.milestone,
        title,
        body,
        readAt: null,
        sentAt: nowDate,
        pushStatus: "no_tokens",
      };

      try {
        await collections.alerts.insertOne(alertDocument);
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          result.duplicateSkipped += 1;
          await collections.records.updateOne(
            { _id: fd._id },
            { $set: { [target.flag]: true, updatedAt: nowDate } }
          );
          continue;
        }

        throw error;
      }

      const user = await collections.users.findOne({ userId: fd.userId });
      const push = await sendPushAlert({
        alertId: alertDocument._id,
        body,
        fdId: fd._id,
        milestone: target.milestone,
        title,
        tokens: user?.fcmTokens ?? [],
        userId: fd.userId,
      });

      await collections.alerts.updateOne(
        { _id: alertDocument._id },
        { $set: { pushStatus: push.status } }
      );
      await collections.records.updateOne(
        { _id: fd._id },
        { $set: { [target.flag]: true, updatedAt: nowDate } }
      );

      result.created += 1;
      if (push.status === "sent" || push.status === "partial") {
        result.pushed += 1;
      }
      result.invalidTokensRemoved += push.invalidTokens.length;
    }
  }

  return result;
}
