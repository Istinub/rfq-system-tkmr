import { PassThrough } from 'stream';
import { getDrive, getDriveQuotationsFolderId } from '../lib/googleDrive.js';
import { ensureFolder, sanitizeFolderName } from './driveRfqStorage.service.js';

const PDF_MIME = 'application/pdf';

export const buildQuotationFolderName = (publicId: string, vendorName: string): string => {
  const sanitizedVendor = sanitizeFolderName(vendorName || 'vendor');
  const displayId = publicId.trim() || 'RFQ';
  return `${displayId}__${sanitizedVendor}`.slice(0, 120);
};

const formatTimestamp = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}${month}${day}-${hours}${minutes}`;
};

export const ensureQuotationsRfqFolder = async (args: {
  rfqPublicId: string;
  vendorName: string;
  quotationsRootFolderId?: string;
}): Promise<{ id: string; name: string }> => {
  const { rfqPublicId, vendorName, quotationsRootFolderId } = args;
  const rootFolderId = quotationsRootFolderId || getDriveQuotationsFolderId();
  const folderName = buildQuotationFolderName(rfqPublicId, vendorName);
  return ensureFolder(rootFolderId, folderName);
};

export const uploadPdfBufferToFolder = async (args: {
  folderId: string;
  fileName: string;
  pdfBuffer: Buffer;
  makePublic?: boolean;
}): Promise<{ driveFileId: string; webViewLink: string; fileName: string; size?: number }> => {
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

  const webViewLink = data.webViewLink || data.webContentLink || `https://drive.google.com/file/d/${data.id}/view`;

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
    webViewLink,
    fileName: data.name || fileName,
    size: data.size ? Number(data.size) : pdfBuffer.byteLength,
  };
};

export const storeQuotationPdfToDrive = async (args: {
  publicId: string;
  vendorName: string;
  pdfBuffer: Buffer;
}): Promise<{ folderId: string; driveFileId: string; fileName: string; webViewLink: string; size?: number }> => {
  const { publicId, vendorName, pdfBuffer } = args;
  const rootFolderId = getDriveQuotationsFolderId();
  const folderName = buildQuotationFolderName(publicId, vendorName);
  const folder = await ensureFolder(rootFolderId, folderName);
  const fileName = `Quotation_${formatTimestamp(new Date())}.pdf`;
  const makePublic = process.env.DRIVE_PUBLIC_FILES === 'true';

  const uploadResult = await uploadPdfBufferToFolder({
    folderId: folder.id,
    fileName,
    pdfBuffer,
    makePublic,
  });

  return {
    folderId: folder.id,
    driveFileId: uploadResult.driveFileId,
    fileName: uploadResult.fileName,
    webViewLink: uploadResult.webViewLink,
    size: uploadResult.size,
  };
};
