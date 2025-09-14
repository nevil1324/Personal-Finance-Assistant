import { useState } from 'react'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import Charts from './components/Charts'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token'))
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Typeface - Personal Finance</h1>
      <TransactionForm token={token} onAdded={(t)=>console.log('added',t)} />
      <Charts token={token} />
      <TransactionList token={token} />
    </div>
  )
}