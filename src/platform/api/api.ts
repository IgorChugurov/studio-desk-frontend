import { loadPublicEnv } from '../../shared/config/public-env';
import { createApi, type Api } from './create-api';

let api: Api | undefined;

/** The one API client of the page (created on first use). */
export function getApi(): Api {
  api ??= createApi({ apiUrl: loadPublicEnv().apiUrl });
  return api;
}
