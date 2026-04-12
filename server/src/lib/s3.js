/**
 * @file s3.js
 * @description AWS S3 client and helper utilities.
 *
 * Centralising the S3 client here means credentials and region are
 * configured in a single place. Controllers / services import helpers
 * from here rather than constructing their own clients.
 */

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Shared S3 client. Reads credentials and region from environment variables:
 *   AWS_REGION, ACCESS_KEY, AWS_SECRET_KEY, AWS_S3_BUCKET
 */
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

/**
 * Generates a pre-signed GET URL for an S3 object.
 * The URL is valid for 1 hour and allows direct browser downloads.
 *
 * @param {string} key - S3 object key (file path within the bucket).
 * @returns {Promise<string>} Pre-signed URL string.
 * @throws Will throw if S3 returns an error (e.g. object not found).
 */
export async function getSignedDownloadUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key:    key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Generates a pre-signed GET URL that forces the browser to download the file.
 *
 * @param {string} key      - S3 object key.
 * @param {string} filename - The filename the browser will save as.
 * @returns {Promise<string>} Pre-signed URL string with attachment disposition.
 */
export async function getSignedDownloadUrlAttachment(key, filename) {
  const command = new GetObjectCommand({
    Bucket:                        process.env.AWS_S3_BUCKET,
    Key:                           key,
    ResponseContentDisposition:    `attachment; filename="${filename}"`,
    ResponseContentType:           "application/pdf",
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
