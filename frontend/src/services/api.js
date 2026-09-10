import axios from 'axios';
const api=axios.create({baseURL:'/api',timeout:60000});
api.interceptors.response.use(r=>r.data,e=>Promise.reject(e.response?.data||{error:e.message}));
export const uploadApi={upload:(file,onUploadProgress)=>{const fd=new FormData();fd.append('file',file);return api.post('/upload',fd,{onUploadProgress,headers:{'Content-Type':'multipart/form-data'}})},config:()=>api.get('/upload/config'),createSandboxSample:(data)=>api.post('/upload/sandbox-sample',data),scanSandboxSample:(name)=>api.post('/upload/sandbox-scan',{name})};
export const scansApi={list:(params={})=>api.get('/scans',{params}),get:id=>api.get(`/scans/${id}`),delete:id=>api.delete(`/scans/${id}`),stats:()=>api.get('/scans/stats')};
export const threatsApi={list:()=>api.get('/threats'),get:type=>api.get(`/threats/${encodeURIComponent(type)}`)};
export default api;
