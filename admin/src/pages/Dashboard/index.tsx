import { Card, Row, Col, Statistic } from 'antd'
import { UserOutlined, TrophyOutlined, RiseOutlined, FireOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { statsApi } from '../../api/stats'

interface OverviewStats {
  totalUsers: number
  todayNewUsers: number
  totalTrainingLogs: number
  todayTrainingLogs: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: 0,
    todayNewUsers: 0,
    totalTrainingLogs: 0,
    todayTrainingLogs: 0
  })

  useEffect(() => {
    statsApi.getOverview()
      .then(res => {
        if (res.data.code === 0) setStats(res.data.data)
      })
      .catch(console.error)
  }, [])

  return (
    <div>
      <h2>数据看板</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日新增"
              value={stats.todayNewUsers}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总训练次数"
              value={stats.totalTrainingLogs}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日训练"
              value={stats.todayTrainingLogs}
              prefix={<FireOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
