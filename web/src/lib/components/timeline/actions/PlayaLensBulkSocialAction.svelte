<script lang="ts">
  // Thin native shell for the Playa Lens social inbox.
  //
  // The inbox API contract (endpoints, payload, source tag, summary text,
  // deep links) lives in the edge-injected social-inbox-client.js, exposed
  // same-origin as window.__plSocial. This component only: reads the current
  // multi-selection, delegates to that client, renders Immich-native UI, and
  // clears the selection. Keeping the contract out of the fork means changing
  // it never requires rebuilding/republishing the GHCR fork image.
  import MenuOption from '$lib/components/shared-components/context-menu/MenuOption.svelte';
  import { assetMultiSelectManager } from '$lib/managers/asset-multi-select-manager.svelte';
  import { IconButton, toastManager } from '@immich/ui';
  import { mdiBookmarkPlusOutline, mdiPencilBoxMultipleOutline, mdiTimerSand } from '@mdi/js';

  interface Props {
    menuItem?: boolean;
  }

  let { menuItem = false }: Props = $props();

  interface PlSocialResult {
    ok: boolean;
    status: number;
    created: number;
    reused: number;
    errors: number;
    detail: string;
    networkError: boolean;
  }

  interface PlSocialClient {
    SOCIAL_INBOX: string;
    addBatch: (assetIds: string[]) => Promise<PlSocialResult>;
    summarize: (result: PlSocialResult) => string;
    composeUrl: (assetIds: string[]) => string;
  }

  let inboxLoading = $state(false);
  let composeLoading = $state(false);

  const inboxText = $derived(inboxLoading ? 'Adding to Social Inbox…' : 'Add to Social Inbox');
  const composeText = $derived(composeLoading ? 'Opening composer…' : 'Compose post from selection');

  // Full visible selection — never `ownedAssets`. Partner-shared archive
  // assets are valid catalog inbox assets; the catalog service enforces
  // planner auth and per-user inbox ownership. See LEARNINGS.md 2026-05-17
  // "Do Not Use Immich Ownership As Social Planner Eligibility".
  const selectedAssetIds = () => assetMultiSelectManager.assets.map((asset) => asset.id);

  const client = (): PlSocialClient | undefined => (globalThis as { __plSocial?: PlSocialClient }).__plSocial;

  const addSelectionToInbox = async () => {
    if (inboxLoading) {
      return;
    }
    const assetIds = selectedAssetIds();
    if (assetIds.length === 0) {
      return;
    }
    const pl = client();
    if (!pl) {
      toastManager.danger('Social helper not loaded. Reload Immich.');
      return;
    }

    inboxLoading = true;
    try {
      const result = await pl.addBatch(assetIds);

      if (result.networkError) {
        toastManager.danger('Network error reaching the planner.');
        return;
      }
      if (result.status === 401) {
        toastManager.danger('Sign in to Immich first.');
        return;
      }
      if (!result.ok) {
        toastManager.danger(result.detail || `Unable to add selection to Social Inbox (${result.status}).`);
        return;
      }

      toastManager.primary(
        {
          description: pl.summarize(result),
          button: {
            label: 'Open Inbox',
            onclick: () => globalThis.location.assign(pl.SOCIAL_INBOX),
          },
        },
        { timeout: 5000 },
      );

      if (result.created > 0 || result.reused > 0) {
        assetMultiSelectManager.clear();
      }
    } finally {
      inboxLoading = false;
    }
  };

  const composeFromSelection = () => {
    if (composeLoading) {
      return;
    }
    const assetIds = selectedAssetIds();
    if (assetIds.length === 0) {
      return;
    }
    const pl = client();
    if (!pl) {
      toastManager.danger('Social helper not loaded. Reload Immich.');
      return;
    }
    composeLoading = true;
    globalThis.location.assign(pl.composeUrl(assetIds));
  };
</script>

{#if menuItem}
  <MenuOption text={inboxText} icon={mdiBookmarkPlusOutline} onClick={addSelectionToInbox} />
  <MenuOption text={composeText} icon={mdiPencilBoxMultipleOutline} onClick={composeFromSelection} />
{/if}

{#if !menuItem}
  {#if inboxLoading}
    <IconButton
      shape="round"
      color="secondary"
      variant="ghost"
      aria-label="Adding to Social Inbox"
      icon={mdiTimerSand}
      onclick={() => {}}
    />
  {:else}
    <IconButton
      shape="round"
      color="secondary"
      variant="ghost"
      aria-label={inboxText}
      icon={mdiBookmarkPlusOutline}
      onclick={addSelectionToInbox}
    />
  {/if}
{/if}
