import * as tus from "tus-js-client";

/**
 * Upload resumável (protocolo TUS) direto para o Supabase Storage.
 * Robusto para arquivos grandes (vídeos): envia em pedaços e retoma se cair.
 * Roda no navegador (precisa do access_token do usuário autenticado).
 */
export function uploadResumable(opts: {
  file: File;
  key: string;
  token: string;
  onProgress?: (pct: number) => void;
}): Promise<void> {
  const { file, key, token, onProgress } = opts;
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "media",
        objectName: key,
        contentType: file.type,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // 6MB — exigido pelo Supabase
      onError: (err) => reject(err),
      onProgress: (sent, total) =>
        onProgress?.(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });

    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}
