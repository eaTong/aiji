import { Table, Button, Space, Tag, Modal, Input } from 'antd'
import { useEffect, useState } from 'react'
import { knowledgeApi } from '../../api/knowledge'

interface Contribution {
  id: string
  type: string
  title: string | null
  content: string
  status: string
  user: { nickname: string | null }
  article: { title: string } | null
  createdAt: string
}

export default function Contributions() {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [reviewModal, setReviewModal] = useState<{ open: boolean; id: string }>({ open: false, id: '' })
  const [reviewNote, setReviewNote] = useState('')

  const fetchContributions = async () => {
    setLoading(true)
    try {
      const res = await knowledgeApi.getContributions({ page, pageSize, status: 'PENDING' })
      if (res.data.code === 0) {
        setContributions(res.data.data.contributions)
        setTotal(res.data.data.total)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContributions()
  }, [page, pageSize])

  const handleReview = async (approved: boolean) => {
    await knowledgeApi.reviewContribution(reviewModal.id, { approved, note: reviewNote })
    setReviewModal({ open: false, id: '' })
    setReviewNote('')
    fetchContributions()
  }

  const columns = [
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{v}</Tag> },
    { title: '标题', dataIndex: 'title', key: 'title', render: (v: string | null) => v || '-' },
    { title: '贡献者', key: 'user', render: (_: any, r: Contribution) => r.user?.nickname || '-' },
    { title: '关联文章', key: 'article', render: (_: any, r: Contribution) => r.article?.title || '-' },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: '操作', key: 'action', render: (_: any, r: Contribution) => (
      <Space>
        <Button size="small" type="link" onClick={() => Modal.info({ title: '内容', content: r.content })}>查看</Button>
        <Button size="small" type="link" onClick={() => setReviewModal({ open: true, id: r.id })}>审核</Button>
      </Space>
    )}
  ]

  return (
    <div>
      <h3>用户贡献审核</h3>
      <Table columns={columns} dataSource={contributions} rowKey="id" loading={loading}
        pagination={{ current: page, pageSize, total, onChange: (p, ps) => { setPage(p); setPageSize(ps) } }} />

      <Modal title="审核贡献" open={reviewModal.open} onCancel={() => setReviewModal({ open: false, id: '' })}
        onOk={() => handleReview(true)} okText="采纳" cancelText="拒绝"
        footer={[
          <Button key="reject" onClick={() => handleReview(false)}>拒绝</Button>,
          <Button key="approve" type="primary" onClick={() => handleReview(true)}>采纳</Button>
        ]}>
        <Input.TextArea rows={4} placeholder="审核意见" value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
      </Modal>
    </div>
  )
}
