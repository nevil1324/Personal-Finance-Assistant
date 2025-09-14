import React, {useState} from 'react'
import axios from 'axios'
export default function Login({onLogin}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState('')
  async function submit(e){
    e.preventDefault()
    try{
      const res = await axios.post('http://localhost:8000/api/auth/login', {email, password})
      const token = res.data.access_token
      onLogin(token)
    }catch(e){
      setErr('Login failed')
    }
  }
  return <form onSubmit={submit} style={{maxWidth:400}}>
    <h3>Login</h3>
    <input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /><br/>
    <input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)} /><br/>
    <button type='submit'>Login</button>
    <div style={{color:'red'}}>{err}</div>
  </form>
}
