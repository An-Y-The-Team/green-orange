import * as migration_20260609_144218_initial_schema from './20260609_144218_initial_schema';
import * as migration_20260611_121801_site_settings_media_seo from './20260611_121801_site_settings_media_seo';
import * as migration_20260611_124647_drafts_versions_rbac from './20260611_124647_drafts_versions_rbac';
import * as migration_20260611_132520_switch_locale_to_vi from './20260611_132520_switch_locale_to_vi';
import * as migration_20260621_120213_branding_nav_footer from './20260621_120213_branding_nav_footer';

export const migrations = [
  {
    up: migration_20260609_144218_initial_schema.up,
    down: migration_20260609_144218_initial_schema.down,
    name: '20260609_144218_initial_schema',
  },
  {
    up: migration_20260611_121801_site_settings_media_seo.up,
    down: migration_20260611_121801_site_settings_media_seo.down,
    name: '20260611_121801_site_settings_media_seo',
  },
  {
    up: migration_20260611_124647_drafts_versions_rbac.up,
    down: migration_20260611_124647_drafts_versions_rbac.down,
    name: '20260611_124647_drafts_versions_rbac',
  },
  {
    up: migration_20260611_132520_switch_locale_to_vi.up,
    down: migration_20260611_132520_switch_locale_to_vi.down,
    name: '20260611_132520_switch_locale_to_vi',
  },
  {
    up: migration_20260621_120213_branding_nav_footer.up,
    down: migration_20260621_120213_branding_nav_footer.down,
    name: '20260621_120213_branding_nav_footer'
  },
];
