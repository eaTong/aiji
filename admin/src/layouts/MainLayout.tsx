import { Layout, Menu, Avatar, Dropdown } from 'antd'
import { useNavigate, Outlet } from 'react-router-dom'
import {
  DashboardOutlined,
  UserOutlined,
  TrophyOutlined,
  BookOutlined,
  PushpinOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '看板' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/exercises', icon: <TrophyOutlined />, label: '动作库' },
  { key: '/plans', icon: <BookOutlined />, label: '计划模板' },
  { key: '/knowledge', icon: <BookOutlined />, label: '知识库' },
  { key: '/push', icon: <PushpinOutlined />, label: '推送运营' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' }
]

export default function MainLayout() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const userMenu = {
    items: [{ key: 'logout', label: '退出登录' }],
    onClick: () => handleLogout()
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 'bold' }}>
          AI己 运营端
        </div>
        <Menu mode="inline" items={menuItems} onClick={({ key }) => navigate(key)} style={{ height: 'calc(100vh - 64px)' }} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 24 }}>
          <Dropdown menu={userMenu}>
            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
          </Dropdown>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
