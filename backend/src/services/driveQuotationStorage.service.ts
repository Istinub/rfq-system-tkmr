import { PassThrough } from 'stream';
import { getDrive } from '../lib/googleDrive.js';
import { buildRfqFolderName, ensureFolder } from './driveRfqStorage.service.js';

const PDF_MIME = 'application/pdf';

export const ensureQuotationsRfqFolder = async (args: {
  quotationsRootFolderId: string;
  rfqPublicId: string;
  rfqCompany: string;
}): Promise<{ id: string; name: string }> => {
  const { quotationsRootFolderId, rfqPublicId, rfqCompany } = args;
  const folderName = buildRfqFolderName(rfqCompany, new Date(), rfqPublicId);
  return ensureFolder(quotationsRootFolderId, folderName);
};

export const uploadPdfBufferToFolder = async (args: {
  folderId: string;
  fileName: string;
  pdfBuffer: Buffer;
  makePublic?: boolean;
}): Promise<{ driveFileId: string; fileUrl: string; fileName: string; fileSize?: number }> => {
  const { folderId, fileName, pdfBuffer, makePublic } = args;
  const drive = getDrive();

  const stream = new PassThrough();
  stream.end(pdfBuffer);

  const { data } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: PDF_MIME,
      body: stream,
    },
    fields: 'id,name,size,webViewLink,webContentLink',
    supportsAllDrives: true,
  });

  if (!data.id) {
    throw new Error('Drive upload did not return file id');
  }

  const fileUrl = data.webViewLink || data.webContentLink || `https://drive.google.com/file/d/${data.id}/view`;

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
    driveFileId: data.id,
    fileUrl,
    fileName: data.name || fileName,
    fileSize: data.size ? Number(data.size) : pdfBuffer.byteLength,
  };
};
