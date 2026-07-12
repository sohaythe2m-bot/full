/**
 * resource.js
 * The backend's OwnedResourceController gives skills, education,
 * experience, certificates and projects an IDENTICAL REST shape:
 *   GET /api/v1/{resource}        list mine
 *   POST /api/v1/{resource}       create
 *   PUT /api/v1/{resource}/{id}   update
 *   DELETE /api/v1/{resource}/{id} soft-delete
 *
 * Rather than hand-writing 5 nearly identical modules, we generate one
 * client per resource from this single factory.
 */
import { api } from './apiClient.js';

export function createResourceApi(path) {
  return {
    list: () => api.get(path, { auth: true }),
    create: (payload) => api.post(path, payload, { auth: true }),
    update: (id, payload) => api.put(`${path}/${id}`, payload, { auth: true }),
    remove: (id) => api.del(`${path}/${id}`, { auth: true }),
  };
}

export const skillsApi = createResourceApi('/skills');
export const educationApi = createResourceApi('/education');
export const experienceApi = createResourceApi('/experience');
export const certificatesApi = createResourceApi('/certificates');
export const projectsApi = createResourceApi('/projects');