"use client";

import { useActionState } from "react";
import { createHelpArticle, updateHelpArticle, type HelpArticleFormState } from "../actions";
import { HELP_CATEGORIES } from "@/lib/help";

const inputClass = "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm";

export function ArticleForm({
  article,
}: {
  article?: {
    id: string;
    slug: string;
    title: string;
    category: string;
    summary: string | null;
    body: string;
    order: number;
  };
}) {
  const [state, action, pending] = useActionState<HelpArticleFormState, FormData>(
    article ? updateHelpArticle : createHelpArticle,
    undefined,
  );

  return (
    <form action={action} className="space-y-4 rounded-md border border-neutral-200 bg-white p-4">
      {article && <input type="hidden" name="id" value={article.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Title</label>
          <input name="title" required defaultValue={article?.title} className={`${inputClass} mt-1`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Slug (URL)</label>
          <input
            name="slug"
            required
            defaultValue={article?.slug}
            placeholder="e.g. creating-an-asset"
            className={`${inputClass} mt-1 font-mono`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Category</label>
          <select name="category" required defaultValue={article?.category ?? HELP_CATEGORIES[0].slug} className={`${inputClass} mt-1`}>
            {HELP_CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600">Sort order (lower shows first)</label>
          <input name="order" type="number" defaultValue={article?.order ?? 0} className={`${inputClass} mt-1`} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600">Summary (shown in lists and search results)</label>
        <input name="summary" defaultValue={article?.summary ?? ""} className={`${inputClass} mt-1`} />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600">Body (Markdown)</label>
        <textarea
          name="body"
          required
          rows={20}
          defaultValue={article?.body}
          className={`${inputClass} mt-1 font-mono`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : article ? "Save changes" : "Create article"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
