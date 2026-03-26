import { Table, Button, Space, Popconfirm, Tag, Input } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UserResponse } from '@agent-first-stack/shared';
import { useUsers, useDeleteUser } from '../../hooks/useUsers';
import { useUsersUIStore } from '../../store/users.slice';
import styles from './UserTable.module.css';

export function UserTable() {
  const { searchQuery, currentPage, setSearchQuery, setCurrentPage, openCreateForm, openEditForm } =
    useUsersUIStore();

  const { data, isLoading } = useUsers({
    page: currentPage,
    limit: 20,
    search: searchQuery || undefined,
  });

  const deleteUser = useDeleteUser();

  const columns: ColumnsType<UserResponse> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="green">Active</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditForm(record.id)}
            data-testid={`edit-user-${record.id}`}
          />
          <Popconfirm
            title="Delete this user?"
            description="This action cannot be undone."
            onConfirm={() => deleteUser.mutate(record.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={deleteUser.isPending}
              data-testid={`delete-user-${record.id}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Input
          placeholder="Search users..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          allowClear
          data-testid="search-users"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateForm}
          data-testid="create-user-btn"
        >
          Add User
        </Button>
      </div>
      <Table<UserResponse>
        columns={columns}
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        pagination={{
          current: currentPage,
          total: data?.total,
          pageSize: 20,
          onChange: setCurrentPage,
          showTotal: (total) => `Total ${total} users`,
          showSizeChanger: false,
        }}
        data-testid="users-table"
      />
    </div>
  );
}
