import { Card, Form, Input, Button, message } from 'antd'

export default function Settings() {
  const [form] = Form.useForm()

  const handleFinish = async (values: any) => {
    console.log(values)
    message.success('设置已保存')
  }

  return (
    <div>
      <h2>系统设置</h2>
      <Card title="基础设置" style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item label="运营端用户名" name="username" initialValue="admin">
            <Input />
          </Form.Item>
          <Form.Item label="运营端密码" name="password">
            <Input.Password placeholder="留空则不修改" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">保存</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
