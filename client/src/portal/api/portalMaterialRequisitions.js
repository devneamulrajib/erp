import portalApi from './portalAxios';

export async function getPortalMaterialRequisitions(params = {}) {
  const res = await portalApi.get('/material-requisitions', { params });
  return res.data;
}
export async function getPortalMaterialRequisition(id) {
  const res = await portalApi.get(`/material-requisitions/${id}`);
  return res.data;
}