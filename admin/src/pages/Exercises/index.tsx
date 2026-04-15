import { Table, Input, Button, Space, Tag } from 'antd'
import { useEffect, useState } from 'react'
import api from '../../api/auth'

interface Exercise {
  id: string
  name: string
  nameEn: string | null
  category: string
  equipment: string
  isCustom: boolean
  createdAt: string
}

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')

  const fetchExercises = async () => {
    setLoading(true)
    try {
      const res = await api.get('/exercises', { params: { page, pageSize, keyword } })
      if (res.data.code === 0) {
        setExercises(res.data.data.exercises)
        setTotal(res.data.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExercises()
  }, [page, pageSize])

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '英文名', dataIndex: 'nameEn', key: 'nameEn', render: (v: string | null) => v || '-' },
    { title: '分类', dataIndex: 'category', key: 'category', render: (v: string) => <Tag>{v}</Tag> },
    { title: '器材', dataIndex: 'equipment', key: 'equipment', render: (v: string) => <Tag>{v}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() }
  ]

  return (
    <div>
      <h2>动作库</h2>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索动作" onSearch={v => { setKeyword(v); setPage(1); fetchExercises() }} style={{ width: 200 }} />
        <Button type="primary">新建动作</Button>
      </Space>
      <Table
        columns={columns}
        dataSource={exercises}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => { setPage(p); setPageSize(ps) }
        }}
      />
    </div>
  )
}
