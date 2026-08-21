import "server-only";
import { randomBytes } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET!;
const prefix = process.env.S3_PREFIX ?? "chemistry";

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export function buildAttachmentKey(workOrderId: string, filename: string) {
  const unique = randomBytes(8).toString("hex");
  return `${prefix}/work-orders/${workOrderId}/${unique}-${sanitizeFilename(filename)}`;
}

export function buildAssetTypeDocumentKey(assetTypeId: string, filename: string) {
  const unique = randomBytes(8).toString("hex");
  return `${prefix}/asset-types/${assetTypeId}/${unique}-${sanitizeFilename(filename)}`;
}

export function buildAvatarKey(userId: string, filename: string) {
  const unique = randomBytes(8).toString("hex");
  return `${prefix}/avatars/${userId}/${unique}-${sanitizeFilename(filename)}`;
}

export async function uploadAttachment(key: string, body: Buffer, contentType: string) {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

export async function deleteAttachmentObject(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function getAttachmentUrl(key: string) {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
}
