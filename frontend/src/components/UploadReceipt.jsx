import React, {useState} from 'react'
import api from '../lib/api'

export default function UploadReceipt({categories, onRefresh}){
  const [file,setFile]=useState(null)
  const [resp,setResp]=useState(null)
  const [creating,setCreating]=useState(false)

  async function submit(e){
    e.preventDefault()
    if(!file){ setResp({error:'Select a file'}); return }
    const form = new FormData()
    form.append('file', file)
    try{
      const r = await api.post('/ocr', form, { headers: {'Content-Type':'multipart/form-data'} })
      setResp({text: r.data.text, parsed: r.data.parsed_transactions})
    }catch(e){
      setResp({error: e.response?.data?.detail || e.message})
    }
  }

  async function createParsed(p){
    setCreating(true)
    try{
      await api.post('/transactions', p)
      setResp(prev=>{
        const remaining = (prev.parsed||[]).filter(x=>x!==p)
        return {...prev, parsed: remaining}
      })
      onRefresh && onRefresh()
    }catch(e){
      alert('Create failed: '+(e.response?.data?.detail||e.message))
    }
    setCreating(false)
  }

  return (
    <div>
      <h4>Upload Receipt</h4>
      <form onSubmit={submit}>
        <input type='file' onChange={e=>setFile(e.target.files[0])} />
        <div style={{marginTop:8}}>
          <button className='btn' type='submit'>Upload</button>
        </div>
      </form>

      <div style={{marginTop:10}}>
        {resp && resp.error && <div className='notice error'>{resp.error}</div>}
        {resp && resp.text && (
          <div>
            <h5>OCR Text</h5>
            <pre style={{whiteSpace:'pre-wrap'}}>{resp.text}</pre>
          </div>
        )}
        {resp && resp.parsed && resp.parsed.length>0 && (
          <div>
            <h5>Parsed Transactions</h5>
            {resp.parsed.map((p,idx)=>(
              <div key={idx} style={{border:'1px solid #f1f5f9',padding:8,marginBottom:8,borderRadius:6}}>
                <div><strong>Amount:</strong> {p.amount}</div>
                <div><strong>Date:</strong> {p.date || 'N/A'}</div>
                <div style={{marginTop:6}}>
                  <label className='small'>Category</label>
                  <select className='input' defaultValue='receipt' onChange={(e)=>p.category=e.target.value}>
                    {(categories?.expense||[]).concat([{id:'receipt', name:'Receipt', icon:'📄'}])
                      .map(c=> (<option key={c.id} value={c.name}>{(c.icon? c.icon + ' ': '') + c.name}</option>))}
                  </select>
                </div>
                <div style={{marginTop:8}}>
                  <button
                    className='btn'
                    disabled={creating}
                    onClick={()=>createParsed({
                      type:'expense',
                      amount:p.amount,
                      category:p.category||'Receipt',
                      note:'Parsed from OCR',
                      date:p.date
                    })}
                  >
                    Create Transaction
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
