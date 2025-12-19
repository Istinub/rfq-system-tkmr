import { z } from "zod";
import { RFQSchema } from "./rfq.schema";
import { SecureLinkSchema } from "./secureLink.schema";

export const CreateRFQResponseSchema = z.object({
  rfq: RFQSchema,
  secureLink: SecureLinkSchema.optional(),
});

export type CreateRFQResponse = z.infer<typeof CreateRFQResponseSchema>;
