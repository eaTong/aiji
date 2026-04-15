import { Table, Input, Space, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { usersApi } from '../../api/users'

interface User {
  id: string
  openid: string
  nickname: string | null
  avatarUrl: string | null
  role: string
  hasCompletedOnboarding: boolean
  createdAt: string
  _count: { trainingLogs: number }
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await usersApi.getUsers({ page, pageSize, keyword })
      if (res.data.code === 0) {
        setUsers(res.data.data.users)
        setTotal(res.data.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, pageSize])

  const columns = [
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', render: (v: string | null) => v || '-' },
    { title: 'OpenID', dataIndex: 'openid', key: 'openid', ellipsis: true },
    { title: '角色', dataIndex: 'role', key: 'role', render: (v: string) => <Tag color={v === 'ADMIN' ? 'red' : 'blue'}>{v}</Tag> },
    { title: '训练次数', dataIndex: ['_count', 'trainingLogs'], key: 'trainingLogs' },
    { title: '注册时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() }
  ]

  return (
    <div>
      <h2>用户管理</h2>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索用户" onSearch={v => { setKeyword(v); setPage(1); fetchUsers() }} style={{ width: 200 }} />
      </Space>
      <Table
        columns={columns}
        dataSource={users}
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
