import { router } from "./init";
import { notesRouter } from "./routers/notes";
import { foldersRouter } from "./routers/folders";
import { tagsRouter } from "./routers/tags";
import { aiRouter } from "./routers/ai";
import { linksRouter } from "./routers/links";

export const appRouter = router({
  notes: notesRouter,
  folders: foldersRouter,
  tags: tagsRouter,
  ai: aiRouter,
  links: linksRouter,
});

export type AppRouter = typeof appRouter;
