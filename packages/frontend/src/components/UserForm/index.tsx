import { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import type { CreateUserRequest } from '@agent-first-stack/shared';
import { useCreateUser, useUpdateUser, useUser } from '../../hooks/useUsers';
import { useUsersUIStore } from '../../store/users.slice';

export function UserForm() {
  const [form] = Form.useForm<CreateUserRequest>();
  const { isFormOpen, isEditMode, selectedUserId, closeForm } = useUsersUIStore();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: existingUser } = useUser(selectedUserId || '');

  useEffect(() => {
    if (isEditMode && existingUser) {
      form.setFieldsValue({
        name: existingUser.name,
        email: existingUser.email,
      });
    } else {
      form.resetFields();
    }
  }, [isEditMode, existingUser, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (isEditMode && selectedUserId) {
        await updateUser.mutateAsync({ id: selectedUserId, data: values });
        message.success('User updated successfully');
      } else {
        await createUser.mutateAsync(values);
        message.success('User created successfully');
      }

      form.resetFields();
      closeForm();
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        message.error((err as { message: string }).message);
      }
    }
  };

  return (
    <Modal
      title={isEditMode ? 'Edit User' : 'Create User'}
      open={isFormOpen}
      onOk={handleSubmit}
      onCancel={() => {
        form.resetFields();
        closeForm();
      }}
      confirmLoading={createUser.isPending || updateUser.isPending}
      okText={isEditMode ? 'Update' : 'Create'}
      destroyOnClose
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, message: 'Please enter a name' },
            { max: 255, message: 'Name is too long' },
          ]}
        >
          <Input placeholder="Enter name" data-testid="user-name-input" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please enter an email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input placeholder="Enter email" data-testid="user-email-input" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
