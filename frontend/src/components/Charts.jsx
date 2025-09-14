import React,{useEffect,useState} from 'react'
import axios from 'axios'
import { Bar, Pie, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement)

export default function Charts({token}){
  const [byCat,setByCat]=useState([])
  const [byDate,setByDate]=useState([])
  useEffect(()=>{ load() }, [])
  async function load(){
    const c = await axios.get('http://localhost:8000/api/aggregate/category?token='+token)
    setByCat(c.data)
    const d = await axios.get('http://localhost:8000/api/aggregate/date?token='+token)
    setByDate(d.data)
  }
  return <div style={{marginTop:20}}>
    <h4>Charts</h4>
    <div style={{width:600}}>
      {byCat.length>0 && <Pie data={{labels: byCat.map(x=>x.category||'unknown'), datasets:[{data: byCat.map(x=>x.total)}]}} />}
    </div>
    <div style={{width:800, marginTop:20}}>
      {byDate.length>0 && <Line data={{labels: byDate.map(x=>x.date), datasets:[{label:'amount', data: byDate.map(x=>x.total)}]}} />}
    </div>
  </div>
}
