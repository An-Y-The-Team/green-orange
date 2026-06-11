import * as migration_20260609_144218_initial_schema from './20260609_144218_initial_schema';
import * as migration_20260611_121801_site_settings_media_seo from './20260611_121801_site_settings_media_seo';

export const migrations = [
  {
    up: migration_20260609_144218_initial_schema.up,
    down: migration_20260609_144218_initial_schema.down,
    name: '20260609_144218_initial_schema',
  },
  {
    up: migration_20260611_121801_site_settings_media_seo.up,
    down: migration_20260611_121801_site_settings_media_seo.down,
    name: '20260611_121801_site_settings_media_seo'
  },
];
