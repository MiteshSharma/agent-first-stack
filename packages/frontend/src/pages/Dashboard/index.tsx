import { Card, Row, Col, Statistic, Tag, Descriptions, Spin, Alert } from 'antd';
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useHealth, useMetrics } from '../../hooks/useHealth';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { data: health, isLoading: healthLoading, error: healthError } = useHealth();
  const { data: metrics, isLoading: metricsLoading } = useMetrics();

  if (healthLoading || metricsLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (healthError) {
    return (
      <Alert
        type="error"
        message="Backend Unreachable"
        description="Could not connect to the API server. Please ensure the backend is running."
        showIcon
      />
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>System Dashboard</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Status"
              value={health?.status.toUpperCase() || 'Unknown'}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: health?.status === 'ok' ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Uptime"
              value={health ? Math.floor(health.uptime / 60) : 0}
              suffix="min"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Users"
              value={metrics?.database.users || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Response Time"
              value={health?.responseTime || 0}
              suffix="ms"
              prefix={<CloudServerOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className={styles.detailsRow}>
        <Col xs={24} lg={12}>
          <Card title="Service Health">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Database">
                <Tag color={health?.database === 'connected' ? 'green' : 'red'}>
                  {health?.database}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Redis">
                <Tag color={health?.redis === 'connected' ? 'green' : 'orange'}>
                  {health?.redis}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Memory (Heap)">
                {health?.memory.heapUsed} / {health?.memory.heapTotal} MB
              </Descriptions.Item>
              <Descriptions.Item label="Memory (RSS)">{health?.memory.rss} MB</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Cache Statistics">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Hits">{metrics?.cache.hits || 0}</Descriptions.Item>
              <Descriptions.Item label="Misses">{metrics?.cache.misses || 0}</Descriptions.Item>
              <Descriptions.Item label="Keys">{metrics?.cache.keys || 0}</Descriptions.Item>
              <Descriptions.Item label="Hit Rate">
                {metrics && metrics.cache.hits + metrics.cache.misses > 0
                  ? `${Math.round((metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses)) * 100)}%`
                  : 'N/A'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
