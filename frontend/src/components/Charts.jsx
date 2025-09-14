import React,{useEffect,useState} from 'react'
import api from '../lib/api'
import { Pie, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend)

export default function Charts(){
  const [byCat,setByCat]=useState([]); const [byDate,setByDate]=useState([]); const [txType,setTxType]=useState('expense'); const [range,setRange]=useState({start:'', end:''})
  useEffect(()=>{ load() }, [txType, range])
  async function load(){ try{ const params = {}; if(range.start) params.start = range.start; if(range.end) params.end = range.end; if(txType) params.tx_type = txType; const c = await api.get('/aggregate/category', { params }); setByCat(c.data || []); const d = await api.get('/aggregate/date', { params }); setByDate(d.data || []) }catch(e){ console.error(e) } }
  const pieLabels = byCat.map(b=>b.category||'unknown'); const pieData = byCat.map(b=>b.total||0)
  return (<div><div style={{display:'flex',gap:8,alignItems:'center'}}><label className='small'>Type</label><select className='input' value={txType} onChange={e=>setTxType(e.target.value)}><option value='expense'>Expense</option><option value='income'>Income</option></select><label className='small'>Start</label><input className='input' type='date' value={range.start} onChange={e=>setRange(r=>({...r,start:e.target.value}))} /><label className='small'>End</label><input className='input' type='date' value={range.end} onChange={e=>setRange(r=>({...r,end:e.target.value}))} /><button className='btn secondary' onClick={load}>Apply</button></div><h4>Spending by Category</h4>{byCat.length>0 ? <div style={{maxWidth:600}}><Pie data={{labels:pieLabels, datasets:[{data:pieData}]}} /></div> : <div className='small'>No data</div>}<h4 style={{marginTop:12}}>Amount over time</h4>{byDate.length>0 ? <div style={{maxWidth:800}}><Line data={{labels: byDate.map(x=>x.date), datasets:[{label:'amount', data: byDate.map(x=>x.total)}]}} /></div> : <div className='small'>No data</div>}</div>)
}
