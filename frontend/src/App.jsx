import React, {useState} from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Transactions from './components/Transactions'
import UploadReceipt from './components/UploadReceipt'
import Charts from './components/Charts'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('pfa_token'))
  if(!token) return <Auth setToken={setToken} />
  return (
    <div style={{padding:20}}>
      <h2>Personal Finance Assistant</h2>
      <button onClick={()=>{localStorage.removeItem('pfa_token'); setToken(null)}}>Logout</button>
      <UploadReceipt token={token} />
      <Charts token={token} />
      <Transactions token={token} />
    </div>
  )
}

function Auth({setToken}){
  const [mode, setMode] = useState('login')
  return (
    <div style={{padding:20}}>
      {mode==='login' ? <Login onLogin={t=>{localStorage.setItem('pfa_token', t); setToken(t)}} /> : <Register onRegister={()=>setMode('login')} />}
      <div style={{marginTop:10}}>
        <button onClick={()=>setMode(mode==='login'?'register':'login')}>Switch to {mode==='login'?'Register':'Login'}</button>
      </div>
    </div>
  )
}
