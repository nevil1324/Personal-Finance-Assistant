import React, {useState} from 'react'
import axios from 'axios'
export default function UploadReceipt({token}){
  const [file,setFile]=useState(null)
  const [res,setRes]=useState('')
  async function submit(e){
    e.preventDefault()
    if(!file) return
    const form = new FormData()
    form.append('file', file)
    try{
      const resp = await axios.post('http://localhost:8000/api/ocr?auto_create=true&token='+token, form, { headers: {'Content-Type':'multipart/form-data'} })
      setRes(JSON.stringify(resp.data, null, 2))
    }catch(e){
      setRes('failed')
    }
  }
  return <div style={{marginTop:20}}>
    <h4>Upload Receipt (will auto-create parsed transactions)</h4>
    <form onSubmit={submit}>
      <input type='file' onChange={e=>setFile(e.target.files[0])} /><br/>
      <button type='submit'>Upload</button>
    </form>
    <pre style={{whiteSpace:'pre-wrap'}}>{res}</pre>
  </div>
}
