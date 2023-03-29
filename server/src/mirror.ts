import { Upload } from "@aws-sdk/lib-storage";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { AdaptiveRetryStrategy } from '@aws-sdk/middleware-retry';
import { https } from 'follow-redirects';
import { extname } from "path";

export class Mirror {
    s3: S3Client;
    mirrorBucketName: string;
    domain: string;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION as string,
            retryStrategy: new AdaptiveRetryStrategy(() => Promise.resolve(10), {
                
            })
        });
        this.mirrorBucketName = process.env.MIRROR_BUCKET_NAME as string;
        this.domain = process.env.DOMAIN as string;
    }

    rehostAnimePoster(id: number, url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const path = (new URL(url)).pathname;
            const extension = extname(path);
            https.get(url, async response => {
                try {
                    const key = `mirrored/anime/posters/${id}${extension}`;
                    const uploader = new Upload({
                        client: this.s3,
                        params: {
                            Bucket: this.mirrorBucketName,
                            Key: key,
                            Body: response,
                        },
                    });
                    await uploader.done();
                    const rehostedUrl = `https://${this.domain}/${key}`;
                    resolve(rehostedUrl);
                } catch (ex) {
                    reject(ex);
                }
            });
        });
    }

    async getAnimePosterUrl(id: number): Promise<string | null> {
        const response = await this.s3.send(new ListObjectsV2Command({
            Bucket: this.mirrorBucketName,
            Prefix: `mirrored/anime/posters/${id}.`,
        }));
        const objects = response.Contents;
        if(!objects) {
            return null;
        }
        objects.sort((a, b) => (b.LastModified?.valueOf() ?? 0) - (a.LastModified?.valueOf() ?? 0));
        const key = objects[0].Key;
        const rehostedUrl = `https://${this.domain}/${key}`;
        return rehostedUrl;
    }
}