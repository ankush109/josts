import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import logger from "./logger.js";

const log = logger("s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a PDF buffer to the configured S3 bucket.
 *
 * @param {Buffer} buffer - PDF file contents.
 * @param {string} s3Key  - Destination object key within the bucket.
 * @returns {Promise<void>}
 */
export async function uploadPdfToS3(buffer, s3Key) {
  log.debug("uploading to S3", { s3Key, bytes: buffer.length });
  await s3.send(new PutObjectCommand({
    Bucket:      process.env.AWS_S3_BUCKET,
    Key:         s3Key,
    Body:        buffer,
    ContentType: "application/pdf",
  }));
  log.info("upload complete", { s3Key });
}
