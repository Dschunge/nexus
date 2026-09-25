"use client";

import { useEffect, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LinkFavicon } from "@/components/links/LinkFavicon";
import {
  LINK_CATEGORIES,
  LINK_CATEGORY_META,
  type LinkCategory,
} from "@/lib/links/categories";
import {
  faviconFallbackUrl,
  InvalidUrlError,
  normalizeUrl,
} from "@/lib/links/normalizeUrl";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface LinkFormValues {
  url: string;
  domain: string;
  title: string;
  description: string;
  category: LinkCategory;
  subCategory: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  /** Signed URL from the last fetch; absent when editing without a refetch. */
  screenshotUrl?: string | null;
  siteName: string | null;
  content?: string;
  fetchedAt?: Date | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** With an id the dialog edits an existing link; otherwise it adds one. */
  initial?: (LinkFormValues & { id?: string }) | null;
}

// Native <select> styled like components/ui/input.tsx: ten static options
// don't justify pulling in the shadcn select package.
const selectClass = cn(
  "border-input dark:bg-input/30 h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none md:text-sm",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
);

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-foreground/70">{label}</span>
      {children}
    </label>
  );
}

export function AddLinkDialog({ open, onOpenChange, initial }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial?.id);

  const [step, setStep] = useState<"url" | "form">("url");
  const [rawUrl, setRawUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [canAddManually, setCanAddManually] = useState(false);
  const [values, setValues] = useState<LinkFormValues | null>(null);

  // Prefill (edit / refetch) jumps straight to the form; a plain "add"
  // starts at the URL step. Everything resets when the dialog closes.
  useEffect(() => {
    if (!open) {
      setStep("url");
      setRawUrl("");
      setUrlError(null);
      setCanAddManually(false);
      setValues(null);
      return;
    }
    if (initial) {
      setValues(initial);
      setStep("form");
    }
  }, [open, initial]);

  const invalidateLinks = () =>
    queryClient.invalidateQueries(trpc.links.pathFilter());

  const preview = useMutation(
    trpc.links.preview.mutationOptions({
      onSuccess: (data) => {
        setValues({ ...data, fetchedAt: new Date() });
        setStep("form");
        if (!data.classified) {
          toast.warning("Fetched, but automatic classification failed");
        }
      },
      onError: (error) => {
        setUrlError(error.message);
        setCanAddManually(error.data?.code !== "CONFLICT");
      },
    })
  );

  const create = useMutation(
    trpc.links.create.mutationOptions({
      onSuccess: () => {
        invalidateLinks();
        toast.success("Link saved");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const update = useMutation(
    trpc.links.update.mutationOptions({
      onSuccess: () => {
        invalidateLinks();
        toast.success("Link updated");
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const handleFetch = () => {
    setUrlError(null);
    setCanAddManually(false);
    try {
      normalizeUrl(rawUrl);
    } catch (error) {
      if (error instanceof InvalidUrlError) {
        setUrlError(error.message);
        return;
      }
      throw error;
    }
    preview.mutate({ url: rawUrl });
  };

  const handleAddManually = () => {
    const { url, domain } = normalizeUrl(rawUrl);
    setValues({
      url,
      domain,
      title: domain,
      description: "",
      category: "OTHER",
      subCategory: null,
      faviconUrl: faviconFallbackUrl(domain),
      ogImageUrl: null,
      screenshotUrl: null,
      siteName: null,
      content: "",
      fetchedAt: null,
    });
    setStep("form");
  };

  const handleSave = () => {
    if (!values) return;
    const subCategory = values.subCategory?.trim() || null;
    if (isEdit && initial?.id) {
      update.mutate({
        id: initial.id,
        title: values.title,
        description: values.description,
        category: values.category,
        subCategory,
        faviconUrl: values.faviconUrl,
        ogImageUrl: values.ogImageUrl,
        // Only a refetch sets this; a plain edit leaves the stored one alone.
        screenshotUrl: values.screenshotUrl ?? undefined,
        siteName: values.siteName,
        content: values.content,
        fetchedAt: values.fetchedAt,
      });
    } else {
      create.mutate({ ...values, subCategory });
    }
  };

  const saving = create.isPending || update.isPending;
  const set = <K extends keyof LinkFormValues>(key: K, value: LinkFormValues[K]) =>
    setValues((v) => (v ? { ...v, [key]: value } : v));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit link" : "Add link"}</DialogTitle>
          <DialogDescription>
            {step === "url"
              ? "We fetch the page and let Claude suggest a title, description and category. You can edit everything before saving."
              : "Review the details, then save."}
          </DialogDescription>
        </DialogHeader>

        {step === "url" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleFetch();
            }}
          >
            <Field label="URL">
              <Input
                autoFocus
                type="text"
                inputMode="url"
                placeholder="https://github.com/vercel/next.js"
                value={rawUrl}
                onChange={(e) => setRawUrl(e.target.value)}
                aria-invalid={urlError ? true : undefined}
                disabled={preview.isPending}
              />
            </Field>
            {urlError && (
              <p className="text-xs text-destructive">{urlError}</p>
            )}
            <DialogFooter>
              {canAddManually && (
                <Button type="button" variant="outline" onClick={handleAddManually}>
                  Add manually
                </Button>
              )}
              <Button type="submit" disabled={preview.isPending || !rawUrl.trim()}>
                {preview.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                )}
                {preview.isPending ? "Fetching…" : "Fetch"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          values && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/30 p-2.5">
                {values.ogImageUrl || values.screenshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={values.ogImageUrl ?? values.screenshotUrl!}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-[54px] w-24 shrink-0 rounded object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                ) : null}
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <LinkFavicon src={values.faviconUrl} domain={values.domain} />
                  <span className="truncate">
                    {values.domain}
                    {values.siteName && values.siteName !== values.domain
                      ? ` · ${values.siteName}`
                      : ""}
                  </span>
                </div>
              </div>

              <Field label="Title">
                <Input
                  autoFocus
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  maxLength={200}
                  required
                />
              </Field>
              <Field label="Description">
                <Textarea
                  rows={3}
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={1000}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    className={selectClass}
                    value={values.category}
                    onChange={(e) => set("category", e.target.value as LinkCategory)}
                  >
                    {LINK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {LINK_CATEGORY_META[c].label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Sub-category">
                  <Input
                    value={values.subCategory ?? ""}
                    onChange={(e) => set("subCategory", e.target.value)}
                    placeholder="e.g. React library"
                    maxLength={60}
                  />
                </Field>
              </div>

              <DialogFooter>
                {!isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("url")}
                    disabled={saving}
                  >
                    Back
                  </Button>
                )}
                <Button type="submit" disabled={saving || !values.title.trim()}>
                  {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? "Save changes" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
