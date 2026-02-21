import { router } from "./init";
import { notesRouter } from "./routers/notes";
import { foldersRouter } from "./routers/folders";
import { tagsRouter } from "./routers/tags";
import { aiRouter } from "./routers/ai";

export const appRouter = router({
  notes: notesRouter,
  folders: foldersRouter,
  tags: tagsRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
