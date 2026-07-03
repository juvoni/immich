<script lang="ts">
  // Native asset-viewer single-add. The inbox write contract lives in the
  // edge-injected social-inbox-client.js (window.__plSocial); this component
  // owns only the asset-context read that drives the smart label/icon and the
  // Immich-native UI. See PlayaLensBulkSocialAction.svelte for the rationale.
  import MenuOption from '$lib/components/shared-components/context-menu/MenuOption.svelte';
  import type { AssetResponseDto } from '@immich/sdk';
  import { IconButton, toastManager } from '@immich/ui';
  import { mdiBookmarkPlusOutline, mdiOpenInNew } from '@mdi/js';

  interface Props {
    asset: AssetResponseDto;
    menuItem?: boolean;
  }

  interface SocialAssetContext {
    preferred_action: 'add_to_inbox' | 'open_inbox_item' | 'open_post';
    preferred_label: string;
    preferred_href: string;
  }

  interface PlSocialAddResult {
    ok: boolean;
    status: number;
    item: { id: string } | null;
    detail: string;
    networkError: boolean;
  }

  interface PlSocialClient {
    addOne: (assetId: string) => Promise<PlSocialAddResult>;
  }

  const client = (): PlSocialClient | undefined => (globalThis as { __plSocial?: PlSocialClient }).__plSocial;

  let { asset, menuItem = true }: Props = $props();
  let loading = $state(false);
  let context = $state<SocialAssetContext | null>(null);
  let contextAbort: AbortController | undefined;
  let text = $derived(
    loading
      ? 'Adding to Media Inbox...'
      : (context?.preferred_label ?? 'Add to Media Inbox').replaceAll('Social Inbox', 'Media Inbox'),
  );
  let icon = $derived(context?.preferred_action === 'add_to_inbox' ? mdiBookmarkPlusOutline : mdiOpenInNew);

  const loadContext = async (assetId: string) => {
    contextAbort?.abort();
    const controller = new AbortController();
    contextAbort = controller;

    try {
      const response = await fetch(`/social/api/assets/${encodeURIComponent(assetId)}/context`, {
        credentials: 'same-origin',
        signal: controller.signal,
      });

      if (!response.ok) {
        context = null;
        return;
      }

      context = (await response.json()) as SocialAssetContext;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      context = null;
      console.warn('[playa-lens-social-inbox-action]', error);
    }
  };

  $effect(() => {
    void loadContext(asset.id);
    return () => contextAbort?.abort();
  });

  const addToSocialInbox = async () => {
    if (loading) {
      return;
    }

    if (context && context.preferred_action !== 'add_to_inbox') {
      globalThis.location.assign(context.preferred_href);
      return;
    }

    const pl = client();
    if (!pl) {
      toastManager.danger('Social helper not loaded. Reload Immich.');
      return;
    }

    loading = true;
    try {
      const result = await pl.addOne(asset.id);

      if (result.networkError) {
        toastManager.danger('Network error reaching the planner.');
        return;
      }
      if (result.status === 401) {
        toastManager.danger('Sign in to Immich first.');
        return;
      }
      if (!result.ok || !result.item) {
        toastManager.danger(result.detail || `Unable to add asset to Media Inbox (${result.status}).`);
        return;
      }

      const href = `/social/inbox?status=active#inbox-item-${result.item.id}`;
      await loadContext(asset.id);

      toastManager.primary(
        {
          description: 'Added to Media Inbox',
          button: { label: 'Open Inbox Item', onclick: () => globalThis.location.assign(href) },
        },
        { timeout: 5000 },
      );
    } finally {
      loading = false;
    }
  };
</script>

{#if menuItem}
  <MenuOption {text} {icon} onClick={addToSocialInbox} />
{:else}
  <IconButton
    aria-label={text}
    title={text}
    color="secondary"
    variant="ghost"
    shape="round"
    {icon}
    {loading}
    onclick={addToSocialInbox}
  />
{/if}
