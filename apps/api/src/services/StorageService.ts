import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.S3_REGION || 'eu-west-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is not set');
  }
  return bucket;
}

export class StorageService {
  /**
   * Upload an icon (base64 encoded) to S3
   */
  static async uploadIcon(iconBase64: string, bundleId: string): Promise<string> {
    const client = getS3Client();
    const bucket = getBucket();

    // Remove data URL prefix if present
    const base64Data = iconBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const key = `icons/${bundleId}/icon.png`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/png',
        CacheControl: 'max-age=31536000', // Cache for 1 year
      })
    );

    console.log(`Icon uploaded to S3: ${key}`);
    return key;
  }

  /**
   * Upload build artifacts (zip file) to S3
   */
  static async uploadBuildArtifact(
    filePath: string,
    buildId: string,
    platform: 'ios' | 'android'
  ): Promise<string> {
    const client = getS3Client();
    const bucket = getBucket();

    const fs = await import('fs');
    const fileStream = fs.createReadStream(filePath);

    const extension = platform === 'ios' ? 'ipa' : 'apk';
    const key = `builds/${buildId}/app.${extension}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileStream,
        ContentType: platform === 'ios' ? 'application/octet-stream' : 'application/vnd.android.package-archive',
      })
    );

    console.log(`Build artifact uploaded to S3: ${key}`);
    return key;
  }

  /**
   * Get a signed download URL for an artifact
   */
  static async getSignedDownloadUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
    const client = getS3Client();
    const bucket = getBucket();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });

    return url;
  }

  /**
   * Get a signed upload URL for direct browser upload
   */
  static async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const client = getS3Client();
    const bucket = getBucket();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });

    return url;
  }

  /**
   * Delete an object from S3
   */
  static async deleteObject(key: string): Promise<void> {
    const client = getS3Client();
    const bucket = getBucket();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    console.log(`Object deleted from S3: ${key}`);
  }

  /**
   * Get the icon data as a buffer
   */
  static async getIcon(key: string): Promise<Buffer> {
    const client = getS3Client();
    const bucket = getBucket();

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error('Icon not found');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}
