export type SubmissionContext =
  | { type: 'ADMIN' }
  | { type: 'TOKEN'; tokenId: string };

declare global {
  namespace Express {
    interface Request {
      submission?: SubmissionContext;
    }
  }
}

export {};
