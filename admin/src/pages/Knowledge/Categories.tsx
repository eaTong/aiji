import { Table, Button, Space, Tag } from 'antd'
import { useEffect, useState } from 'react'
import { knowledgeApi } from '../../api/knowledge'

interface Category {
  id: string
  name: string
  slug: string
  type: string
  order: number
  _count: { articles: number }
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await knowledgeApi.getCategories()
      if (res.data.code === 0) {
        setCategories(res.data.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const typeColor: Record<string, string> = {
    KNOWLEDGE: 'blue',
    FAQ: 'green',
    COURSE: 'purple'
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={typeColor[v]}>{v}</Tag> },
    { title: '排序', dataIndex: 'order', key: 'order' },
    { title: '文章数', key: 'count', render: (_: any, r: Category) => r._count.articles },
    { title: '操作', key: 'action', render: () => <Space><Button size="small">编辑</Button><Button size="small" danger>删除</Button></Space> }
  ]

  return (
    <div>
      <h3>分类管理</h3>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary">新建分类</Button>
      </Space>
      <Table columns={columns} dataSource={categories} rowKey="id" loading={loading} />
    </div>
  )
}
