import React,{useState} from 'react'
import axios from 'axios'
export default function Register({onRegister}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [msg,setMsg]=useState('')
  async function submit(e){
    e.preventDefault()
    try{
      await axios.post('http://localhost:8000/api/auth/register', {email, password})
      setMsg('Registered; please login')
      onRegister && onRegister()
    }catch(e){ setMsg('Registration failed') }
  }
  return <form onSubmit={submit} style={{maxWidth:400}}>
    <h3>Register</h3>
    <input placeholder='email' value={email} onChange={e=>setEmail(e.target.value)} /><br/>
    <input placeholder='password' type='password' value={password} onChange={e=>setPassword(e.target.value)} /><br/>
    <button type='submit'>Register</button>
    <div>{msg}</div>
  </form>
}
