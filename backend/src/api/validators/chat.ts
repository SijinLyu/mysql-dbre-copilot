import { z } from 'zod';

export const chatMessageSchema = z.object({
  sessionId: z.string().min(1),
  connectionId: z.string().min(1),
  message: z.string().min(1).max(5000),
  database: z.string().min(1),
});

export const connectionSchema = z.object({
  id: z.string().min(1).max(50),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(3306),
  user: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
});

export const favoriteSchema = z.object({
  name: z.string().min(1).max(200),
  sql: z.string().min(1),
  description: z.string().optional(),
  connectionId: z.string().min(1),
  database: z.string().min(1),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ConnectionInput = z.infer<typeof connectionSchema>;
export type FavoriteInput = z.infer<typeof favoriteSchema>;
