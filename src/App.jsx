import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ListView from './components/ListView.jsx'
import DetailView from './components/DetailView.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ListView />} />
        <Route path="/faq/:id" element={<DetailView />} />
        <Route path="*" element={<ListView />} />
      </Route>
    </Routes>
  )
}
