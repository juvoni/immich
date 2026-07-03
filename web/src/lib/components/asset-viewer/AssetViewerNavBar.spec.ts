import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/svelte';
import { getResizeObserverMock } from '$lib/__mocks__/resize-observer.mock';
import { authManager } from '$lib/managers/auth-manager.svelte';
import { renderWithTooltips } from '$tests/helpers';
import { assetFactory } from '@test-data/factories/asset-factory';
import { preferencesFactory } from '@test-data/factories/preferences-factory';
import { userAdminFactory } from '@test-data/factories/user-factory';
import AssetViewerNavBar from './AssetViewerNavBar.svelte';

vi.mock(import('$lib/managers/feature-flags-manager.svelte'), function () {
  return {
    featureFlagsManager: {
      init: vi.fn(),
      loadFeatureFlags: vi.fn(),
      value: { smartSearch: true, trash: true },
    } as never,
  };
});

describe('AssetViewerNavBar component', () => {
  const additionalProps = {
    preAction: () => {},
    onAction: () => {},
    onPlaySlideshow: () => {},
    onClose: () => {},
    playOriginalVideo: false,
    setPlayOriginalVideo: () => Promise.resolve(),
  };

  beforeAll(() => {
    Element.prototype.animate = vi.fn().mockImplementation(function () {
      return {
        cancel: () => {},
      };
    });
  });

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', getResizeObserverMock());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
  });

  afterEach(() => {
    authManager.reset();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('shows back button', () => {
    const preferences = preferencesFactory.build({ cast: { gCastEnabled: false } });
    authManager.setPreferences(preferences);

    const asset = assetFactory.build({ isTrashed: false });
    const { getByLabelText } = renderWithTooltips(AssetViewerNavBar, { asset, ...additionalProps });
    expect(getByLabelText('go_back')).toBeInTheDocument();
  });

  it('shows Playa Lens similar media action in the Immich asset viewer', () => {
    const preferences = preferencesFactory.build({ cast: { gCastEnabled: false } });
    authManager.setPreferences(preferences);

    const asset = assetFactory.build({ isTrashed: false });
    const { getByLabelText } = renderWithTooltips(AssetViewerNavBar, { asset, ...additionalProps });
    expect(getByLabelText('Find Playa Lens similar media')).toBeInTheDocument();
  });

  it('opens Playa Lens similar media through the shared helper', async () => {
    const open = vi.fn();
    vi.stubGlobal('__plSimilar', { open });
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));
    const asset = assetFactory.build({ isTrashed: false, originalFileName: 'dust.jpg' });
    const { getByLabelText } = renderWithTooltips(AssetViewerNavBar, { asset, ...additionalProps });

    await fireEvent.click(getByLabelText('Find Playa Lens similar media'));

    expect(open).toHaveBeenCalledWith(asset.id, { sourceTitle: 'dust.jpg' });
  });

  it('adds an asset through the shared social helper', async () => {
    const addOne = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      item: { id: 'inbox-item-id' },
      detail: '',
      networkError: false,
    });
    vi.stubGlobal('__plSocial', { addOne });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            preferred_action: 'add_to_inbox',
            preferred_label: 'Add to Media Inbox',
            preferred_href: '/social/inbox',
          },
          { status: 200 },
        ),
      ),
    );
    authManager.setPreferences(preferencesFactory.build({ cast: { gCastEnabled: false } }));
    const asset = assetFactory.build({ isTrashed: false });
    const { getByLabelText } = renderWithTooltips(AssetViewerNavBar, { asset, ...additionalProps });

    await fireEvent.click(getByLabelText('Add to Media Inbox'));

    await waitFor(() => expect(addOne).toHaveBeenCalledWith(asset.id));
  });

  describe('if the current user owns the asset', () => {
    it('shows delete button', () => {
      const ownerId = 'id-of-the-user';
      const user = userAdminFactory.build({ id: ownerId });
      const asset = assetFactory.build({ ownerId, isTrashed: false });
      authManager.setUser(user);

      const preferences = preferencesFactory.build({ cast: { gCastEnabled: false } });
      authManager.setPreferences(preferences);

      const { getByLabelText } = renderWithTooltips(AssetViewerNavBar, { asset, ...additionalProps });
      expect(getByLabelText('delete')).toBeInTheDocument();
    });
  });
});
