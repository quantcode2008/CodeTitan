import { z } from "zod";

export const BrandSourceTypeSchema = z.enum([
  "guideline",
  "fact",
  "claim_policy",
  "terminology",
  "tone_example",
  "asset_rule",
]);

export const BrandSourceStatusSchema = z.enum(["active", "archived"]);

export const BrandTermKindSchema = z.enum([
  "prohibited",
  "preferred",
  "required_phrase",
]);

export const SeverityLevelSchema = z.enum([
  "critical",
  "major",
  "minor",
  "advisory",
]);

export const CreateBrandSourceSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters long"),
  body: z.string().trim().min(10, "Guideline body must contain substantive guidance"),
  type: BrandSourceTypeSchema,
  review_by: z.string().nullable().optional(),
  tags: z.array(z.string().trim()).default([]),
  owner_id: z.string().uuid().nullable().optional(),
});

export const UpdateBrandSourceSchema = z.object({
  id: z.string().uuid("Valid source UUID required"),
  title: z.string().trim().min(3, "Title must be at least 3 characters long"),
  body: z.string().trim().min(10, "Guideline body must contain substantive guidance"),
  type: BrandSourceTypeSchema,
  review_by: z.string().nullable().optional(),
  tags: z.array(z.string().trim()).default([]),
  status: BrandSourceStatusSchema.default("active"),
  change_note: z
    .string()
    .trim()
    .min(3, "Change note is required to explain the policy update rationale"),
});

export const CreateBrandTermSchema = z.object({
  term: z.string().trim().min(1, "Term cannot be empty"),
  kind: BrandTermKindSchema,
  replacement: z.string().trim().nullable().optional(),
  severity: SeverityLevelSchema.default("major"),
  source_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const UpdateBrandTermSchema = CreateBrandTermSchema.extend({
  id: z.string().uuid("Valid term UUID required"),
});

export const CreateBrandFactSchema = z.object({
  key: z.string().trim().min(2, "Fact key or name is required"),
  value: z.string().trim().min(1, "Fact value is required"),
  unit: z.string().trim().nullable().optional(),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  source_id: z.string().uuid().nullable().optional(),
});

export const UpdateBrandFactSchema = CreateBrandFactSchema.extend({
  id: z.string().uuid("Valid fact UUID required"),
});

export const CreateBrandAssetSchema = z.object({
  name: z.string().trim().min(2, "Asset name is required"),
  storage_path: z.string().trim().min(1, "Storage path is required"),
  alt_text_required: z.boolean().default(true),
  usage_rule: z.string().trim().min(3, "Usage rule is required"),
  source_id: z.string().uuid().nullable().optional(),
});

export const BatchImportItemSchema = z.object({
  title: z.string().trim().min(2),
  body: z.string().trim().min(5),
  type: BrandSourceTypeSchema,
  tags: z.array(z.string()).default([]),
  review_by: z.string().nullable().optional(),
});

export const BatchImportSchema = z.object({
  sources: z.array(BatchImportItemSchema).min(1, "At least one source must be imported"),
});

