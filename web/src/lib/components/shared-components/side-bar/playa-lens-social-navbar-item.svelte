<script lang="ts">
  import { Route } from '$lib/route';
  import { Icon, Link } from '@immich/ui';
  import { mdiShareVariantOutline } from '@mdi/js';
  import { onDestroy, onMount } from 'svelte';

  interface SocialSummary {
    inbox_active?: number;
    posts_draft?: number;
    posts_in_review?: number;
    posts_approved?: number;
    posts_scheduled?: number;
    posts_scheduled_this_week?: number;
  }

  const POLL_INTERVAL_MS = 60_000;

  let summary = $state<SocialSummary | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;
  let abort: AbortController | undefined;

  const inboxActive = $derived(summary?.inbox_active ?? 0);
  const inReview = $derived(summary?.posts_in_review ?? 0);
  const showInbox = $derived(inboxActive > 0);
  const showReview = $derived(inReview > 0);
  const inboxLabel = $derived(inboxActive > 99 ? '99+' : String(inboxActive));
  const inboxTitle = $derived(`${inboxActive} inbox candidate${inboxActive === 1 ? '' : 's'}`);
  const reviewLabel = $derived(`${inReview} post${inReview === 1 ? '' : 's'} in review`);
  const badgeAria = $derived.by(() => {
    const parts: string[] = [];
    if (showInbox) {
      parts.push(inboxTitle);
    }
    if (showReview) {
      parts.push(reviewLabel);
    }
    return parts.join(', ');
  });

  const loadSummary = async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    abort?.abort();
    abort = new AbortController();
    try {
      const response = await fetch('/social/api/summary', {
        credentials: 'same-origin',
        signal: abort.signal,
      });
      if (!response.ok) {
        return;
      }
      summary = (await response.json()) as SocialSummary;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.warn('[playa-lens-social-navbar-item]', error);
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void loadSummary();
    }
  };

  onMount(() => {
    void loadSummary();
    timer = setInterval(() => void loadSummary(), POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onDestroy(() => {
    if (timer) {
      clearInterval(timer);
    }
    abort?.abort();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  });
</script>

<div>
  <div class="relative flex items-center">
    <Link
      href={Route.playaLensSocialPosts()}
      data-sveltekit-reload
      underline={false}
      class="hover:bg-subtle hover:text-primary flex w-full place-items-center gap-4 rounded-e-full ps-5 py-3 transition-[padding] delay-100 duration-100"
    >
      <div class="relative flex w-full place-items-center gap-4">
        <Icon icon={mdiShareVariantOutline} size="1.375em" class="shrink-0" aria-hidden={true} />
        <span class="truncate text-sm font-medium">Social</span>
        {#if showInbox || showReview}
          <span class="ms-auto flex items-center gap-1 pe-3" aria-label={badgeAria}>
            {#if showInbox}
              <span
                class="rounded-full bg-primary text-light text-[11px] font-semibold leading-none px-2 py-1"
                title={inboxTitle}
              >
                {inboxLabel}
              </span>
            {/if}
            {#if showReview}
              <span class="w-2 h-2 rounded-full bg-danger" title={reviewLabel} aria-hidden={true}></span>
            {/if}
          </span>
        {/if}
      </div>
    </Link>
  </div>
</div>
