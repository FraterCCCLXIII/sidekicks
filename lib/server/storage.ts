import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import { getStorageBucket, getStorageCredentials, getStorageEndpoint, getStorageRegion } from "@/lib/server/config";

type GlobalState = typeof globalThis & {
  __sidekicksStorageClient?: S3Client;
  __sidekicksStorageBucketPromise?: Promise<void>;
};

function getGlobalState() {
  return globalThis as GlobalState;
}

function getStorageClient() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksStorageClient) {
    globalState.__sidekicksStorageClient = new S3Client({
      region: getStorageRegion(),
      endpoint: getStorageEndpoint(),
      forcePathStyle: true,
      credentials: getStorageCredentials()
    });
  }

  return globalState.__sidekicksStorageClient;
}

export async function ensureArtifactBucket() {
  const globalState = getGlobalState();

  if (!globalState.__sidekicksStorageBucketPromise) {
    globalState.__sidekicksStorageBucketPromise = (async () => {
      const client = getStorageClient();
      const bucket = getStorageBucket();

      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
      }
    })();
  }

  await globalState.__sidekicksStorageBucketPromise;
}

export async function putArtifactObject(input: {
  key: string;
  body: string;
  contentType: string;
}) {
  await ensureArtifactBucket();

  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: getStorageBucket(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType
    })
  );
}

export async function getArtifactObject(key: string) {
  await ensureArtifactBucket();

  try {
    const result = await getStorageClient().send(
      new GetObjectCommand({
        Bucket: getStorageBucket(),
        Key: key
      })
    );

    return result;
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return null;
    }

    throw error;
  }
}
