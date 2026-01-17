import { PassThrough } from 'stream';
import { getDrive } from '../lib/googleDrive.js';

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

export const sanitizeFolderName = (input: string): string => {
  const replaced = (input || '').replace(/[\\/:*?"<>|]+/g, ' ');
  const collapsed = replaced.replace(/\s+/g, ' ').trim();
  const limited = collapsed.slice(0, 60);
  return limited || 'folder';
};

export const buildRfqFolderName = (rfqId: string, company: string, createdAt: Date): string => {
  const dateStr = createdAt.toISOString().slice(0, 10);
  const sanitizedCompany = sanitizeFolderName(company || 'company');
  const prefix = `RFQ_${rfqId}_`;
  const suffix = `_${dateStr}`;
  const maxCompanyLength = Math.max(1, 120 - (prefix.length + suffix.length));
  const finalCompany = sanitizedCompany.slice(0, maxCompanyLength);
  const full = `${prefix}${finalCompany}${suffix}`;
  return full.slice(0, 120);
};

export const ensureFolder = async (
  parentFolderId: string,
  folderName: string,
): Promise<{ id: string; name: string }> => {
  const drive = getDrive();
  const safeParent = parentFolderId.replace(/'/g, "\\'");
  const safeName = folderName.replace(/'/g, "\\'");

  const { data: listData } = await drive.files.list({
    q: `'${safeParent}' in parents and name='${safeName}' and trashed=false and mimeType='${DRIVE_FOLDER_MIME}'`,
    fields: 'files(id,name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    spaces: 'drive',
  });

  const existing = listData.files?.[0];
  if (existing?.id && existing.name) {
    return { id: existing.id, name: existing.name };
  }

  const { data: created } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [parentFolderId],
    },
    fields: 'id,name',
    supportsAllDrives: true,
  });

  if (!created.id || !created.name) {
    throw new Error('Failed to create Drive folder');
  }

  return { id: created.id, name: created.name };
};

const parseDataUrl = (dataUrl: string): { mimeType: string; buffer: Buffer } => {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const [, mime, base64] = match;
  return {
    mimeType: mime || 'application/octet-stream',
    buffer: Buffer.from(base64, 'base64'),
  };
};

export const uploadBase64FileToFolder = async (
  args: {
    folderId: string;
    fileName: string;
    dataUrl: string;
    mimeType?: string;
    makePublic?: boolean;
  },
): Promise<{ fileId: string; webViewLink: string; webContentLink?: string; name: string; size?: number }> => {
  const { folderId, fileName, dataUrl, mimeType: overrideMime, makePublic } = args;
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const finalMime = overrideMime || mimeType || 'application/octet-stream';
  const drive = getDrive();

  const stream = new PassThrough();
  stream.end(buffer);

  const { data } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: finalMime,
      body: stream,
    },
    fields: 'id,name,mimeType,size,webViewLink,webContentLink',
    supportsAllDrives: true,
  });

  if (!data.id) {
    throw new Error('Drive upload did not return file id');
  }

  const webViewLink =
    data.webViewLink || data.webContentLink || `https://drive.google.com/file/d/${data.id}/view`;

  if (makePublic) {
    try {
      await drive.permissions.create({
        fileId: data.id,
        requestBody: { role: 'reader', type: 'anyone', allowFileDiscovery: false },
        supportsAllDrives: true,
      });
    } catch (permissionError) {
      const driveErr = permissionError as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      console.error('[Drive permission failed]', {
        fileId: data.id,
        message:
          driveErr?.message ?? (permissionError instanceof Error ? permissionError.message : String(permissionError)),
        responseStatus: driveErr?.response?.status,
        responseData: driveErr?.response?.data,
      });
    }
  }

  return {
    fileId: data.id,
    webViewLink,
    webContentLink: data.webContentLink || undefined,
    name: data.name || fileName,
    size: data.size ? Number(data.size) : undefined,
  };
};

export const storeRfqAttachmentsToDrive = async (
  args: {
    rfqId: string;
    company: string;
    createdAt: Date;
    rootFolderId: string;
    attachments: Array<{ fileName: string; fileUrl: string; fileSize?: number }>;
    makePublic?: boolean;
  },
): Promise<{
  folderId: string;
  uploaded: Array<{ fileName: string; fileUrl: string; fileSize?: number; driveFileId: string }>;
}> => {
  const { rfqId, company, createdAt, rootFolderId, attachments, makePublic } = args;

  const folderName = buildRfqFolderName(rfqId, company, createdAt);
  if (!attachments.length) {
    return { folderId: rootFolderId, uploaded: [] };
  }

  const folder = await ensureFolder(rootFolderId, folderName);
  const uploaded: Array<{ fileName: string; fileUrl: string; fileSize?: number; driveFileId: string }> = [];

  for (const attachment of attachments) {
    const result = await uploadBase64FileToFolder({
      folderId: folder.id,
      fileName: attachment.fileName,
      dataUrl: attachment.fileUrl,
      makePublic,
    });

    uploaded.push({
      fileName: result.name,
      fileUrl: result.webViewLink,
      fileSize: attachment.fileSize ?? result.size,
      driveFileId: result.fileId,
    });
  }

  return {
    folderId: folder.id,
    uploaded,
  };
};
