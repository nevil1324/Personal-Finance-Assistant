import React, {useState} from 'react'
import api from '../lib/api'
export default function Register({onRegister}){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [msg,setMsg]=useState('')
  async function submit(e){ e.preventDefault(); try{ await api.post('/auth/register',{email,password}); const r = await api.post('/auth/login',{email,password}); const token=r.data.access_token; api.setToken(token); localStorage.setItem('pfa_token',token); onRegister(token) }catch(err){ setMsg(err.response?.data?.detail||'Registration failed') } }
  return (<form onSubmit={submit}><h3>Create account</h3><div className='form-row'><input className='input' placeholder='you@example.com' value={email} onChange={e=>setEmail(e.target.value)} /></div><div className='form-row'><input className='input' type='password' placeholder='Choose a strong password' value={password} onChange={e=>setPassword(e.target.value)} /></div><div style={{display:'flex',gap:8}}><button className='btn' type='submit'>Create account</button><div className='small' style={{alignSelf:'center'}}>{msg}</div></div></form>)
}
