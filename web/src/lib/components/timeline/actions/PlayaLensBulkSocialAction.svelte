<script lang="ts">
  import MenuOption from '$lib/components/shared-components/context-menu/menu-option.svelte';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import { toastManager } from '@immich/ui';
  import { mdiBookmarkPlusOutline, mdiPencilBoxMultipleOutline } from '@mdi/js';
  import { SvelteURLSearchParams } from 'svelte/reactivity';

  interface Props {
    menuItem?: boolean;
  }

  let { menuItem = false }: Props = $props();

  interface BatchResult {
    created_count: number;
    reused_count: number;
    error_count: number;
  }

  let inboxLoading = $state(false);
  let composeLoading = $state(false);

  const inboxText = $derived(inboxLoading ? 'Adding to Social Inbox…' : 'Add to Social Inbox');
  const composeText = $derived(composeLoading ? 'Opening composer…' : 'Compose post from selection');

  const addSelectionToInbox = async () => {
    if (inboxLoading) {
      return;
    }
    const assetIds = assetMultiSelectManager.ownedAssets.map((asset) => asset.id);
    if (assetIds.length === 0) {
      return;
    }

    inboxLoading = true;
    try {
      const response = await fetch('/social/api/inbox-items/batch', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: assetIds.map((assetId) => ({ asset_id: assetId, source: 'immich_menu' })),
        }),
      });

      if (response.status === 401) {
        toastManager.danger('Sign in to Immich first.');
        return;
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Unable to add selection to Social Inbox (${response.status}).`);
      }

      const result = (await response.json()) as BatchResult;
      const created = result.created_count ?? 0;
      const reused = result.reused_count ?? 0;
      const errors = result.error_count ?? 0;
      const parts: string[] = [];
      if (created > 0) {
        parts.push(`${created} added`);
      }
      if (reused > 0) {
        parts.push(`${reused} already in inbox`);
      }
      if (errors > 0) {
        parts.push(`${errors} failed`);
      }
      const description = parts.length === 0 ? 'No changes' : parts.join(' · ');

      toastManager.primary(
        {
          description,
          button: {
            label: 'Open Inbox',
            onclick: () => globalThis.location.assign('/social/inbox?status=active'),
          },
        },
        { timeout: 5000 },
      );

      if (created > 0 || reused > 0) {
        assetMultiSelectManager.clear();
      }
    } catch (error) {
      handleError(error, 'Unable to add selection to Social Inbox.');
    } finally {
      inboxLoading = false;
    }
  };

  const composeFromSelection = () => {
    if (composeLoading) {
      return;
    }
    const assetIds = assetMultiSelectManager.ownedAssets.map((asset) => asset.id);
    if (assetIds.length === 0) {
      return;
    }
    composeLoading = true;
    const [primary, ...alternates] = assetIds;
    const params = new SvelteURLSearchParams({ asset: primary });
    for (const alt of alternates) {
      params.append('alt', alt);
    }
    globalThis.location.assign(`/social/posts/new?${params}`);
  };
</script>

{#if menuItem}
  <MenuOption text={inboxText} icon={mdiBookmarkPlusOutline} onClick={addSelectionToInbox} />
  <MenuOption text={composeText} icon={mdiPencilBoxMultipleOutline} onClick={composeFromSelection} />
{/if}
