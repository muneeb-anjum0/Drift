import { useMemo, useState } from 'react';
import type { Requirement } from './requirement.types';

type Facet = { key: string; label: string; matches: (item: Requirement) => boolean };

const label = (value: string) => value.replace(/_/g, ' ');

export const useScopeSearch = (requirements: Requirement[]) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const facets = useMemo(() => {
    const all: Facet[] = [];
    for (const field of ['type', 'priority', 'status', 'source'] as const) {
      for (const value of new Set(requirements.map((item) => item[field]))) {
        all.push({ key: `${field}:${value}`, label: label(value), matches: (item) => item[field] === value });
      }
    }
    for (const value of new Set(requirements.flatMap((item) => item.tags ?? []).map((tag) => tag.trim()).filter(Boolean))) {
      all.push({ key: `tag:${value.toLowerCase()}`, label: value, matches: (item) => (item.tags ?? []).some((tag) => tag.toLowerCase() === value.toLowerCase()) });
    }
    return all.sort((a, b) => a.label.localeCompare(b.label));
  }, [requirements]);
  const filtered = requirements.filter((item) => {
    const textMatches = `${item.title} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase());
    return textMatches && selected.every((key) => facets.find((facet) => facet.key === key)?.matches(item));
  });
  return { query, setQuery, selected, setSelected, facets, filtered };
};

export const ScopeSearch = ({ search }: { search: ReturnType<typeof useScopeSearch> }) => {
  const [open, setOpen] = useState(false);
  const visible = search.facets.filter((facet) => facet.label.toLowerCase().includes(search.query.trim().toLowerCase()));
  const toggle = (key: string) => search.setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const chooseTag = (key: string) => { toggle(key); search.setQuery(''); setOpen(false); };

  return <div className="relative">
    <label htmlFor="scope-search" className="block text-sm font-medium">Search scope</label>
    <input id="scope-search" className="mt-2 block h-11 w-full rounded-lg border border-[var(--v-border)] bg-white px-3 font-normal" value={search.query} onChange={(event) => { search.setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }} placeholder="Search title or description, or choose a tag" autoComplete="off" aria-expanded={open} aria-controls="scope-tag-options" />
    {search.selected.length ? <div className="mt-2 flex flex-wrap items-center gap-2">{search.selected.map((key) => <button key={key} type="button" className="v-pill text-xs" onClick={() => toggle(key)} aria-label={`Remove ${search.facets.find((facet) => facet.key === key)?.label ?? key} filter`}>{search.facets.find((facet) => facet.key === key)?.label ?? key} ×</button>)}<button type="button" className="v-link text-xs" onClick={() => search.setSelected([])}>Clear filters</button></div> : null}
    {open ? <div id="scope-tag-options" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--v-border)] bg-white p-2 shadow-lg" onMouseDown={(event) => event.preventDefault()}><p className="px-2 py-1 text-xs text-[var(--v-muted)]">Filter by existing tags and labels</p>{visible.length ? visible.map((facet) => <button key={facet.key} type="button" className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--v-accent-soft)]" onClick={() => chooseTag(facet.key)} aria-pressed={search.selected.includes(facet.key)}><span>{facet.label}</span><span className="text-[var(--v-accent)]">{search.selected.includes(facet.key) ? '✓' : ''}</span></button>) : <p className="px-2 py-2 text-sm text-[var(--v-muted)]">No matching tags. You can still search titles and descriptions.</p>}</div> : null}
  </div>;
};
