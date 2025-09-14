import axios from 'axios'
const api = axios.create({ baseURL: 'http://localhost:8000/api' })
api.setToken = (token) => { api.defaults.headers.common['Authorization'] = 'Bearer ' + token }
export default api
