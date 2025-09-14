import { useEffect, useState } from 'react'
import { getJSON } from '../api'

export default function Charts({ token }){
  const [summary, setSummary] = useState(null)
  useEffect(()=>{ getJSON('/graphs/summary', token).then(setSummary) }, [])
  if(!summary) return <div>Loading summary...</div>
  return (
    <div>
      <h3>Totals</h3>
      <pre>{JSON.stringify(summary, null, 2)}</pre>
    </div>
  )
}