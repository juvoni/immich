<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import type { AssetResponseDto } from '@immich/sdk';
  import { toastManager } from '@immich/ui';
  import { mdiOpenInNew, mdiPlusBoxOutline } from '@mdi/js';

  interface Props {
    asset: AssetResponseDto;
  }

  interface SocialAssetContext {
    preferred_action: 'add_to_inbox' | 'open_inbox_item' | 'open_post';
    preferred_label: string;
    preferred_href: string;
  }

  interface InboxItem {
    id: string;
  }

  let { asset }: Props = $props();
  let loading = $state(false);
  let context = $state<SocialAssetContext | null>(null);
  let contextAbort: AbortController | undefined;
  let text = $derived(loading ? 'Adding to Social Inbox...' : (context?.preferred_label ?? 'Add to Social Inbox'));
  let icon = $derived(context?.preferred_action === 'add_to_inbox' ? mdiPlusBoxOutline : mdiOpenInNew);

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

    loading = true;

    try {
      const response = await fetch('/social/api/inbox-items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ asset_id: asset.id, source: 'immich_menu' }),
      });

      if (response.status === 401) {
        toastManager.danger('Sign in to Immich first.');
        return;
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Unable to add asset to Social Inbox (${response.status})`);
      }

      const item = (await response.json()) as InboxItem;
      const href = `/social/inbox?status=active#inbox-item-${item.id}`;
      await loadContext(asset.id);

      toastManager.primary(
        {
          description: 'Added to Social Inbox',
          button: { label: 'Open Inbox Item', onclick: () => globalThis.location.assign(href) },
        },
        { timeout: 5000 },
      );
    } catch (error) {
      handleError(error, 'Unable to add asset to Social Inbox.');
    } finally {
      loading = false;
    }
  };
</script>

<MenuOption {text} {icon} onClick={addToSocialInbox} />
