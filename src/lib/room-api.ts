export async function callRoomApi(code: string, action: string, body: Record<string, any> = {}) {
  const res = await fetch(`/api/rooms/${code}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

