// Where finished files go. Every adapter returns a URL that changes when the bytes change,
// because a versionless URL once served a stale CDN copy for weeks.
import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";

export type Storage = { name: string; put(slug: string, name: string, data: Buffer, contentType: string): Promise<string> };
type Fetch = typeof fetch;

const sha = (data: Buffer, n = 12) => createHash("sha256").update(data).digest("hex").slice(0, n);

// Fail before any model call when credentials are missing.
export function makeStorage(kind: string, env = process.env, fetchFn: Fetch = fetch): Storage {
  if (kind === "local") return { name: "local", put: async () => "" };
  if (kind === "cloudinary") {
    const m = env.CLOUDINARY_URL?.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (!m) throw new Error("--storage cloudinary needs CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>");
    const [, key, secret, cloud] = m;
    return {
      name: "cloudinary",
      async put(slug, name, data, contentType) {
        // An explicit public_id prefix, because the `folder` param is ignored in dynamic folder mode.
        const params: Record<string, string> = {
          invalidate: "true",
          overwrite: "true",
          public_id: `hashflag/${slug}/${name}`,
          timestamp: String(Math.floor(Date.now() / 1000)),
        };
        const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
        const form = new FormData();
        for (const [k, v] of Object.entries(params)) form.set(k, v);
        form.set("api_key", key);
        form.set("signature", createHash("sha1").update(toSign + secret).digest("hex"));
        form.set("file", `data:${contentType};base64,${data.toString("base64")}`);
        const type = contentType.startsWith("image/") ? "image" : "video"; // Cloudinary files audio under video
        const res = await fetchFn(`https://api.cloudinary.com/v1_1/${cloud}/${type}/upload`, { method: "POST", body: form });
        const body: any = await res.json();
        if (!res.ok || !body.secure_url) throw new Error(`Cloudinary upload failed: HTTP ${res.status} ${JSON.stringify(body.error ?? body)}`);
        return body.secure_url; // includes /v<version>/
      },
    };
  }
  if (kind === "s3") {
    const need = ["S3_ENDPOINT", "S3_BUCKET", "S3_PUBLIC_BASE_URL", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
    const missing = need.filter((k) => !env[k]);
    if (missing.length) throw new Error(`--storage s3 needs ${missing.join(", ")}`);
    const aws = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      region: env.S3_REGION || "auto",
      service: "s3",
    });
    return {
      name: "s3",
      async put(slug, name, data, contentType) {
        // The key carries a content hash, so a re-render is a new URL and nothing needs purging.
        const key = `${slug}/${name}-${sha(data)}.${contentType.split("/")[1]}`;
        const req = await aws.sign(`${env.S3_ENDPOINT!.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`, {
          method: "PUT",
          body: data,
          headers: { "content-type": contentType, "cache-control": "public, max-age=31536000, immutable" },
        });
        const res = await fetchFn(req);
        if (!res.ok) throw new Error(`S3 upload failed: HTTP ${res.status} ${await res.text()}`);
        return `${env.S3_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`;
      },
    };
  }
  throw new Error(`Unknown --storage ${kind}. Use local, cloudinary or s3.`);
}

export { sha };
