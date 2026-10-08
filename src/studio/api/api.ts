import { loadPublicEnv } from '../../shared/config/public-env';
import { createApi, type Api } from './create-api';

let api: Api | undefined;

/** The one studio API client of the page. */
export function getApi(): Api {
  api ??= createApi({ apiUrl: loadPublicEnv().studioApiUrl });
  return api;
}
