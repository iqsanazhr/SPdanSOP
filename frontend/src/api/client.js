const API_BASE_URL = 'http://localhost:3001/api';

export async function fetchTemplates() {
  const res = await fetch(`${API_BASE_URL}/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE_URL}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function fetchDocumentById(id) {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return res.json();
}

export async function createDocument(data) {
  const res = await fetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create document');
  return res.json();
}

export async function updateDocumentMetadata(id, data) {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update document metadata');
  return res.json();
}

export async function updateDocumentComponents(id, components) {
  const res = await fetch(`${API_BASE_URL}/documents/${id}/components`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ components }),
  });
  if (!res.ok) throw new Error('Failed to update components');
  return res.json();
}

export async function addDocumentComponent(id, data) {
  const res = await fetch(`${API_BASE_URL}/documents/${id}/components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add component');
  return res.json();
}

export async function deleteDocumentComponent(documentId, componentId) {
  const res = await fetch(`${API_BASE_URL}/documents/${documentId}/components/${componentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete component');
  return res.json();
}

export async function duplicateDocument(id) {
  const res = await fetch(`${API_BASE_URL}/documents/${id}/duplicate`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to duplicate document');
  return res.json();
}

export async function deleteDocument(id) {
  const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
}

export function getPdfExportUrl(id) {
  return `${API_BASE_URL}/export/documents/${id}/pdf`;
}

export function getDocxExportUrl(id) {
  return `${API_BASE_URL}/export/documents/${id}/docx`;
}

export async function downloadPdfDocument(doc) {
  const res = await fetch(`${API_BASE_URL}/export/documents/${doc.id}/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error('Failed to generate PDF');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(doc.title || 'Standar_Pelayanan').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadDocxDocument(doc) {
  const res = await fetch(`${API_BASE_URL}/export/documents/${doc.id}/docx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error('Failed to generate Word document');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(doc.title || 'Standar_Pelayanan').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
