import { Table, Input, Button, Space, Tag, Tabs } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { knowledgeApi } from '../../api/knowledge'

interface Article {
  id: string
  title: string
  slug: string
  type: string
  status: string
  viewCount: number
  likeCount: number
  isPinned: boolean
  category: { name: string }
  author: { nickname: string | null } | null
  publishedAt: string | null
  createdAt: string
}

export default function ArticleList() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<string>('')
  const [status] = useState<string>('')

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const res = await knowledgeApi.getArticles({ page, pageSize, keyword, type, status })
      if (res.data.code === 0) {
        setArticles(res.data.data.articles)
        setTotal(res.data.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [page, pageSize, type, status])

  const statusColor: Record<string, string> = {
    DRAFT: 'default',
    PENDING: 'orange',
    PUBLISHED: 'green',
    REJECTED: 'red'
  }

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title', render: (v: string, r: Article) => <a onClick={() => navigate(`/knowledge/articles/${r.id}`)}>{v}</a> },
    { title: '分类', dataIndex: ['category', 'name'], key: 'category' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: '浏览', dataIndex: 'viewCount', key: 'viewCount' },
    { title: '点赞', dataIndex: 'likeCount', key: 'likeCount' },
    { title: '发布时间', dataIndex: 'publishedAt', key: 'publishedAt', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '-' }
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search placeholder="搜索文章" onSearch={v => { setKeyword(v); setPage(1); fetchArticles() }} style={{ width: 200 }} />
        <Button type="primary" onClick={() => navigate('/knowledge/articles/new')}>新建文章</Button>
      </Space>
      <Tabs
        activeKey={type}
        onChange={t => { setType(t); setPage(1); fetchArticles() }}
        items={[
          { key: '', label: '全部' },
          { key: 'KNOWLEDGE', label: '健身百科' },
          { key: 'FAQ', label: '常见问题' },
          { key: 'COURSE', label: '课程内容' }
        ]}
        style={{ marginBottom: 16 }}
      />
      <Table
        columns={columns}
        dataSource={articles}
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
