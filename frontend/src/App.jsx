import React, {useState, useEffect} from 'react'
import Login from './components/Login'
import Register from './components/Register'
import Transactions from './components/Transactions'
import UploadReceipt from './components/UploadReceipt'
import Charts from './components/Charts'
import api from './lib/api'

export default function App(){
  const [token,setToken]=useState(localStorage.getItem('pfa_token'))
  const [view,setView]=useState('dashboard')
  const [categories,setCategories]=useState({income:[], expense:[]})

  // refresh trigger
  const [refreshCounter, setRefreshCounter] = useState(0)
  const triggerRefresh = () => setRefreshCounter(c => c + 1)

  if (token) {
    api.setToken(token)
  }

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res = await api.get('/categories')
        const inc = res.data.filter(c => c.type === 'income')
        const exp = res.data.filter(c => c.type === 'expense')
        setCategories({ income: inc, expense: exp })
      } catch (err) {
        console.error('Failed to load categories', err)
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('pfa_token')
          setToken(null)
        }
      }
    })()
  }, [token])

  async function loadCategories(){
    try{
      const res = await api.get('/categories')
      const inc = res.data.filter(c=>c.type==='income')
      const exp = res.data.filter(c=>c.type==='expense')
      setCategories({income: inc, expense: exp})
    }catch(e){ console.error(e) }
  }

  if(!token) return <Auth setToken={t=>{localStorage.setItem('pfa_token',t); setToken(t)}} />

  return (
    <div className='container'>
      <header className='header'>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div className='logo'>P</div>
          <div>
            <div style={{fontWeight:700}}>Personal Finance Assistant</div>
            <div className='small'>Track income & expenses</div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className='btn secondary' onClick={()=>setView('dashboard')}>Dashboard</button>
          <button className='btn secondary' onClick={()=>setView('transactions')}>Transactions</button>
          <button className='btn secondary' onClick={()=>setView('upload')}>Upload Receipt</button>
          <button className='btn' onClick={()=>{localStorage.removeItem('pfa_token'); setToken(null)}}>Logout</button>
        </div>
      </header>

      <main className='grid'>
        <section className='card'>
          {view==='dashboard' && <Charts categories={categories} refreshCounter={refreshCounter} />}
          {view==='transactions' && <Transactions categories={categories} refreshCounter={refreshCounter} />}
          {view==='upload' && <UploadReceipt categories={categories} onRefresh={triggerRefresh} />}
        </section>

        <aside className='card'>
          <h4>Quick Add</h4>
          <QuickAdd categories={categories} onAdded={loadCategories} onRefresh={triggerRefresh} />
        </aside>
      </main>
    </div>
  )
}

function Auth({setToken}){
  const [mode,setMode]=useState('register')
  return (
    <div className='auth-box'>
      <div className='card'>
        {mode==='login'
          ? <Login onLogin={t=>setToken(t)} />
          : <Register onRegister={t=>setToken(t)} />}
        <div style={{marginTop:10}}>
          <button className='btn secondary' onClick={()=>setMode(mode==='login'?'register':'login')}>
            {mode==='login'?'Create account':'Have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QuickAdd({categories, onAdded, onRefresh}){
  const catList = categories?.expense || []
  const [type,setType]=useState('expense')
  const [amount,setAmount]=useState('')
  const [category,setCategory]=useState(catList[0]?.name || 'Misc')
  const [note,setNote]=useState('')
  const [msg,setMsg]=useState('')

  useEffect(()=>{
    const list = type==='expense' ? (categories?.expense||[]) : (categories?.income||[])
    setCategory(list[0]?.name || '')
  }, [type, categories])

  async function submit(e){
    e.preventDefault()
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0) {
      setMsg('⚠️ Amount must be greater than zero')
      return
    }
    try{
      await api.post('/transactions',{type, amount: val, category, note})
      setMsg('Added ✓')
      setAmount(''); setNote('')
      onAdded && onAdded()
      onRefresh && onRefresh()
      setTimeout(()=>setMsg(''),2000)
    }catch(err){
      setMsg('Failed: '+(err.response?.data?.detail||err.message))
    }
  }

  return (
    <form onSubmit={submit}>
      <div className='form-row'>
        <label className='small'>Type</label>
        <select className='input' value={type} onChange={e=>setType(e.target.value)}>
          <option value='expense'>Expense</option>
          <option value='income'>Income</option>
        </select>
      </div>
      <div className='form-row'>
        <label className='small'>Amount *</label>
        <input className='input' value={amount} onChange={e=>setAmount(e.target.value)} />
      </div>
      <div className='form-row'>
        <label className='small'>Category</label>
        <select className='input' value={category} onChange={e=>setCategory(e.target.value)}>
          {(type==='expense'? (categories?.expense||[]): (categories?.income||[]))
            .map(c=>(<option key={c.id} value={c.name}>{(c.icon? c.icon + ' ': '') + c.name}</option>))}
        </select>
      </div>
      <div className='form-row'>
        <label className='small'>Note</label>
        <input className='input' value={note} onChange={e=>setNote(e.target.value)} />
      </div>
      <div style={{display:'flex',gap:8}}>
        <button className='btn' type='submit'>Add</button>
        <div className='small' style={{alignSelf:'center'}}>{msg}</div>
      </div>
    </form>
  )
}
