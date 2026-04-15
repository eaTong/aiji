import { Table, Button, Space, Tabs } from 'antd'
import { useEffect, useState } from 'react'
import api from '../../api/auth'

export default function Push() {
  const [activeTab, setActiveTab] = useState('tasks')

  const tabs = [
    { key: 'tasks', label: '定时任务' },
    { key: 'templates', label: '模板管理' },
    { key: 'records', label: '发送记录' }
  ]

  return (
    <div>
      <h2>推送运营</h2>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
      <div>{activeTab === 'tasks' && <TasksPanel />}</div>
      <div>{activeTab === 'templates' && <TemplatesPanel />}</div>
      <div>{activeTab === 'records' && <RecordsPanel />}</div>
    </div>
  )
}

function TasksPanel() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get('/push/tasks').then(res => {
      if (res.data.code === 0) setTasks(res.data.data.tasks)
    }).finally(() => setLoading(false))
  }, [])

  const columns = [
    { title: '卡片类型', dataIndex: 'cardType', key: 'cardType' },
    { title: '触发时间', dataIndex: 'triggerAt', key: 'triggerAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: '优先级', dataIndex: 'priority', key: 'priority' },
    { title: '状态', dataIndex: 'sentAt', key: 'sentAt', render: (v: string | null) => v ? '已发送' : '待发送' }
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary">新建任务</Button>
      </Space>
      <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} />
    </div>
  )
}

function TemplatesPanel() {
  return <div><h4>推送模板管理</h4><p>Coming soon...</p></div>
}

function RecordsPanel() {
  return <div><h4>发送记录</h4><p>Coming soon...</p></div>
}
