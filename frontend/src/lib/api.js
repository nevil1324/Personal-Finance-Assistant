// src/lib/api.js
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000/api' })

api.setToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = 'Bearer ' + token
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// DEBUG: log outgoing requests so you can confirm Authorization header presence
api.interceptors.request.use(config => {
  console.log('[api] ->', config.method?.toUpperCase(), config.url, 'Authorization=', config.headers?.Authorization)
  return config
}, err => Promise.reject(err))

export default api
