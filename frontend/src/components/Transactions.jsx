import React, {useEffect, useState} from 'react'
import axios from 'axios'
export default function Transactions({token}){
  const [items,setItems]=useState([])
  useEffect(()=>{ load() }, [])
  async function load(){
    try{
      const res = await axios.get('http://localhost:8000/api/transactions?token='+token)
      setItems(res.data.items || [])
    }catch(e){ console.error(e) }
  }
  return <div style={{marginTop:20}}>
    <h4>Transactions</h4>
    <button onClick={load}>Reload</button>
    <table border='1' cellPadding='6' style={{marginTop:10}}>
      <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Note</th></tr></thead>
      <tbody>
        {items.map(it=>(<tr key={it.id}><td>{it.date}</td><td>{it.type}</td><td>{it.amount}</td><td>{it.category}</td><td>{it.note}</td></tr>))}
      </tbody>
    </table>
  </div>
}
