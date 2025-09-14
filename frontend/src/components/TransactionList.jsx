import { useEffect, useState } from 'react'
import { getJSON } from '../api'

export default function TransactionList({ token }){
  const [txs, setTxs] = useState([])
  useEffect(()=>{ getJSON('/transactions', token).then(setTxs) }, [])
  return (
    <div>
      {txs.map(t => (
        <div key={t.id}>{t.date} - {t.category} - {t.amount}</div>
      ))}
    </div>
  )
}