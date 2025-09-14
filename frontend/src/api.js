const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function postJSON(path, body, token){
  const res = await fetch(API + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  })
  return res.json()
}

export async function getJSON(path, token){
  const res = await fetch(API + path, { headers: { ...(token? { Authorization: `Bearer ${token}` } : {}) }})
  return res.json()
}