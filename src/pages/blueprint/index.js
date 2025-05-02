'use strict'
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  LaptopOutlined,
  TeamOutlined,
  BarChartOutlined,
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, theme, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Content, Sider, Header } = Layout;

const navRoutes = [
  {
    key: '',
    label: (
      <span style={{ fontWeight: 'bold', fontSize: 18 }}>Ten Construction</span>
    ),
    type: 'group',
    icon: ''
  },
  {
    key: '/',
    icon: React.createElement(BarChartOutlined),
    label: 'Dashboard',
  },
  {
    key: '/project',
    icon: React.createElement(TeamOutlined),
    label: 'Projek',
  },
  {
    key: '/user',
    icon: React.createElement(UserOutlined),
    label: 'User',
  },
  {
    key: '/employment',
    icon: React.createElement(LaptopOutlined),
    label: 'Pekerjaan',
  }
]

const items2 = navRoutes.map((item, index) => {
  return {
    key: item.key,
    icon: item.icon,
    label: item.label,
  };
});

function BluePrint() {
  const [showSidebar, setShowSidebar] = useState(true);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = (e) => {
    if (e.key !== '') {
      navigate(e.key);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <div
        style={{
          width: showSidebar ? 200 : 0,
          transition: 'width 0.3s ease, opacity 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {showSidebar && (
          <Sider
            width={200}
            style={{
              background: colorBgContainer,
              transition: 'all 0.3s ease',
              height: '100vh',
              position: 'relative',
              left: 0,
            }}
          >
            
            <Menu
              theme='dark'
              mode="inline"
              defaultSelectedKeys={['1']}
              defaultOpenKeys={['sub1']}
              style={{ height: '100%', borderRight: 0 }}
              items={items2}
              onClick={handleMenuClick}
            />
          </Sider>
        )}
      </div>

      <Layout style={{ flex: 1, padding: '0 24px 24px' }}>
        <Header style={{ background: colorBgContainer, padding: '0 16px' }}>
          <Button
            type="text"
            onClick={toggleSidebar}
            icon={showSidebar ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
          />
        </Header>

        <Breadcrumb
          items={[{ title: 'Home' }, { title: 'List' }, { title: 'App' }]}
          style={{ margin: '16px 0' }}
        />

        <Content
          style={{
            padding: 24,
            margin: 0,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export default BluePrint;
