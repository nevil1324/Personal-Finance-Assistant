import { useState } from 'react'
import { postJSON } from '../api'

export default function TransactionForm({ onAdded, token }){
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('expense')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))

  async function submit(e){
    e.preventDefault()
    const payload = { amount: parseFloat(amount), category, type, date: new Date(date).toISOString(), description: '' }
    const res = await postJSON('/transactions', payload, token)
    onAdded && onAdded(res)
  }

  return (
    <form onSubmit={submit} className="p-4 bg-white rounded shadow">
      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
      <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" />
      <select value={type} onChange={e => setType(e.target.value)}>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  )
}