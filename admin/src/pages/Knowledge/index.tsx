import { Routes, Route, Navigate } from 'react-router-dom'
import ArticleList from './ArticleList'
import Categories from './Categories'
import Contributions from './Contributions'

export default function Knowledge() {
  return (
    <Routes>
      <Route index element={<Navigate to="articles" replace />} />
      <Route path="articles" element={<ArticleList />} />
      <Route path="categories" element={<Categories />} />
      <Route path="contributions" element={<Contributions />} />
    </Routes>
  )
}
