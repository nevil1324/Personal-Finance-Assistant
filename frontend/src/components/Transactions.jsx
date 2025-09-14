import React, {useEffect, useState, useRef} from 'react'
import api from '../lib/api'

export default function Transactions({categories, refreshCounter}){
  const [items,setItems]=useState([])
  const [loading,setLoading]=useState(false)
  const [page,setPage]=useState(1)
  const [total,setTotal]=useState(0)
  const [pageSize,setPageSize]=useState(5)
  const [txType,setTxType]=useState('all')
  const [range,setRange]=useState({start:'', end:''})

  const loadRef = useRef(null)

  async function load(p=1){
    setLoading(true)
    try{
      const params = { page: p, page_size: pageSize }
      if(txType!=='all') params.tx_type = txType
      if(range.start) params.start = range.start
      if(range.end) params.end = range.end
      const res = await api.get('/transactions', { params })
      setItems(res.data.items||[])
      setTotal(res.data.total||0)
      setPage(res.data.page||p)
    }catch(e){ console.error('Failed to load transactions', e) }
    setLoading(false)
  }
  loadRef.current = load

  // initial & param-driven load
  useEffect(()=>{ load(1) }, [pageSize, txType])

  // reload when parent triggers a refresh
  useEffect(()=>{ if (loadRef.current) loadRef.current(1) }, [refreshCounter])

  function getIcon(catName){
    const all = [...(categories?.expense||[]), ...(categories?.income||[])]
    const f = all.find(c=>c.name===catName)
    return f?f.icon:''
  }

  return (
    <div>
      <div style={{display:'flex',gap:8,alignItems:'center', marginBottom:12}}>
        <label className='small'>Filter</label>
        <select className='input' value={txType} onChange={e=>setTxType(e.target.value)}>
          <option value='all'>All</option><option value='income'>Income</option><option value='expense'>Expense</option>
        </select>
        <label className='small'>Start</label>
        <input className='input' type='date' value={range.start} onChange={e=>setRange(r=>({...r,start:e.target.value}))} />
        <label className='small'>End</label>
        <input className='input' type='date' value={range.end} onChange={e=>setRange(r=>({...r,end:e.target.value}))} />
        <label className='small'>Page size</label>
        <select className='input' value={pageSize} onChange={e=>setPageSize(parseInt(e.target.value))}><option>5</option><option>10</option><option>20</option></select>
        <button className='btn secondary' onClick={()=>load(1)}>Apply</button>
      </div>

      <div className='card'>
        <h4 style={{marginTop:0}}>Transactions</h4>
        {loading ? <div className='small'>Loading...</div> : (
          <table className='table' style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr style={{textAlign:'left',background:'#f8fafc'}}><th style={{padding:8}}>Date</th><th>Type</th><th>Amount</th><th>Category</th><th>Note</th></tr></thead>
            <tbody>
              {items.map(it=> (
                <tr key={it.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:8}}>{it.date? new Date(it.date).toLocaleString():''}</td>
                  <td>{it.type}</td>
                  <td>{it.amount}</td>
                  <td>{getIcon(it.category)} {it.category}</td>
                  <td>{it.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
          <button className='btn' onClick={()=>{ if(page>1) load(page-1) }}>Prev</button>
          <div className='small'>Page {page} / {Math.max(1, Math.ceil(total/pageSize))}</div>
          <button className='btn' onClick={()=>{ if(page*pageSize < total) load(page+1) }}>Next</button>
        </div>
      </div>
    </div>
  )
}
