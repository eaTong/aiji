import { Table, Input, Button, Space, Tag } from 'antd'
import { useEffect, useState } from 'react'
import api from '../../api/auth'

interface Plan {
  id: string
  name: string
  goal: string | null
  weeks: number
  status: string
  user: { nickname: string | null }
  _count: { planDays: number }
  createdAt: string
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const res = await api.get('/plans', { params: { page, pageSize, keyword } })
      if (res.data.code === 0) {
        setPlans(res.data.data.plans)
        setTotal(res.data.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [page, pageSize])

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '用户', dataIndex: ['user', 'nickname'], key: 'user', render: (v: string | null) => v || '-' },
    { title: '目标', dataIndex: 'goal', key: 'goal', render: (v: string | null) => v ? <Tag>{v}</Tag> : '-' },
    { title: '周数', dataIndex: 'weeks', key: 'weeks' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : 'gray'}>{v}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() }
  ]

  return (
    <div>
      <h2>训练计划模板</h2>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索计划" onSearch={v => { setKeyword(v); setPage(1); fetchPlans() }} style={{ width: 200 }} />
        <Button type="primary">新建计划</Button>
      </Space>
      <Table
        columns={columns}
        dataSource={plans}
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
